const { getNetworkConfig } = require('../utils/utils')
const { VERIFICATION_BLOCK_CONFIRMATIONS, developmentChains } = require('../../helper-hardhat-config')

task('on-demand-sub-accept', 'Accepts ownership of an On-Demand subscription after a a transfer is requested')
  .addParam('subid', 'Subscription ID')
  .setAction(async (taskArgs) => {
    if (developmentChains.includes(network.name)) {
      throw Error('This command cannot be used on a local development chain.  Please specify a valid network or simulate an OnDemandConsumer request locally with "npx hardhat on-demand-simulate".')
    }

    const networkConfig = getNetworkConfig(network.name)

    const subscriptionId = taskArgs.subid

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

    // Accept subscription ownership (only works if a tranfer has been requested by the previous owner)
    console.log(`Accepting ownership of subscription ${subscriptionId}`)
    const acceptTx = await registry.acceptSubscriptionOwnerTransfer(subscriptionId)

    const waitBlockConfirmations = developmentChains.includes(network.name) ? 1 : VERIFICATION_BLOCK_CONFIRMATIONS
    console.log(`Waiting ${waitBlockConfirmations} blocks for transaction ${acceptTx.hash} to be confirmed...`)
    await acceptTx.wait(waitBlockConfirmations)

    const signerAddr = (await ethers.getSigners())[0].address

    console.log(`Ownership of subscription ${subscriptionId} transferred to ${signerAddr}`)

    // Print information about the accepted subscription
    let postSubInfo = await registry.getSubscription(subscriptionId)

    console.log(`Subscription ${subscriptionId} owner: ${postSubInfo[1]}`)
    console.log(`Balance: ${ethers.utils.formatEther(postSubInfo[0])} LINK`)
    console.log(`Authorized consumer contracts: ${postSubInfo[2].length}`)
  })
