const ethers = require("ethers")
const { SecretsManager } = require("@chainlink/functions-toolkit")

;(async () => {
  // Set the correct Functions router contract address and DON ID string for the desired network
  // (See https://docs.chain.link/chainlink-functions/supported-networks)
  const functionsRouterAddress = "0x6E2dc0F9DB014aE19888F539E59285D2Ea04244C"
  const donId = "fun-polygon-mumbai-1"

  // Enter your secrets here
  const secretsToEncryptAndUpload = {
    key: "value",
  }

  // Ensure the PRIVATE_KEY and RPC URL environment variables are set
  if (!process.env.PRIVATE_KEY) {
    throw Error("Please set the PRIVATE_KEY environment variable")
  }
  if (!process.env.RPC_URL) {
    throw Error("Please set the RPC_URL environment variable")
  }

  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL)
  const privateKey = process.env.PRIVATE_KEY
  const signer = new ethers.Wallet(privateKey, provider)

  const secretsManager = new SecretsManager({
    signer,
    functionsRouterAddress,
    donId,
  })
  await secretsManager.initialize()

  const { encryptedSecrets } = await secretsManager.encryptSecrets(secretsToEncryptAndUpload)
  const { version, success } = await secretsManager.uploadEncryptedSecretsToDON({
    encryptedSecretsHexstring: encryptedSecrets,
    gatewayUrls: [
      "https://01.functions-gateway.testnet.chain.link/",
      "https://02.functions-gateway.testnet.chain.link/",
    ],
    slotId: 1,
    minutesUntilExpiration: 60,
  })
  if (!success) {
    throw Error("Failed to upload secrets to DON")
  }
  const encryptedSecretsReference = secretsManager.buildDONHostedEncryptedSecretsReference({
    slotId: 1,
    version,
  })

  // Use this encryptedSecretsReference when sending the Functions request from your consumer contract
  console.log(`Success!\nencryptedSecretsReference: ${encryptedSecretsReference}`)
})()
