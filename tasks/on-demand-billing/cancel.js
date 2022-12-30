const { VERIFICATION_BLOCK_CONFIRMATIONS, networkConfig } = require('../../network-config')

task('on-demand-sub-cancel', 'Cancels On-Demand billing subscription and refunds unused balance. Cancellation is only possible if there are no pending requests')
  .addParam('subid', 'Subscription ID to cancel')
  .addOptionalParam('refundaddress', "Address where the remaining subscription balance is sent (defaults to caller's address)")
  .setAction(async (taskArgs) => {
    if (developmentChains.includes(network.name)) {
      throw Error('This command cannot be used on a local development chain.  Specify a valid network.')
    }

    const subscriptionId = taskArgs.subid
    const refundAddress = taskArgs.refundAddress ?? (await ethers.getSigners())[0].address

    const RegistryFactory = await ethers.getContractFactory('OCR2DRRegistry')
    const registry = await RegistryFactory.attach(networkConfig[network.name]['ocr2drOracleRegistry'])

    // Check that the subscription is valid
    let preSubInfo
    try {
      preSubInfo = await registry.getSubscription(subscriptionId)
    } catch (error) {
      if (error.errorName === 'InvalidSubscription') {
        throw Error(`Subscription ID "${subscriptionId}" is invalid or does not exist`)
      }
      console.log('Cancellation failed. Ensure there are no pending requests or requests which must be timed out.')
      throw error
    }

    // Check that the requesting wallet is the owner of the subscription
    const accounts = await ethers.getSigners()
    const signer = accounts[0]
    if (preSubInfo[1] !== signer.address) {
      throw Error('The current wallet is not the owner of the subscription')
    }

    // TODO: This script should check for any pending requests and return an error.
    // It should also time out any expired pending requests automatically.

    console.log(`Canceling subscription ${subscriptionId}`)
    const cancelTx = await registry.cancelSubscription(subscriptionId, refundAddress)

    console.log(`Waiting ${VERIFICATION_BLOCK_CONFIRMATIONS} blocks for transaction ${cancelTx.hash} to be confirmed...`)
    await cancelTx.wait(VERIFICATION_BLOCK_CONFIRMATIONS)

    console.log(`\nSubscription ${subscriptionId} cancelled.\n${ethers.utils.formatEther(postSubInfo[0])} LINK refunded to ${refundAddress}`)
  })
