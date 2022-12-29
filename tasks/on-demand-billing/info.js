const { getNetworkConfig } = require('../utils/utils')

task('on-demand-sub-info', 'Gets the On-Demand billing subscription balance, owner, and list of authorized consumer contract addresses')
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
    let subInfo
    try {
      subInfo = await registry.getSubscription(subscriptionId)
    } catch (error) {
      if (error.errorName === 'InvalidSubscription') {
        throw Error(`Subscription ID ${subscriptionId} is invalid or does not exist`)
      }
      throw error
    }

    console.log(`Subscription ${subscriptionId} owner: ${subInfo[1]}`)
    console.log(`Balance: ${ethers.utils.formatEther(subInfo[0])} LINK`)
    console.log(`${subInfo[2].length} authorized consumer contract${subInfo[2].length === 1 ? '' : 's'}:`)
    console.log(subInfo[2])
  })
