const { SecretsManager } = require("@chainlink/functions-toolkit")
const { networks } = require("../../networks")
const fs = require("fs")
const { generateOffchainSecrets } = require("../utils/generateOffchainSecrets")
const path = require("path")
const process = require("process")

task(
  "functions-build-offchain-secrets",
  "Builds an off-chain secrets object that can be uploaded and referenced via URL"
)
  .addOptionalParam("output", "Output JSON file name (defaults to offchain-secrets.json)")
  .setAction(async (taskArgs) => {
    if (network.name === "hardhat") {
      throw Error("This command cannot be used on a local hardhat chain.")
    }

    const signer = await ethers.getSigner()
    const functionsRouterAddress = networks[network.name]["functionsRouter"]
    const donId = networks[network.name]["donId"]

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

    console.log("\nEncrypting secrets and writing to JSON file...")
    const encryptedSecretsObj = await secretsManager.buildEncryptedSecrets(secrets)

    const outputfile = taskArgs.output ? taskArgs.output : "offchain-encyrpted-secrets.json"
    fs.writeFileSync(outputfile, JSON.stringify(encryptedSecretsObj))

    console.log(`\nWrote offchain secrets file to '${outputfile}'.`)
  })
