const { VERIFICATION_BLOCK_CONFIRMATIONS, networkConfig } = require('../../network-config')

task('functions-set-ocr-config', 'Sets the OCR config using values from Functions-request.json')
  .setAction(async () => {
    if (network.name === 'hardhat') {
      throw Error('This command cannot be used on a local development chain.  Specify a valid network.')
    }

    const oracleFactory = await ethers.getContractFactory('FunctionsOracle')
    const oracle = oracleFactory.attach(networkConfig[network.name]['functionsOracle'])

    const ocrConfig = require('../../FunctionsOracleConfig.json')
    console.log(`Setting oracle OCR config for oracle ${networkConfig[network.name]['functionsOracle']}`)
    const setConfigTx = await oracle.setConfig(
      ocrConfig.signers,
      ocrConfig.transmitters,
      ocrConfig.f,
      ocrConfig.onchainConfig,
      ocrConfig.offchainConfigVersion,
      ocrConfig.offchainConfig
    )

    console.log(`Waiting ${VERIFICATION_BLOCK_CONFIRMATIONS} blocks for transaction ${setConfigTx.hash} to be confirmed...`)
    await setConfigTx.wait(VERIFICATION_BLOCK_CONFIRMATIONS)

    console.log(`\nOCR2Oracle config set for oracle ${oracle.address} on ${network.name}`)
  })
