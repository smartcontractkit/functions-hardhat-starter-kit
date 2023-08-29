const {
  SubscriptionManager,
  SecretsManager,
  createGist,
  simulateScript,
  decodeResult,
  ResponseListener,
  Location,
  FulfillmentCode,
} = require("@chainlink/functions-toolkit")
const { networks } = require("../../networks")
const utils = require("../utils")
const chalk = require("chalk")
const path = require("path")
const process = require("process")

task("functions-request", "Initiates an on-demand request from a Functions consumer contract")
  .addParam("contract", "Address of the consumer contract to call")
  .addParam("subid", "Billing subscription ID used to pay for the request")
  .addOptionalParam(
    "simulate",
    "Flag indicating if simulation should be run before making an on-chain request",
    true,
    types.boolean
  )
  .addOptionalParam(
    "callbackgaslimit",
    "Maximum amount of gas that can be used to call fulfillRequest in the consumer contract",
    100_000,
    types.int
  )
  .addOptionalParam(
    "slotid",
    "Slot ID to use for uploading DON hosted secrets. If the slot is already in use, the existing encrypted secrets will be overwritten.",
    0,
    types.int
  )
  .addOptionalParam("requestgaslimit", "Gas limit for calling the executeRequest function", 1_500_000, types.int)
  .addOptionalParam(
    "configpath",
    "Path to Functions request config file",
    `${__dirname}/../../Functions-request-config.js`,
    types.string
  )
  .setAction(async (taskArgs, hre) => {
    if (network.name === "hardhat") {
      throw Error(
        'This command cannot be used on a local development chain.  Specify a valid network or simulate an Functions request locally with "npx hardhat functions-simulate".'
      )
    }

    // Get the required parameters
    const contractAddr = taskArgs.contract
    const subscriptionId = Number(taskArgs.subid.toString())
    const slotId = Number(taskArgs.slotid.toString())
    const callbackGasLimit = Number(taskArgs.callbackgaslimit.toString())

    // Get requestConfig from the specified config file
    const requestConfig = require(path.isAbsolute(taskArgs.configpath)
      ? taskArgs.configpath
      : path.join(process.cwd(), taskArgs.configpath))
    if (typeof requestConfig.source !== "string" || requestConfig.source.length === 0) {
      throw Error("Request source code string is required")
    }

    // Simulate the request if the simulate flag is set
    if (taskArgs.simulate) {
      const { responseBytesHexstring, errorString, capturedTerminalOutput } = await simulateScript({
        source: requestConfig.source,
        args: requestConfig.args,
        bytesArgs: requestConfig.bytesArgs,
        secrets: requestConfig.secrets,
      })
      if (capturedTerminalOutput && capturedTerminalOutput.length > 0) {
        console.log(`\nLog messages from simulated script:\n${capturedTerminalOutput}\n`)
      }
      if (responseBytesHexstring) {
        console.log(
          `\nResponse returned by simulated script:\n${decodeResult(
            responseBytesHexstring,
            requestConfig.expectedReturnType
          )}\n`
        )
      }
      if (errorString) {
        console.log(`\nError returned by simulated script:\n${errorString}\n`)
      }
      await utils.prompt("Would you like to continue to make an on-chain request?")
    }

    // Initialize the subscription manager
    const signer = await ethers.getSigner()
    const linkTokenAddress = networks[network.name]["linkToken"]
    const functionsRouterAddress = networks[network.name]["functionsRouter"]
    const subManager = new SubscriptionManager({ signer, linkTokenAddress, functionsRouterAddress })
    await subManager.initialize()

    // Initialize the secrets manager
    const donId = networks[network.name]["donId"]
    const secretsManager = new SecretsManager({ signer, functionsRouterAddress, donId })
    await secretsManager.initialize()

    // Attach to the required contracts
    const consumerFactory = await ethers.getContractFactory("FunctionsConsumer")
    const consumerContract = consumerFactory.attach(contractAddr)

    // Get subscription info
    const subInfo = await subManager.getSubscriptionInfo(subscriptionId)

    // Validate the consumer contract has been authorized to use the subscription
    if (!subInfo.consumers.includes(contractAddr.toLowerCase())) {
      throw Error(`Consumer contract ${contractAddr} has not been added to subscription ${subscriptionId}`)
    }

    // Estimate the cost of the request
    const { gasPrice } = await hre.ethers.provider.getFeeData()
    const gasPriceGwei = hre.ethers.utils.formatUnits(gasPrice, "gwei")
    const estimatedCostJuels = await subManager.estimateFunctionsRequestCost({
      donId,
      subscriptionId,
      callbackGasLimit,
      gasPriceGwei,
    })

    // Ensure that the subscription has a sufficient balance
    const estimatedCostLink = hre.ethers.utils.formatUnits(estimatedCostJuels, 18)
    const subBalanceLink = hre.ethers.utils.formatUnits(subBalanceInJules, 18)
    if (subInfo.balance <= estimatedCostJuels) {
      throw Error(
        `Subscription ${subscriptionId} does not have sufficient funds. The estimated cost is ${estimatedCostLink} LINK, but the subscription only has ${subBalanceLink} LINK.`
      )
    }

    // Handle encrypted secrets
    let encryptedSecretsReference = []
    let gistUrl
    if (requestConfig.secrets && Object.keys(requestConfig.secrets).length > 0) {
      const encryptedSecrets = await secretsManager.buildEncryptedSecrets(requestConfig.secrets)
      switch (requestConfig.secretsLocation) {
        case Location.Inline:
          throw Error("Inline encrypted secrets are not supported for requests.")
        case Location.Remote:
          if (!process.env["GITHUB_API_TOKEN"]) {
            throw Error("GITHUB_API_TOKEN environment variable is required to upload Remote encrypted secrets.")
          }
          gistUrl = await createGist(process.env["GITHUB_API_TOKEN"], encryptedSecrets)
          encryptedSecretsReference = await secretsManager.encryptSecretsUrls([gistUrl])
          break
        case Location.DONHosted:
          const { version } = await secretsManager.uploadEncryptedSecretsToDON({
            encryptedSecretsHexstring: encryptedSecrets.encryptedSecrets,
            gatewayUrls: networks[network.name]["gatewayUrls"],
            storageSlotId: slotId,
            minutesUntilExpiration: 5,
          })
          encryptedSecretsReference = await secretsManager.constructDONHostedEncryptedSecretsReference({
            slotId,
            version,
          })
          break
        default:
          throw Error("Invalid secretsLocation in request config")
      }
    }

    // Estimate gas & confirm the gas cost for the request transaction
    const transactionGasEstimate = await consumerContract.estimateGas.sendRequest(
      requestConfig.source,
      requestConfig.secretsLocation ?? Location.Remote,
      encryptedSecretsReference,
      requestConfig.args ?? [],
      requestConfig.bytesArgs ?? [],
      subscriptionId,
      callbackGasLimit
    )
    await utils.promptTxCost(transactionGasEstimate, hre)

    // Print the estimated cost of the Functions request in LINK & confirm before initiating the request on-chain
    await utils.prompt(
      `If the request's callback uses all ${utils.numberWithCommas(
        gasLimit
      )} gas, this request will charge the subscription:\n${chalk.blue(estimatedCostLink + " LINK")}`
    )

    // Instantiate response listener
    const responseListener = new ResponseListener({
      provider: hre.ethers.provider,
      functionsRouterAddress,
    })

    // Initiate the request
    const spinner = utils.spin({
      text: `Submitting transaction for FunctionsConsumer contract ${contractAddr} on network ${network.name}`,
    })
    spinner.start("Waiting for transaction to be submitted...")
    const overrides = {
      gasLimit: taskArgs.requestgaslimit,
    }
    // If specified, use the gas price from the network config instead of Ethers estimated price
    if (networks[network.name].gasPrice) {
      overrides.gasPrice = networks[network.name].gasPrice
    }
    const requestTx = await consumerContract.sendRequest(
      requestConfig.source,
      requestConfig.secretsLocation ?? 1,
      encryptedSecretsReference,
      requestConfig.args ?? [],
      requestConfig.bytesArgs ?? [],
      subscriptionId,
      callbackGasLimit,
      overrides
    )
    spinner.info(
      `Transaction confirmed, see ${
        utils.getEtherscanURL(network.config.chainId) + "tx/" + requestTx.hash
      } for more details.`
    )
    const requestTxReceipt = await requestTx.wait(1)
    spinner.stopAndPersist()
    console.log(requestTxReceipt.events) // TODO: remove

    // Listen for fulfillment
    const requestId = requestTxReceipt.events[2].args.id
    spinner.start(
      `Request ${requestId} has been initiated. Waiting for fulfillment from the Decentralized Oracle Network...\n`
    )

    try {
      const { totalCostInJuels, responseBytesHexstring, errorString, fulfillmentCode } =
        await responseListener.listenForResponse(requestId)

      switch (fulfillmentCode) {
        case FulfillmentCode.FULFILLED:
          if (responseBytesHexstring !== "0x") {
            spinner.succeed(
              `Request ${requestId} fulfilled! Data has been written on-chain.\nResponse written to consumer contract:\n${decodeResult(
                responseBytesHexstring,
                requestConfig.expectedReturnType
              )}\n`
            )
          } else if (errorString.length > 0) {
            spinner.warn(`Request ${requestId} fulfilled with error: ${errorString}\n`)
          } else {
            spinner.succeed(`Request ${requestId} fulfilled with empty response data.\n`)
          }
          const linkCost = hre.ethers.utils.formatUnits(totalCostInJuels, 18)
          console.log(`Total request cost: ${chalk.blue(linkCost + " LINK")}`)
          break
        case FulfillmentCode.USER_CALLBACK_ERROR:
          spinner.fail(
            "Error encountered when calling consumer contract callback.\nEnsure the fulfillRequest function in FunctionsConsumer is correct and the --callbackgaslimit is sufficient."
          )
          break
        case FulfillmentCode.COST_EXCEEDS_COMMITMENT:
          spinner.fail(`Request ${requestId} failed due to a gas price spike when attempting to respond.`)
          break
        default:
          spinner.fail(
            `Request ${requestId} failed with fulfillment code: ${fulfillmentCode}. Please contact Chainlink support.`
          )
      }
    } catch (error) {
      spinner.fail(
        "Request fulfillment was not received within 5 minute response period. Please contact Chainlink support."
      )
      throw error
    } finally {
      // Clean up the gist if it was created
      if (gistUrl) {
        await deleteGist(process.env["GITHUB_API_TOKEN"], gistUrl)
      }
    }
  })
