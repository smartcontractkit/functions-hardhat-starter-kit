const { getNetworkConfig } = require('../utils/utils')
const { VERIFICATION_BLOCK_CONFIRMATIONS, developmentChains } = require('../../helper-hardhat-config')

task('on-demand-sub-cancel', 'Cancels On-Demand billing subscription and refunds unused balance. Cancellation is only possible if there are no pending requests')
  .addParam('subid', 'Subscription ID')
  .addOptionalParam('refundaddress', "Address where the remaining subscription is sent (defaults to caller's address)")
  .setAction(async (taskArgs) => {
    if (developmentChains.includes(network.name)) {
      throw Error('This command cannot be used on a local development chain.  Please specify a valid network or simulate an OnDemandConsumer request locally with "npx hardhat on-demand-simulate".')
    }

    const networkConfig = getNetworkConfig(network.name)

    const subscriptionId = taskArgs.subid
    const refundAddress = taskArgs.refundAddress ?? (await ethers.getSigners())[0].address

    const RegistryFactory = await ethers.getContractFactory('OCR2DRRegistry')
    const registry = await RegistryFactory.attach(networkConfig['ocr2drOracleRegistry'])

    // Check that the subscription is valid
    let preSubInfo
    try {
      preSubInfo = await registry.getSubscription(subscriptionId)
    } catch (error) {
      if (error.errorName === 'InvalidSubscription') {
        throw Error(`Subscription ID "${subscriptionId}" is invalid or does not exist`)
      }
      throw error
    }

    // TODO: This script should check for any pending requests and return an error.
    // It should also time out any expired pending requests automatically.

    console.log(`Canceling subscription ${subscriptionId} and refunding remaining balance to ${refundAddress}`)
    const cancelTx = await registry.cancelSubscription(subscriptionId, refundAddress)

    const waitBlockConfirmations = developmentChains.includes(network.name) ? 1 : VERIFICATION_BLOCK_CONFIRMATIONS
    console.log(`Waiting ${waitBlockConfirmations} blocks for transaction ${cancelTx.hash} to be confirmed...`)
    await cancelTx.wait(waitBlockConfirmations)

    console.log(`Subscription ${subscriptionId} cancelled`)
  })
