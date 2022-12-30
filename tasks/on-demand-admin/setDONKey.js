const { VERIFICATION_BLOCK_CONFIRMATIONS, networkConfig } = require('../../network-config')

task('on-demand-set-don-key', 'Sets the DON public key in the On-Demand oracle contract')
  .setAction(async () => {
    if (network.name === 'hardhat') {
      throw Error('This command cannot be used on a local development chain.  Specify a valid network.')
    }

    const oracleFactory = await ethers.getContractFactory('OCR2DROracle')
    const oracle = oracleFactory.attach(networkConfig[network.name]['ocr2drOracle'])

    console.log(`Setting oracle OCR config for oracle ${networkConfig[network.name]['ocr2drOracle']}`)
    const setTx = await oracle.setDONPublicKey('0x' + networkConfig[network.name]['ocr2drPublicKey'])

    console.log(`Waiting ${VERIFICATION_BLOCK_CONFIRMATIONS} blocks for transaction ${setTx.hash} to be confirmed...`)
    await setTx.wait(VERIFICATION_BLOCK_CONFIRMATIONS)

    console.log(`\nOCR2Oracle config set for oracle ${oracle.address} on ${network.name}`)
  })
