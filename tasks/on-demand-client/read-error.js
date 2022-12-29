const { developmentChains } = require('../../helper-hardhat-config')

task('on-demand-read-error', 'Calls an On Demand API Consumer Contract to read a reported error')
  .addParam('contract', 'The address of the On Demand On Demand API Consumer contract that you want to call')
  .setAction(async (taskArgs) => {
    if (developmentChains.includes(network.name)) {
      throw Error('This command cannot be used on a local development chain.  Please specify a valid network or simulate an OnDemandConsumer request locally with "npx hardhat on-demand-simulate".')
    }

    const contractAddr = taskArgs.contract
    const networkId = network.name

    console.log('Reading error data from On Demand API Consumer contract ', contractAddr, ' on network ', networkId)
    const clientContractFactory = await ethers.getContractFactory('OnDemandConsumer')
    const clientContract = await clientContractFactory.attach(contractAddr)

    let latestError = await clientContract.latestError()

    console.log(`💾 On-chain error message: ${Buffer.from(latestError.slice(2), 'hex').toString()}`)
  })

module.exports = {}
