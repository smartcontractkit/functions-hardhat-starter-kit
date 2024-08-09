const {
  SubscriptionManager,
  SecretsManager,
  createGist,
  deleteGist,
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
    "Flag indicating if source JS should be run locally before making an on-chain request",
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
  .addOptionalParam("requestgaslimit", "Gas limit for calling the sendRequest function", 1_500_000, types.int)
  .addOptionalParam(
    "configpath",
    "Path to Functions request config file",
    `${__dirname}/../../Functions-request-config.js`,
    types.string
  )
  .setAction(async (taskArgs, hre) => {
    // Get the required parameters
    const contractAddr = taskArgs.contract
    const subscriptionId = parseInt(taskArgs.subid)
    const slotId = parseInt(taskArgs.slotid)
    const callbackGasLimit = parseInt(taskArgs.callbackgaslimit)

    // Attach to the FunctionsConsumer contract
    const consumerFactory = await ethers.getContractFactory("FunctionsConsumer")
    const consumerContract = consumerFactory.attach(contractAddr)

    // Get requestConfig from the specified config file
    const requestConfig = require(path.isAbsolute(taskArgs.configpath)
      ? taskArgs.configpath
      : path.join(process.cwd(), taskArgs.configpath))

    // Simulate the request
    if (taskArgs.simulate) {
      const { responseBytesHexstring, errorString } = await simulateScript(requestConfig)
      if (responseBytesHexstring) {
        console.log(
          `\nResponse returned by script during local simulation: ${decodeResult(
            responseBytesHexstring,
            requestConfig.expectedReturnType
          ).toString()}\n`
        )
      }
      if (errorString) {
        console.log(`\nError returned by simulated script:\n${errorString}\n`)
      }

      console.log("Local simulation of source code completed...")
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

    // Validate the consumer contract has been authorized to use the subscription
    const subInfo = await subManager.getSubscriptionInfo(subscriptionId)
    if (!subInfo.consumers.map((c) => c.toLowerCase()).includes(contractAddr.toLowerCase())) {
      throw Error(`Consumer contract ${contractAddr} has not been added to subscription ${subscriptionId}`)
    }

    // Estimate the cost of the request fulfillment
    const { gasPrice } = await hre.ethers.provider.getFeeData()
    const gasPriceWei = BigInt(Math.ceil(hre.ethers.utils.formatUnits(gasPrice, "wei").toString()))
    const estimatedCostJuels = await subManager.estimateFunctionsRequestCost({
      donId,
      subscriptionId,
      callbackGasLimit,
      gasPriceWei,
    })

    // Ensure that the subscription has a sufficient balance
    const estimatedCostLink = hre.ethers.utils.formatUnits(estimatedCostJuels, 18)
    const subBalanceLink = hre.ethers.utils.formatUnits(subInfo.balance, 18)
    if (subInfo.balance <= estimatedCostJuels) {
      throw Error(
        `Subscription ${subscriptionId} does not have sufficient funds. The estimated cost is ${estimatedCostLink} LINK, but the subscription only has ${subBalanceLink} LINK.`
      )
    }

    // Print the estimated cost of the Functions request in LINK & confirm before initiating the request on-chain
    await utils.prompt(
      `If the request's callback uses all ${utils.numberWithCommas(
        callbackGasLimit
      )} gas, this request will charge the subscription an estimated ${chalk.blue(estimatedCostLink + " LINK")}`
    )

    // Handle encrypted secrets
    let encryptedSecretsReference = []
    let gistUrl
    if (
      network.name !== "localFunctionsTestnet" &&
      requestConfig.secrets &&
      Object.keys(requestConfig.secrets).length > 0
    ) {
      const encryptedSecrets = await secretsManager.encryptSecrets(requestConfig.secrets)

      switch (requestConfig.secretsLocation) {
        case Location.Inline:
          throw Error("Inline encrypted secrets are not supported for requests.")

        case Location.Remote:
          if (!process.env["GITHUB_API_TOKEN"]) {
            throw Error("GITHUB_API_TOKEN environment variable is required to upload Remote encrypted secrets.")
          }
          gistUrl = await createGist(process.env["GITHUB_API_TOKEN"], JSON.stringify(encryptedSecrets))
          encryptedSecretsReference = await secretsManager.encryptSecretsUrls([gistUrl])
          break

        case Location.DONHosted:
          const { version } = await secretsManager.uploadEncryptedSecretsToDON({
            encryptedSecretsHexstring: encryptedSecrets.encryptedSecrets,
            gatewayUrls: networks[network.name]["gatewayUrls"],
            slotId,
            minutesUntilExpiration: 5,
          })
          encryptedSecretsReference = await secretsManager.buildDONHostedEncryptedSecretsReference({
            slotId,
            version,
          })
          break

        default:
          throw Error("Invalid secretsLocation in request config")
      }
    } else {
      requestConfig.secretsLocation = Location.Remote // Default to Remote if no secrets are used
    }

    // Instantiate response listener
    const responseListener = new ResponseListener({
      provider: hre.ethers.provider,
      functionsRouterAddress,
    })

    // Initiate the request
    const spinner = utils.spin()
    spinner.start(
      `Waiting for transaction for FunctionsConsumer contract ${contractAddr} on network ${network.name} to be confirmed...`
    )
    // Use manual gas limits for the request transaction since estimated gas limit is not always accurate,
    // and can vary significantly based on network.
    higherGasNetworks = ["optimismSepolia", "baseSepolia"] // L2s appear to need more request gas.
    const requestGasLimit = higherGasNetworks.includes(network.name) ? 1_750_000 : taskArgs.requestgaslimit
    const overrides = {
      gasLimit: requestGasLimit,
    }
    // If specified, use the gas price from the network config instead of Ethers estimated price
    if (networks[network.name].gasPrice) {
      overrides.gasPrice = networks[network.name].gasPrice
    }
    // If specified, use the nonce from the network config instead of automatically calculating it
    if (networks[network.name].nonce) {
      overrides.nonce = networks[network.name].nonce
    }
    const requestTx = await consumerContract.sendRequest(
      requestConfig.source,
      requestConfig.secretsLocation,
      encryptedSecretsReference,
      requestConfig.args ?? [],
      requestConfig.bytesArgs ?? [],
      subscriptionId,
      callbackGasLimit,
      overrides
    )
    const requestTxReceipt = await requestTx.wait(1)
    if (network.name !== "localFunctionsTestnet") {
      spinner.info(
        `Transaction confirmed, see ${
          utils.getEtherscanURL(network.config.chainId) + "tx/" + requestTx.hash
        } for more details.`
      )
    }

    // Listen for fulfillment
    spinner.start(
      `Functions request has been initiated in transaction ${requestTx.hash} with request ID ${requestTxReceipt.events[2].args.id}. Note the request ID may change if a re-org occurs, but the transaction hash will remain constant.\nWaiting for fulfillment from the Decentralized Oracle Network...\n`
    )

    try {
      // localFunctionsTestnet needs 0 or 1 confirmations to work correctly as it's local.
      // If on live testnet or mainnet, setting to undefined then uses the functions-toolkit default of 2 confirmations.
      const NUM_CONFIRMATIONS = network.name === "localFunctionsTestnet" ? 1 : undefined

      // Get response data
      const { requestId, totalCostInJuels, responseBytesHexstring, errorString, fulfillmentCode } =
        await responseListener.listenForResponseFromTransaction(requestTx.hash, undefined, NUM_CONFIRMATIONS, undefined)

      switch (fulfillmentCode) {
        case FulfillmentCode.FULFILLED:
          if (responseBytesHexstring !== "0x") {
            spinner.succeed(
              `Request ${requestId} fulfilled!\nResponse has been sent to consumer contract: ${decodeResult(
                responseBytesHexstring,
                requestConfig.expectedReturnType
              ).toString()}\n`
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
      spinner.fail("Request fulfillment was not received within 5 minute response period.")
      throw error
    } finally {
      // Clean up the gist if it was created
      if (gistUrl) {
        const successfulDeletion = await deleteGist(process.env["GITHUB_API_TOKEN"], gistUrl)
        if (!successfulDeletion) {
          console.log(`Failed to delete gist at ${gistUrl}. Please delete manually.`)
        }
      }
    }
  })
