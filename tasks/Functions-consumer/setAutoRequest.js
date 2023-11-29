const { buildRequestCBOR, SecretsManager, SubscriptionManager, Location } = require("@chainlink/functions-toolkit")

const { types } = require("hardhat/config")
const { networks } = require("../../networks")
const path = require("path")
const process = require("process")

task(
  "functions-set-auto-request",
  "sets the CBOR-encoded Functions request in a deployed AutomatedFunctionsConsumer contract"
)
  .addParam("contract", "Address of the consumer contract")
  .addParam("subid", "Billing subscription ID used to pay for Functions requests", undefined, types.int)
  .addOptionalParam(
    "slotid",
    "Storage slot number 0 or higher. If the slotid is already in use, the existing secrets for that slotid will be overwritten."
  )
  .addOptionalParam("interval", "Update interval in seconds for Automation to call performUpkeep", 300, types.int)
  .addOptionalParam(
    "ttl",
    "time to live - minutes until the secrets hosted on the DON expire. Defaults to 120m, and must be minimum 5m",
    120,
    types.int
  )
  .addOptionalParam(
    "gaslimit",
    "Maximum amount of gas that can be used to call fulfillRequest in the consumer contract",
    250000,
    types.int
  )
  .addOptionalParam(
    "simulate",
    "Flag indicating if simulation should be run before making an on-chain request",
    true,
    types.boolean
  )
  .addOptionalParam(
    "configpath",
    "Path to Functions request config file",
    `${__dirname}/../../Functions-request-config.js`,
    types.string
  )
  .setAction(async (taskArgs) => {
    await setAutoRequest(taskArgs.contract, taskArgs)
  })

const setAutoRequest = async (contract, taskArgs) => {
  const subscriptionId = taskArgs.subid
  const callbackGasLimit = taskArgs.gaslimit

  const functionsRouterAddress = networks[network.name]["functionsRouter"]
  const donId = networks[network.name]["donId"]
  const signer = await ethers.getSigner()
  const linkTokenAddress = networks[network.name]["linkToken"]

  // Initialize SubscriptionManager
  const subManager = new SubscriptionManager({ signer, linkTokenAddress, functionsRouterAddress })
  await subManager.initialize()

  // Validate callbackGasLimit
  const { gasPrice } = await hre.ethers.provider.getFeeData()
  const gasPriceWei = BigInt(Math.ceil(hre.ethers.utils.formatUnits(gasPrice, "wei").toString()))
  await subManager.estimateFunctionsRequestCost({
    donId,
    subscriptionId,
    callbackGasLimit,
    gasPriceWei,
  })

  // Check that consumer contract is added to subscription.
  const subInfo = await subManager.getSubscriptionInfo(subscriptionId)
  if (!subInfo.consumers.map((c) => c.toLowerCase()).includes(taskArgs.contract.toLowerCase())) {
    throw Error(`Consumer contract ${taskArgs.contract} has not been added to subscription ${subscriptionId}`)
  }

  const autoConsumerContractFactory = await ethers.getContractFactory("AutomatedFunctionsConsumer")
  const autoConsumerContract = await autoConsumerContractFactory.attach(contract)

  const requestConfig = require(path.isAbsolute(taskArgs.configpath)
    ? taskArgs.configpath
    : path.join(process.cwd(), taskArgs.configpath))

  let encryptedSecretsReference
  let secretsLocation
  if (!requestConfig.secrets || Object.keys(requestConfig.secrets).length === 0) {
    console.log("\nNo secrets found in request config - proceeding without secrets...")
  }

  // Encrypt and upload secrets if present.
  // if (
  //   network.name !== "localFunctionsTestnet" &&
  //   requestConfig.secrets &&
  //   Object.keys(requestConfig.secrets).length > 0
  // ) {
  //   if (requestConfig.secretsLocation !== Location.DONHosted) {
  //     throw Error(
  //       `\nThis task supports only DON-hosted secrets. The request config specifies ${
  //         Location[requestConfig.secretsLocation]
  //       }.`
  //     )
  //   }

  //   secretsLocation = requestConfig.secretsLocation

  //   console.log("\nEncrypting secrets and uploading to DON...")
  //   const secretsManager = new SecretsManager({
  //     signer,
  //     functionsRouterAddress,
  //     donId,
  //   })

  //   await secretsManager.initialize()
  //   const encryptedSecretsObj = await secretsManager.encryptSecrets(requestConfig.secrets)
  //   const minutesUntilExpiration = taskArgs.ttl
  //   const slotId = parseInt(taskArgs.slotid)

  //   if (isNaN(slotId)) {
  //     throw Error`\nSlotId missing. Please provide a slotId of 0 or higher, to upload encrypted secrets to the DON.`
  //   }

  //   const { version, success } = await secretsManager.uploadEncryptedSecretsToDON({
  //     encryptedSecretsHexstring: encryptedSecretsObj.encryptedSecrets,
  //     gatewayUrls: networks[network.name]["gatewayUrls"],
  //     slotId,
  //     minutesUntilExpiration,
  //   })

  //   if (!success) {
  //     throw Error("\nFailed to upload encrypted secrets to DON.")
  //   }

  //   console.log(`\nNow using DON-hosted secrets version ${version} in slot ${slotId}...`)
  //   encryptedSecretsReference = await secretsManager.buildDONHostedEncryptedSecretsReference({
  //     slotId,
  //     version,
  //   })
  // }

  const functionsRequestCBOR = buildRequestCBOR({
    codeLocation: requestConfig.codeLocation,
    codeLanguage: requestConfig.codeLanguage,
    source: requestConfig.source,
    args: requestConfig.args,
    secretsLocation: requestConfig.secretsLocation,
    encryptedSecretsReference:
      "0x1d76d2a3aa8bbbfc683646db8cf514500212ef4ea99a4a02f19b00f390f0d70287318baa729425c749be9b41f000ed7935e59a11101dd213249fa4d087cdd86cd9fcb6ec95929e5d8c922f86e490226589943c9f4279a20a5038d501be32034002dd740355b73dc0cfd4bc77eefa51dde00550254a0699361f885644c314fe9b257c4254fe3b8e79dbac0d1e1ae5d04bfe928f0b96b83c27c0f862ae59b38615f9",
  })

  console.log(`\nSetting the Functions request in AutomatedFunctionsConsumer contract ${contract} on ${network.name}`)
  const setRequestTx = await autoConsumerContract.setRequest(
    taskArgs.subid,
    taskArgs.gaslimit,
    taskArgs.interval,
    functionsRequestCBOR
  )

  console.log(
    `\nWaiting ${networks[network.name].confirmations} block for transaction ${setRequestTx.hash} to be confirmed...`
  )
  await setRequestTx.wait(networks[network.name].confirmations)
  console.log("\nSet request Tx confirmed")
}

exports.setAutoRequest = setAutoRequest
