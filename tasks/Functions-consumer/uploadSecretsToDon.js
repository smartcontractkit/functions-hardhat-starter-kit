const { SecretsManager } = require("@chainlink/functions-toolkit")
const { networks } = require("../../networks")
const process = require("process")
const path = require("path")

task("functions-upload-secrets-don", "Encrypts secrets and uploads them to the DON")
  .addParam(
    "slotid",
    "Storage slot number 0 or higher - if the slotid is already in use, the existing secrets for that slotid will be overwritten"
  )
  .addOptionalParam(
    "ttl",
    "Time to live - minutes until the secrets hosted on the DON expire (defaults to 10, and must be at least 5)",
    10,
    types.int
  )
  .addOptionalParam(
    "configpath",
    "Path to Functions request config file",
    `${__dirname}/../../Functions-request-config.js`,
    types.string
  )
  .setAction(async (taskArgs) => {
    const signer = await ethers.getSigner()
    const functionsRouterAddress = networks[network.name]["functionsRouter"]
    const donId = networks[network.name]["donId"]

    const gatewayUrls = networks[network.name]["gatewayUrls"]

    const slotId = parseInt(taskArgs.slotid)
    const minutesUntilExpiration = taskArgs.ttl

    const secretsManager = new SecretsManager({
      signer,
      functionsRouterAddress,
      donId,
    })
    await secretsManager.initialize()

    // Get the secrets object from  Functions-request-config.js or other specific request config.
    const requestConfig = require(path.isAbsolute(taskArgs.configpath)
      ? taskArgs.configpath
      : path.join(process.cwd(), taskArgs.configpath))

    if (!requestConfig.secrets || requestConfig.secrets.length === 0) {
      console.log("No secrets found in the request config.")
      return
    }

    console.log("Encrypting secrets and uploading to DON...")
    const encryptedSecretsObj = await secretsManager.encryptSecrets(requestConfig.secrets)

    const {
      version, // Secrets version number (corresponds to timestamp when encrypted secrets were uploaded to DON)
      success, // Boolean value indicating if encrypted secrets were successfully uploaded to all nodes connected to the gateway
    } = await secretsManager.uploadEncryptedSecretsToDON({
      encryptedSecretsHexstring: encryptedSecretsObj.encryptedSecrets,
      gatewayUrls,
      slotId,
      minutesUntilExpiration,
    })

    console.log(
      `\nYou can now use slotId ${slotId} and version ${version} to reference the encrypted secrets hosted on the DON.`
    )
  })
