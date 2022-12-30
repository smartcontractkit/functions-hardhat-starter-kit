const { networkConfig } = require('../../network-config')

task('on-demand-sub-info', 'Gets the On-Demand billing subscription balance, owner, and list of authorized consumer contract addresses')
  .addParam('subid', 'Subscription ID')
  .setAction(async (taskArgs) => {
    if (network.name === 'hardhat') {
      throw Error('This command cannot be used on a local hardhat chain.  Specify a valid network.')
    }

    const subscriptionId = taskArgs.subid

    const RegistryFactory = await ethers.getContractFactory('OCR2DRRegistry')
    const registry = await RegistryFactory.attach(networkConfig[network.name]['ocr2drOracleRegistry'])

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

    console.log(`\nSubscription ${subscriptionId} owner: ${subInfo[1]}`)
    console.log(`Balance: ${ethers.utils.formatEther(subInfo[0])} LINK`)
    console.log(`${subInfo[2].length} authorized consumer contract${subInfo[2].length === 1 ? '' : 's'}:`)
    console.log(subInfo[2])
  })
