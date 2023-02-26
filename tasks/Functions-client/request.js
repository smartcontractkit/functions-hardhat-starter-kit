const { getDecodedResultLog, getRequestConfig } = require("../../FunctionsSandboxLibrary")
const { generateRequest } = require("./buildRequestJSON")
const { VERIFICATION_BLOCK_CONFIRMATIONS, networkConfig } = require("../../network-config")
const readline = require("readline-promise").default

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
    // Ensure the subscription has a sufficent balance
    const linkBalance = subInfo[0]
    if (subInfo[0].lt(estimatedCostJuels)) {
      throw Error(
        `Subscription ${subscriptionId} does not have sufficient funds. The estimated cost is ${estimatedCostJuels} Juels LINK, but has balance of ${linkBalance}`
      )
    }

    // Print the estimated cost of the request
    console.log(
      `\nIf all ${gasLimit} callback gas is used, this request is estimated to cost ${hre.ethers.utils.formatUnits(
        estimatedCostJuels,
        18
      )} LINK`
    )
    // Ask for confirmation before initiating the request on-chain
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })
    let cont = false
    const q2answer = await rl.questionAsync("Continue? (y) Yes / (n) No\n")
    rl.close()
    if (q2answer.toLowerCase() !== "y" && q2answer.toLowerCase() !== "yes") {
      process.exit(1)
    }

    // Use a promise to wait & listen for the fulfillment event before returning
    await new Promise(async (resolve, reject) => {
      let requestId

      // Initiate the listeners before making the request
      // Listen for fulfillment errors
      oracle.on("UserCallbackError", async (eventRequestId, msg) => {
        if (requestId == eventRequestId) {
          console.log("Error in client contract callback function")
          console.log(msg)
        }
      })
      oracle.on("UserCallbackRawError", async (eventRequestId, msg) => {
        if (requestId == eventRequestId) {
          console.log("Raw error in client contract callback function")
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

        console.log(`Request ${requestId} fulfilled!`)
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
          return resolve()
        }
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
            // Check for a successful request & log a mesage if the fulfillment was not successful
            console.log(`Transmission cost: ${hre.ethers.utils.formatUnits(eventTransmitterPayment, 18)} LINK`)
            console.log(`Base fee: ${hre.ethers.utils.formatUnits(eventSignerPayment, 18)} LINK`)
            console.log(`Total cost: ${hre.ethers.utils.formatUnits(eventTotalCost, 18)} LINK\n`)
            if (!eventSuccess) {
              console.log(
                "Error encountered when calling fulfillRequest in client contract.\n" +
                  "Ensure the fulfillRequest function in the client contract is correct and the --gaslimit is sufficient."
              )
              return resolve()
            }
            billingEndEventReceived = true
            if (ocrResponseEventReceived) {
              return resolve()
            }
          }
        }
      )
      // Initiate the on-chain request after all listeners are initialized
      console.log(`\nRequesting new data for FunctionsConsumer contract ${contractAddr} on network ${network.name}`)
      const requestTx = await clientContract.executeRequest(
        request.source,
        request.secrets ?? [],
        requestConfig.secretsLocation,
        request.args ?? [],
        subscriptionId,
        gasLimit,
        overrides
      )
      // If a response is not received within 5 minutes, the request has failed
      setTimeout(
        () =>
          reject(
            "A response not received within 5 minutes of the request being initiated and has been canceled. Your subscription was not charged. Please make a new request."
          ),
        300_000
      )
      console.log(
        `Waiting ${VERIFICATION_BLOCK_CONFIRMATIONS} blocks for transaction ${requestTx.hash} to be confirmed...`
      )

      const requestTxReceipt = await requestTx.wait(VERIFICATION_BLOCK_CONFIRMATIONS)
      requestId = requestTxReceipt.events[2].args.id
      console.log(`\nRequest ${requestId} initiated`)
      console.log(`Waiting for fulfillment...\n`)
    })
  })
