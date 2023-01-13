const { getDecodedResultLog } = require("../../FunctionsRequestSimulator")
const { networkConfig } = require('../../network-config')

task("functions-build-offchain-secrets", "Builds an off-chain secrets object for one or many nodes that can be uploaded and referenced via URL")
  .setAction(async (taskArgs) => {
    if (network.name === "hardhat") {
      throw Error(
        'This command cannot be used on a local hardhat chain.'
      )
    }

    console.log(`Using public keys from FunctionsOracle contract  on network ${network.name}`)
    const OracleContract = await ethers.getContractFactory("FunctionsOracle")
    const oracleContract = await OracleContract.attach(networkConfig[network.name]['functionsOracle'])

    const requestConfig = require("../../Functions-request-config")

    const publicKeys = await oracleContract.getAllNodePublicKeys()
    
    console.log(
      `\nOn-chain response represented as a hex string: ${latestResponse}\n${getDecodedResultLog(
        requestConfig,
        latestResponse
      )}`
    )
  })
