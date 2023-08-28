const { SecretsManager } = require("@chainlink/functions-toolkit")
const { networks } = require("../../networks")
const process = require("process")

task("functions-upload-secrets-don", "encrypts secrets and uploads them to the DON")
  .addParam("slotid", "storage slot number 0 or higher. When reused will overwrite existing secret at that slotid.")
  .setAction(async (taskArgs) => {
    if (network.name === "hardhat") {
      throw Error("This command cannot be used on a local hardhat chain.")
    }

    const signer = await ethers.getSigner()
    const functionsRouterAddress = networks[network.name]["functionsRouter"]
    const donId = networks[network.name]["donId"]

    const gatewayUrls = networks[network.name]["gatewayUrls"]

    const storageSlotId = parseInt(taskArgs.slotid)
    const minutesUntilExpiration = 10

    const secretsManager = new SecretsManager({
      signer,
      functionsRouterAddress,
      donId,
    })
    await secretsManager.initialize()

    // TODO @dev use the env-enc package to encrypt secrets and write into a .env.enc file.
    const secrets = {
      // This secret is used in API-request-example.js
      // Get free API key from https://pro.coinmarketcap.com/
      apiKey: process.env.CMC_API_KEY,
    }

    console.log("Encrypting secrets and writing to JSON file...")
    const encryptedSecretsObj = await secretsManager.buildEncryptedSecrets(secrets)

    const {
      version, // Secrets version number (corresponds to timestamp when encrypted secrets were uploaded to DON)
      success, // Boolean value indicating if encrypted secrets were successfully uploaded to all nodes connected to the gateway
    } = await secretsManager.uploadSecretsToDON({
      encryptedSecretsHexstring: encryptedSecretsObj.encryptedSecrets,
      gatewayUrls,
      storageSlotId,
      minutesUntilExpiration,
    })

    console.log(
      `\nSuccess : ${success}.  You can now use version '${version}' and storageSlotId '${storageSlotId}' when sending your request to your Functions consumer contract.`
    )
  })
