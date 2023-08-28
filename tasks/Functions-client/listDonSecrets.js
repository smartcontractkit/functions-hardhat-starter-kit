const { SecretsManager } = require("@chainlink/functions-toolkit")
const { networks } = require("../../networks")

task("functions-list-don-secrets", "fetches and displays secrets hosted on the DON")
  .addParam("slotid", "storage slot number 0 or higher. When reused will overwrite existing secret at that slotid.")
  .setAction(async (taskArgs) => {
    if (network.name === "hardhat") {
      throw Error("This command cannot be used on a local hardhat chain.")
    }

    const signer = await ethers.getSigner()
    const functionsRouterAddress = networks[network.name]["functionsRouter"]
    const donId = networks[network.name]["donId"]

    const gatewayUrls = networks[network.name]["gatewayUrls"]

    if (!gatewayUrls || gatewayUrls.length === 0) {
    }
    const storageSlotId = parseInt(taskArgs.slotid)

    const secretsManager = new SecretsManager({
      signer,
      functionsRouterAddress,
      donId,
    })
    await secretsManager.initialize()

    const responses = await secretsManager.listDONHostedSecrets(gatewayUrls)
    console.log(`\nSecrets hosted on the DON at slotId ${storageSlotId}:\n`, responses)
  })
