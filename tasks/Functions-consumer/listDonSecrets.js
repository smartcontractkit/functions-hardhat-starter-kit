const { SecretsManager } = require("@chainlink/functions-toolkit")
const { networks } = require("../../networks")

task("functions-list-don-secrets", "Displays encrypted secrets hosted on the DON").setAction(async (taskArgs) => {
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

  const { result } = await secretsManager.listDONHostedEncryptedSecrets(gatewayUrls)
  console.log(`\nYour encrypted secrets currently hosted on DON ${donId}`)
  console.log("\n\nGateway:", result.gatewayUrl)
  let i = 0
  result.nodeResponses.forEach((nodeResponse) => {
    console.log(`\nNode Response #${i}`)
    i++
    if (nodeResponse.rows) {
      nodeResponse.rows.forEach((row) => {
        console.log(row)
      })
    } else {
      console.log("No encrypted secrets found")
    }
  })
})
