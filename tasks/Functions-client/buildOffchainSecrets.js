const { networkConfig } = require("../../network-config")
const fs = require("fs")
const { generateOffchainSecrets } = require("../utils/generateOffchainSecrets")

task(
  "functions-build-offchain-secrets",
  "Builds an off-chain secrets object that can be uploaded and referenced via URL"
)
  .addOptionalParam("output", "Output file name (defaults to offchain-secrets.json)")
  .setAction(async (taskArgs) => {
    if (network.name === "hardhat") {
      throw Error("This command cannot be used on a local hardhat chain.")
    }

    const requestConfig = require("../../Functions-request-config")

    console.log(
      `Using public keys from FunctionsOracle contract ${
        networkConfig[network.name]["functionsOracleProxy"]
      } on network ${network.name}`
    )
    const OracleFactory = await ethers.getContractFactory("contracts/dev/functions/FunctionsOracle.sol:FunctionsOracle")
    const oracleContract = await OracleFactory.attach(networkConfig[network.name]["functionsOracleProxy"])
    const [nodeAddresses, perNodePublicKeys] = await oracleContract.getAllNodePublicKeys()
    const DONPublicKey = await oracleContract.getDONPublicKey()

    const offchainSecrets = await generateOffchainSecrets(
      requestConfig,
      process.env.PRIVATE_KEY,
      DONPublicKey,
      nodeAddresses,
      perNodePublicKeys
    )

    fs.writeFileSync(taskArgs.output ?? "offchain-secrets.json", JSON.stringify(offchainSecrets))
    console.log(`\nWrote offchain secrets file to ${taskArgs.output ?? "offchain-secrets.json"}`)
  })
