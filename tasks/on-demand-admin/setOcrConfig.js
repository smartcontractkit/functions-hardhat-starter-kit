const { VERIFICATION_BLOCK_CONFIRMATIONS, networkConfig } = require('../../network-config')

task('on-demand-set-ocr-config', 'Sets the OCR config using values from on-demand-request.json')
  .setAction(async () => {
    if (network.name === 'hardhat') {
      throw Error('This command cannot be used on a local development chain.  Specify a valid network.')
    }

    const oracleFactory = await ethers.getContractFactory('OCR2DROracle')
    const oracle = oracleFactory.attach(networkConfig[network.name]['ocr2drOracle'])

    const ocrConfig = require('../../OCR2DROracleConfig.json')
    console.log(`Setting oracle OCR config for oracle ${networkConfig[network.name]['ocr2drOracle']}`)
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
