const { networkConfig, developmentChains, VERIFICATION_BLOCK_CONFIRMATIONS } = require('../../helper-hardhat-config')
const { getNetworkConfig } = require('../utils/utils')

task('on-demand-whitelist', 'Whitelists a wallet to be able to make on-demand requests')
  .addParam('wallet', 'The address of the wallet to whitelist for making On-Demand requests')
  .setAction(async (taskArgs) => {
    if (developmentChains.includes(network.name)) {
      throw Error('This command cannot be used on a local development chain.  Please specify a valid network or simulate an OnDemandConsumer request locally with "npx hardhat on-demand-simulate".')
    }

    const walletAddr = taskArgs.wallet
    const networkConfig = getNetworkConfig(network.name)

    const oracle = await ethers.getContractAt('OCR2DROracle', networkConfig['ocr2drOracle'])

    console.log(`Whitelisting sender wallet ${walletAddr} for OCR2DROracle ${networkConfig['ocr2drOracle']}`)
    const whitelistTx = await oracle.addSender(walletAddr)
    const waitBlockConfirmations = developmentChains.includes(network.name) ? 1 : VERIFICATION_BLOCK_CONFIRMATIONS
    console.log(`Waiting ${waitBlockConfirmations} blocks for transaction ${whitelistTx.hash} to be confirmed...`)
    await whitelistTx.wait(waitBlockConfirmations)

    console.log(`Sender wallet ${walletAddr} whitelisted for OCR2DROracle ${networkConfig['ocr2drOracle']}`)
  })
module.exports = {}
