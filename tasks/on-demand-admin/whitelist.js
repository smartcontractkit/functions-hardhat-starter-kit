const { networkConfig, VERIFICATION_BLOCK_CONFIRMATIONS } = require('../../network-config')

task('on-demand-whitelist', 'Whitelists a wallet to be able to make on-demand requests')
  .addParam('wallet', 'The address of the wallet to whitelist for making On-Demand requests')
  .setAction(async (taskArgs) => {
    if (network.name === 'hardhat') {
      throw Error('This command cannot be used on a local development chain.  Specify a valid network.')
    }

    const walletAddr = taskArgs.wallet

    const oracle = await ethers.getContractAt('OCR2DROracle', networkConfig[network.name]['ocr2drOracle'])

    console.log(`Whitelisting sender wallet ${walletAddr} for OCR2DROracle ${networkConfig[network.name]['ocr2drOracle']}`)
    const whitelistTx = await oracle.addSender(walletAddr)
    console.log(`Waiting ${VERIFICATION_BLOCK_CONFIRMATIONS} blocks for transaction ${whitelistTx.hash} to be confirmed...`)
    await whitelistTx.wait(VERIFICATION_BLOCK_CONFIRMATIONS)

    console.log(`Sender wallet ${walletAddr} whitelisted for OCR2DROracle ${networkConfig[network.name]['ocr2drOracle']}`)
  })
