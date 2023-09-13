const { SecretsManager } = require("@chainlink/functions-toolkit")
const { networks } = require("../../networks")
const fs = require("fs")
const path = require("path")
const process = require("process")

task(
  "functions-build-offchain-secrets",
  "Builds an off-chain secrets object that can be uploaded and referenced via URL"
)
  .addOptionalParam(
    "output",
    "Output JSON file name (defaults to offchain-encrypted-secrets.json)",
    "offchain-encrypted-secrets.json",
    types.string
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

    const outputfile = taskArgs.output
    console.log(`\nEncrypting secrets and writing to JSON file '${outputfile}'...`)

    const encryptedSecretsObj = await secretsManager.encryptSecrets(requestConfig.secrets)
    fs.writeFileSync(outputfile, JSON.stringify(encryptedSecretsObj))

    console.log(`\nWrote offchain secrets file to '${outputfile}'.`)
  })
