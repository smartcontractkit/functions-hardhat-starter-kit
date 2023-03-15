const { getDecodedResultLog, getRequestConfig } = require("../../FunctionsSandboxLibrary")
const { generateRequest } = require("./buildRequestJSON")
const { VERIFICATION_BLOCK_CONFIRMATIONS, networkConfig } = require("../../network-config")
const utils = require("../utils")
const chalk = require("chalk")

task("functions-request", "Initiates a request from a Functions client contract")
  .addParam("contract", "Address of the client contract to call")
  .addParam("subid", "Billing subscription ID used to pay for the request")
  .addOptionalParam(
    "simulate",
    "Flag indicating if simulation should be run before making an on-chain request",
    true,
    types.boolean
  )
  .addOptionalParam(
    "gaslimit",
    "Maximum amount of gas that can be used to call fulfillRequest in the client contract",
    100000,
    types.int
  )
  .addOptionalParam("requestgas", "Gas limit for calling the executeRequest function", 1_500_000, types.int)
  .setAction(async (taskArgs, hre) => {
    // A manual gas limit is required as the gas limit estimated by Ethers is not always accurate
    const overrides = {
      gasLimit: taskArgs.requestgas,
    }

    if (network.name === "hardhat") {
      throw Error(
        'This command cannot be used on a local development chain.  Specify a valid network or simulate an Functions request locally with "npx hardhat functions-simulate".'
      )
    }

    // Get the required parameters
    const contractAddr = taskArgs.contract
    const subscriptionId = taskArgs.subid
    const gasLimit = taskArgs.gaslimit
    if (gasLimit > 300000) {
      throw Error("Gas limit must be less than or equal to 300,000")
    }

    // Attach to the required contracts
    const clientContractFactory = await ethers.getContractFactory("FunctionsConsumer")
    const clientContract = clientContractFactory.attach(contractAddr)
    const OracleFactory = await ethers.getContractFactory("contracts/dev/functions/FunctionsOracle.sol:FunctionsOracle")
    const oracle = await OracleFactory.attach(networkConfig[network.name]["functionsOracleProxy"])
    const registryAddress = await oracle.getRegistry()
    const RegistryFactory = await ethers.getContractFactory(
      "contracts/dev/functions/FunctionsBillingRegistry.sol:FunctionsBillingRegistry"
    )
    const registry = await RegistryFactory.attach(registryAddress)

    const unvalidatedRequestConfig = require("../../Functions-request-config.js")
    const requestConfig = getRequestConfig(unvalidatedRequestConfig)

    const request = await generateRequest(requestConfig, taskArgs)

    // Check that the subscription is valid
    let subInfo
    try {
      subInfo = await registry.getSubscription(subscriptionId)
    } catch (error) {
      if (error.errorName === "InvalidSubscription") {
        throw Error(`Subscription ID "${subscriptionId}" is invalid or does not exist`)
      }
      throw error
    }
    // Validate the client contract has been authorized to use the subscription
    const existingConsumers = subInfo[2].map((addr) => addr.toLowerCase())
    if (!existingConsumers.includes(contractAddr.toLowerCase())) {
      throw Error(`Consumer contract ${contractAddr} is not registered to use subscription ${subscriptionId}`)
    }

    // Estimate the cost of the request
    const { lastBaseFeePerGas, maxPriorityFeePerGas } = await hre.ethers.provider.getFeeData()
    const estimatedCostJuels = await clientContract.estimateCost(
      [
        0, // Inline
        0, // Inline
        0, // JavaScript
        request.source,
        request.secrets ?? [],
        request.args ?? [],
      ],
      subscriptionId,
      gasLimit,
      maxPriorityFeePerGas.add(lastBaseFeePerGas)
    )
    const estimatedCostLink = hre.ethers.utils.formatUnits(estimatedCostJuels, 18)

    // Ensure that the subscription has a sufficient balance
    const subBalanceInJules = subInfo[0]
    const linkBalance = hre.ethers.utils.formatUnits(subBalanceInJules, 18)

    if (subBalanceInJules.lt(estimatedCostJuels)) {
      throw Error(
        `Subscription ${subscriptionId} does not have sufficient funds. The estimated cost is ${estimatedCostLink} LINK, but the subscription only has a balance of ${linkBalance} LINK`
      )
    }

    const transactionEstimateGas = await clientContract.estimateGas.executeRequest(
      request.source,
      request.secrets ?? [],
      requestConfig.secretsLocation,
      request.args ?? [],
      subscriptionId,
      gasLimit,
      overrides
    )

    await utils.promptTxCost(transactionEstimateGas, hre, true)

    // Print the estimated cost of the request
    // Ask for confirmation before initiating the request on-chain
    await utils.prompt(
      `If the request's callback uses all ${utils.numberWithCommas(
        gasLimit
      )} gas, this request will charge the subscription:\n${chalk.blue(estimatedCostLink + " LINK")}`
    )
    //  TODO: add cost of this LINK in USD

    console.log("\n")
    const spinner = utils.spin({
      text: `Submitting transaction for FunctionsConsumer contract ${contractAddr} on network ${network.name}`,
    })

    // Use a promise to wait & listen for the fulfillment event before returning
    await new Promise(async (resolve, reject) => {
      let requestId

      // Initiate the listeners before making the request
      // Listen for fulfillment errors
      oracle.on("UserCallbackError", async (eventRequestId, msg) => {
        if (requestId == eventRequestId) {
          spinner.error("Error in client contract callback function")
          console.log(msg)
        }
      })
      oracle.on("UserCallbackRawError", async (eventRequestId, msg) => {
        if (requestId == eventRequestId) {
          spinner.error("Raw error in client contract callback function")
          console.log(Buffer.from(msg, "hex").toString())
        }
      })
      // Listen for successful fulfillment
      let billingEndEventReceived = false
      let ocrResponseEventReceived = false
      clientContract.on("OCRResponse", async (eventRequestId, result, err) => {
        // Ensure the fulfilled requestId matches the initiated requestId to prevent logging a response for an unrelated requestId
        if (eventRequestId !== requestId) {
          return
        }

        spinner.succeed(`Request ${requestId} fulfilled! Data has been written on-chain.\n`)
        if (result !== "0x") {
          console.log(
            `Response returned to client contract represented as a hex string: ${result}\n${getDecodedResultLog(
              require("../../Functions-request-config"),
              result
            )}`
          )
        }
        if (err !== "0x") {
          console.log(`Error message returned to client contract: "${Buffer.from(err.slice(2), "hex")}"\n`)
        }
        ocrResponseEventReceived = true
        if (billingEndEventReceived) {
          spinner.stop()
          return resolve()
        }

        // Start spinner again if billing contract has emitted
        spinner.start()
      })
      // Listen for the BillingEnd event, log cost breakdown & resolve
      registry.on(
        "BillingEnd",
        async (
          eventRequestId,
          eventSubscriptionId,
          eventSignerPayment,
          eventTransmitterPayment,
          eventTotalCost,
          eventSuccess
        ) => {
          if (requestId == eventRequestId) {
            const baseFee = eventTotalCost.sub(eventTransmitterPayment)
            spinner.stop()
            console.log(`Actual amount billed to subscription #${subscriptionId}:`)
            const costBreakdownData = [
              {
                Type: "Transmission cost:",
                Amount: `${hre.ethers.utils.formatUnits(eventTransmitterPayment, 18)} LINK`,
              },
              { Type: "Base fee:", Amount: `${hre.ethers.utils.formatUnits(baseFee, 18)} LINK` },
              { Type: "", Amount: "" },
              { Type: "Total cost:", Amount: `${hre.ethers.utils.formatUnits(eventTotalCost, 18)} LINK` },
            ]
            utils.logger.table(costBreakdownData)

            // Check for a successful request & log a mesage if the fulfillment was not successful
            if (!eventSuccess) {
              spinner.error(
                "Error encountered when calling fulfillRequest in client contract.\n" +
                  "Ensure the fulfillRequest function in the client contract is correct and the --gaslimit is sufficient."
              )
              return resolve()
            }
            billingEndEventReceived = true
            if (ocrResponseEventReceived) {
              spinner.stop()
              return resolve()
            }
            // Start spinner again if client contract has not received a response
            spinner.start()
          }
        }
      )

      // Initiate the on-chain request after all listeners are initialized
      const requestTx = await clientContract.executeRequest(
        request.source,
        request.secrets ?? [],
        requestConfig.secretsLocation,
        request.args ?? [],
        subscriptionId,
        gasLimit,
        overrides
      )

      // If a response is not received in time, the request has exceeded the Service Level Agreement
      setTimeout(() => {
        spinner.error(
          "A response has not been received within 5 minutes of the request being initiated and has been canceled. Your subscription was not charged. Please make a new request."
        )
        reject()
      }, 300_000) // TODO: use registry timeout seconds

      spinner.text = `Waiting ${VERIFICATION_BLOCK_CONFIRMATIONS} blocks for transaction to be confirmed...`
      const requestTxReceipt = await requestTx.wait(VERIFICATION_BLOCK_CONFIRMATIONS)
      spinner.info(
        `Transaction confirmed, see ${
          utils.getEtherscanURL(network.config.chainId) + "tx/" + requestTx.hash
        } for more details.\n`
      )

      requestId = requestTxReceipt.events[2].args.id
      spinner.text = `Request ${requestId} has been initiated. Waiting for fulfillment from the Decentralized Oracle Network...`
      spinner.start()
    })
  })
