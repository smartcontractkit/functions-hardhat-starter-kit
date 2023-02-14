const { VERIFICATION_BLOCK_CONFIRMATIONS, networkConfig } = require("../../network-config")

task("functions-set-ocr-config", "Sets the OCR config using values from a given JSON file")
  .addParam("configfile", "Generated JSON config file")
  .setAction(async (taskArgs) => {
    if (network.name === "hardhat") {
      throw Error("This command cannot be used on a local development chain.  Specify a valid network.")
    }

    let ocrConfig
    try {
      ocrConfig = require("../../" + taskArgs.configfile)
    } catch (error) {
      console.log(
        `No Oracle configuration file found. Generate and add ${taskArgs.configfile} to the root of this repository.`
      )
      throw new Error(error)
    }

    const oracleFactory = await ethers.getContractFactory("contracts/dev/functions/FunctionsOracle.sol:FunctionsOracle")
    const oracle = oracleFactory.attach(networkConfig[network.name]["functionsOracleProxy"])

    console.log(`Setting oracle OCR config for oracle ${networkConfig[network.name]["functionsOracleProxy"]}`)
    const setConfigTx = await oracle.setConfig(
      ocrConfig.signers,
      ocrConfig.transmitters,
      ocrConfig.f,
      ocrConfig.onchainConfig,
      ocrConfig.offchainConfigVersion,
      ocrConfig.offchainConfig
    )
    console.log(
      `Waiting ${VERIFICATION_BLOCK_CONFIRMATIONS} blocks for transaction ${setConfigTx.hash} to be confirmed...`
    )
    await setConfigTx.wait(VERIFICATION_BLOCK_CONFIRMATIONS)

    console.log(`\nOCR2Oracle config set for oracle ${oracle.address} on ${network.name}`)
  })
