const { getDecodedResultLog } = require('../../onDemandRequestSimulator')

task('on-demand-read', 'Reads the latest response returned to a OnDemandConsumer client contract')
  .addParam('contract', 'Address of the client contract to read')
  .setAction(async (taskArgs) => {
    if (network.name === 'hardhat') {
      throw Error('This command cannot be used on a local hardhat chain.  Please specify a valid network or simulate an OnDemandConsumer request locally with "npx hardhat on-demand-simulate".')
    }

    console.log(`Reading data from On Demand API Consumer contract ${taskArgs.contract} on network network.name`)
    const clientContractFactory = await ethers.getContractFactory('OnDemandConsumer')
    const clientContract = await clientContractFactory.attach(taskArgs.contract)
    
    let latestResponse = await clientContract.latestResponse()

    const requestConfig = require('../../on-demand-request-config')
    console.log(
      `\nOn-chain response represented as a hex string: ${latestResponse}\n${getDecodedResultLog(
        requestConfig,
        latestResponse
      )}`
    )
  })
