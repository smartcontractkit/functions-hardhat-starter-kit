const { getNetworkConfig } = require('../utils/utils')
const { VERIFICATION_BLOCK_CONFIRMATIONS, developmentChains } = require('../../helper-hardhat-config')

task('on-demand-sub-remove-consumer', 'Removes a client contract from the On-Demand billing subscription')
  .addParam('subid', 'Subscription ID')
  .addParam('contract', 'Address of the client contract to remove from billing subscription')
  .setAction(async (taskArgs) => {
    if (developmentChains.includes(network.name)) {
      throw Error('This command cannot be used on a local development chain.  Please specify a valid network or simulate an OnDemandConsumer request locally with "npx hardhat on-demand-simulate".')
    }

    const networkConfig = getNetworkConfig(network.name)

    const subscriptionId = taskArgs.subid
    const consumer = taskArgs.contract

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

    // Check that the consumer is currently authorized before attempting to remove
    const existingConsumers = preSubInfo[2].map((addr) => addr.toLowerCase())
    if (!existingConsumers.includes(consumer.toLowerCase())) {
      throw Error(`Consumer address ${consumer} is not registered to use subscription ${subscriptionId}`)
    }

    console.log(`Removing consumer contract address ${consumer} to subscription ${subscriptionId}`)
    const rmTx = await registry.removeConsumer(subscriptionId, consumer)

    const waitBlockConfirmations = developmentChains.includes(network.name) ? 1 : VERIFICATION_BLOCK_CONFIRMATIONS
    console.log(`Waiting ${waitBlockConfirmations} blocks for transaction ${rmTx.hash} to be confirmed...`)
    await rmTx.wait(waitBlockConfirmations)
    console.log(`Removed consumer contract address ${consumer} from subscription ${subscriptionId}`)

    const postSubInfo = await registry.getSubscription(subscriptionId)
    console.log(
      `${postSubInfo[2].length} authorized consumer contract${
        postSubInfo[2].length === 1 ? '' : 's'
      } for subscription ${subscriptionId}:`
    )
    console.log(postSubInfo[2])
  })
