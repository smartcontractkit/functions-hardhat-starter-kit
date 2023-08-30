const { SecretsManager } = require("@chainlink/functions-toolkit")
const { networks } = require("../../networks")

task("functions-list-don-secrets", "fetches and displays secrets hosted on the DON").setAction(async (taskArgs) => {
  if (network.name === "hardhat") {
    throw Error("This command cannot be used on a local hardhat chain.")
  }

  const signer = await ethers.getSigner()
  const functionsRouterAddress = networks[network.name]["functionsRouter"]
  const donId = networks[network.name]["donId"]

  const gatewayUrls = networks[network.name]["gatewayUrls"]
  if (!gatewayUrls || gatewayUrls.length === 0) {
    throw Error(`No gatewayUrls found for ${network.name} network.`)
  }

  const secretsManager = new SecretsManager({
    signer,
    functionsRouterAddress,
    donId,
  })
  await secretsManager.initialize()

  const responses = await secretsManager.listDONHostedSecrets(gatewayUrls)
  console.log(`\nYour encrypted secrets currently hosted on DON ${donId}\n`, responses)
})
