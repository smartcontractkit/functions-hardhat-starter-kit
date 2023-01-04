const { VERIFICATION_BLOCK_CONFIRMATIONS, networkConfig } = require('../../network-config')

task('functions-set-don-key', 'Sets the DON public key in the Functions oracle contract')
  .setAction(async () => {
    if (network.name === 'hardhat') {
      throw Error('This command cannot be used on a local development chain.  Specify a valid network.')
    }

    const oracleFactory = await ethers.getContractFactory('FunctionsOracle')
    const oracle = oracleFactory.attach(networkConfig[network.name]['functionsOracle'])

    console.log(`Setting oracle OCR config for oracle ${networkConfig[network.name]['functionsOracle']}`)
    const setTx = await oracle.setDONPublicKey('0x' + networkConfig[network.name]['functionsPublicKey'])

    console.log(`Waiting ${VERIFICATION_BLOCK_CONFIRMATIONS} blocks for transaction ${setTx.hash} to be confirmed...`)
    await setTx.wait(VERIFICATION_BLOCK_CONFIRMATIONS)

    console.log(`\nOCR2Oracle config set for oracle ${oracle.address} on ${network.name}`)
  })
