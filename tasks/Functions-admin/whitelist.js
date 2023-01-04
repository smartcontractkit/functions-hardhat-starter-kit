const { networkConfig, VERIFICATION_BLOCK_CONFIRMATIONS } = require('../../network-config')

task('functions-whitelist', 'Whitelists a wallet to be able to make functions requests')
  .addParam('wallet', 'The address of the wallet to whitelist for making Functions requests')
  .setAction(async (taskArgs) => {
    if (network.name === 'hardhat') {
      throw Error('This command cannot be used on a local development chain.  Specify a valid network.')
    }

    const walletAddr = taskArgs.wallet

    const oracle = await ethers.getContractAt('FunctionsOracle', networkConfig[network.name]['functionsOracle'])

    console.log(`Whitelisting sender wallet ${walletAddr} for FunctionsOracle ${networkConfig[network.name]['functionsOracle']}`)
    const whitelistTx = await oracle.addSender(walletAddr)
    console.log(`Waiting ${VERIFICATION_BLOCK_CONFIRMATIONS} blocks for transaction ${whitelistTx.hash} to be confirmed...`)
    await whitelistTx.wait(VERIFICATION_BLOCK_CONFIRMATIONS)

    console.log(`Sender wallet ${walletAddr} whitelisted for FunctionsOracle ${networkConfig[network.name]['functionsOracle']}`)
  })
