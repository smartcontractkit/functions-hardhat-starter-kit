const { buildRequestCBOR, SecretsManager } = require("@chainlink/functions-toolkit")

const { types } = require("hardhat/config")
const { networks } = require("../../networks")
const { getRequestConfig } = require("../../FunctionsSandboxLibrary")
const { generateRequest } = require("./buildRequestJSON")
const { RequestStore } = require("../utils/artifact")
const { deleteGist } = require("../utils/github")
const path = require("path")
const process = require("process")

task("functions-set-auto-request", "Updates the Functions request in a deployed AutomatedFunctionsConsumer contract")
  .addParam("contract", "Address of the client contract")
  .addParam("subid", "Billing subscription ID used to pay for Functions requests", undefined, types.int)
  .addOptionalParam("interval", "Update interval in seconds for Automation to call performUpkeep", 300, types.int) // TODO zubin read from contract instead?
  .addOptionalParam(
    "gaslimit",
    "Maximum amount of gas that can be used to call fulfillRequest in the client contract",
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
    if (network.name === "hardhat") {
      throw Error(
        'This command cannot be used on a local hardhat chain.  Specify a valid network or simulate an FunctionsConsumer request locally with "npx hardhat functions-simulate".'
      )
    }

    await setAutoRequest(taskArgs.contract, taskArgs)
  })

const setAutoRequest = async (contract, taskArgs) => {
  if (taskArgs.gaslimit > 300000) {
    throw Error("Gas limit must be less than or equal to 300,000")
  }

  console.log(`\nSetting the Functions request in AutomatedFunctionsConsumer contract ${contract} on ${network.name}`)

  const autoClientContractFactory = await ethers.getContractFactory("AutomatedFunctionsConsumer")
  const autoClientContract = await autoClientContractFactory.attach(contract)

  const unvalidatedRequestConfig = require(path.isAbsolute(taskArgs.configpath)
    ? taskArgs.configpath
    : path.join(process.cwd(), taskArgs.configpath))

  const requestConfig = getRequestConfig(unvalidatedRequestConfig)

  console.log("\nEncrypting secrets and uploading to DON...")
  const functionsRouterAddress = networks[network.name]["functionsRouter"]
  const donId = networks[network.name]["donId"]
  const signer = await ethers.getSigner()

  const secretsManager = new SecretsManager({
    signer,
    functionsRouterAddress,
    donId,
  })

  await secretsManager.initialize()
  const encryptedSecretsObj = await secretsManager.buildEncryptedSecrets(requestConfig.secrets)
  const slotId = 0
  const minutesUntilExpiration = 5 // Minimum 5 minutes supported.

  const { version, success } = await secretsManager.uploadEncryptedSecretsToDON({
    encryptedSecretsHexstring: encryptedSecretsObj.encryptedSecrets,
    gatewayUrls: networks[network.name]["gatewayUrls"],
    storageSlotId: slotId,
    minutesUntilExpiration,
  })

  if (!success) {
    throw Error("\nFailed tp upload encrypted secrets to DON.")
  }

  const encryptedSecretsReference = await secretsManager.constructDONHostedEncryptedSecretsReference({
    slotId,
    version,
  })

  const functionsRequestCBOR = buildRequestCBOR({
    codeLocation: requestConfig.codeLocation,
    codeLanguage: requestConfig.codeLanguage,
    source: requestConfig.source,
    args: requestConfig.args,
    secretsLocation: requestConfig.secretsLocation,
    encryptedSecretsReference,
  })

  console.log("\n\nrequestConfig >> \n\n", requestConfig) // TODO zubin cleanup
  console.log("\n\nfunctionsRequestCBOR >> \n\n", functionsRequestCBOR) // TODO zubin cleanup

  console.log("\nSetting Functions request...")
  const setRequestTx = await autoClientContract.setRequest(
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
