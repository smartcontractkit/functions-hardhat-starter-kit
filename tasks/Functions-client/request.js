const { getDecodedResultLog, getRequestConfig } = require("../../FunctionsSandboxLibrary")
const { generateRequest } = require("./buildRequestJSON")
const { networks } = require("../../networks")
const utils = require("../utils")
const chalk = require("chalk")
const { deleteGist } = require("../utils/github")
const { RequestStore } = require("../utils/artifact")
const path = require("path")
const process = require("process")

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
  .addOptionalParam(
    "configpath",
    "Path to Functions request config file",
    `${__dirname}/../../Functions-request-config.js`,
    types.string
  )
  .setAction(async (taskArgs, hre) => {
    // A manual gas limit is required as the gas limit estimated by Ethers is not always accurate
    const overrides = {
      gasLimit: taskArgs.requestgas,
      gasPrice: networks[network.name].gasPrice,
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
    const oracle = await OracleFactory.attach(networks[network.name]["functionsOracleProxy"])
    const registryAddress = await oracle.getRegistry()
    const RegistryFactory = await ethers.getContractFactory(
      "contracts/dev/functions/FunctionsBillingRegistry.sol:FunctionsBillingRegistry"
    )
    const registry = await RegistryFactory.attach(registryAddress)

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

    const unvalidatedRequestConfig = require(path.isAbsolute(taskArgs.configpath)
      ? taskArgs.configpath
      : path.join(process.cwd(), taskArgs.configpath))
    const requestConfig = getRequestConfig(unvalidatedRequestConfig)

    const simulatedSecretsURLBytes = `0x${Buffer.from(
      "https://exampleSecretsURL.com/f09fa0db8d1c8fab8861ec97b1d7fdf1/raw/d49bbd20dc562f035bdf8832399886baefa970c9/encrypted-functions-request-data-1679941580875.json"
    ).toString("hex")}`

    // Estimate the cost of the request
    const { lastBaseFeePerGas, maxPriorityFeePerGas } = await hre.ethers.provider.getFeeData()
    const estimatedCostJuels = await clientContract.estimateCost(
      [
        requestConfig.codeLocation,
        1, // SecretsLocation: Remote
        requestConfig.codeLanguage,
        requestConfig.source,
        requestConfig.secrets && Object.keys(requestConfig.secrets).length > 0 ? simulatedSecretsURLBytes : [],
        requestConfig.args ?? [],
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
      requestConfig.source,
      requestConfig.secrets && Object.keys(requestConfig.secrets).length > 0 ? simulatedSecretsURLBytes : [],
      requestConfig.args ?? [],
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

    // doGistCleanup indicates if an encrypted secrets Gist was created automatically and should be cleaned up once the request is complete
    let doGistCleanup = !(requestConfig.secretsURLs && requestConfig.secretsURLs.length > 0)
    const request = await generateRequest(requestConfig, taskArgs)
    doGistCleanup = doGistCleanup && request.secrets

    const store = new RequestStore(hre.network.config.chainId, network.name, "consumer")

    const spinner = utils.spin({
      text: `Submitting transaction for FunctionsConsumer contract ${contractAddr} on network ${network.name}`,
    })

    // Use a promise to wait & listen for the fulfillment event before returning
    await new Promise(async (resolve, reject) => {
      let requestId

      let cleanupInProgress = false
      const cleanup = async () => {
        spinner.stop()
        if (doGistCleanup) {
          if (!cleanupInProgress) {
            cleanupInProgress = true
            const success = await deleteGist(process.env["GITHUB_API_TOKEN"], request.secretsURLs[0].slice(0, -4))
            if (success) {
              await store.update(requestId, { activeManagedSecretsURLs: false })
            }
            return resolve()
          }
          return
        }
        return resolve()
      }

      // Initiate the listeners before making the request
      // Listen for fulfillment errors
      oracle.on("UserCallbackError", async (eventRequestId, msg) => {
        if (requestId == eventRequestId) {
          spinner.fail(
            "Error encountered when calling fulfillRequest in client contract.\n" +
              "Ensure the fulfillRequest function in the client contract is correct and the --gaslimit is sufficient."
          )
          console.log(`${msg}\n`)
          await store.update(requestId, { status: "failed", error: msg })
          await cleanup()
        }
      })
      oracle.on("UserCallbackRawError", async (eventRequestId, msg) => {
        if (requestId == eventRequestId) {
          spinner.fail("Raw error in contract request fulfillment. Please contact Chainlink support.")
          console.log(Buffer.from(msg, "hex").toString())
          await store.update(requestId, { status: "failed", error: msg })
          await cleanup()
        }
      })
      // Listen for successful fulfillment, both must be true to be finished
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
              requestConfig,
              result
            )}`
          )
        }
        if (err !== "0x") {
          console.log(`Error message returned to client contract: "${Buffer.from(err.slice(2), "hex")}"\n`)
        }
        ocrResponseEventReceived = true
        await store.update(requestId, { status: "complete", result })

        if (billingEndEventReceived) {
          await cleanup()
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

            // Check for a successful request
            billingEndEventReceived = true
            if (ocrResponseEventReceived) {
              await cleanup()
            }
          }
        }
      )

      let requestTx
      try {
        // Initiate the on-chain request after all listeners are initialized
        requestTx = await clientContract.executeRequest(
          request.source,
          request.secrets ?? [],
          request.args ?? [],
          subscriptionId,
          gasLimit,
          overrides
        )
      } catch (error) {
        // If the request fails, ensure the encrypted secrets Gist is deleted
        if (doGistCleanup) {
          await deleteGist(process.env["GITHUB_API_TOKEN"], request.secretsURLs[0].slice(0, -4))
        }
        throw error
      }
      spinner.start("Waiting 2 blocks for transaction to be confirmed...")
      const requestTxReceipt = await requestTx.wait(2)
      spinner.info(
        `Transaction confirmed, see ${
          utils.getEtherscanURL(network.config.chainId) + "tx/" + requestTx.hash
        } for more details.`
      )
      spinner.stop()
      requestId = requestTxReceipt.events[2].args.id
      spinner.start(
        `Request ${requestId} has been initiated. Waiting for fulfillment from the Decentralized Oracle Network...\n`
      )
      await store.create({
        type: "consumer",
        requestId,
        transactionReceipt: requestTxReceipt,
        taskArgs,
        codeLocation: requestConfig.codeLocation,
        codeLanguage: requestConfig.codeLanguage,
        source: requestConfig.source,
        secrets: requestConfig.secrets,
        perNodeSecrets: requestConfig.perNodeSecrets,
        secretsURLs: request.secretsURLs,
        activeManagedSecretsURLs: doGistCleanup,
        args: requestConfig.args,
        expectedReturnType: requestConfig.expectedReturnType,
        DONPublicKey: requestConfig.DONPublicKey,
      })
      // If a response is not received in time, the request has exceeded the Service Level Agreement
      setTimeout(async () => {
        spinner.fail(
          "A response has not been received within 5 minutes of the request being initiated and has been canceled. Your subscription was not charged. Please make a new request."
        )
        await store.update(requestId, { status: "pending_timed_out" })
        reject()
      }, 300_000) // TODO: use registry timeout seconds
    })
  })
