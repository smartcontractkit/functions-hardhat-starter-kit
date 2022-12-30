task('on-demand-read-error', 'Calls an On Demand API Consumer Contract to read a reported error')
  .addParam('contract', 'The address of the On Demand On Demand API Consumer contract that you want to call')
  .setAction(async (taskArgs) => {
    if (network.name === 'hardhat') {
      throw Error('This command cannot be used on a local hardhat chain.  Please specify a valid network or simulate an OnDemandConsumer request locally with "npx hardhat on-demand-simulate".')
    }

    console.log(`Reading error data from On Demand API Consumer contract ${taskArgs.contract} on network network.name`)
    const clientContractFactory = await ethers.getContractFactory('OnDemandConsumer')
    const clientContract = await clientContractFactory.attach(taskArgs.contract)
    let latestError = await clientContract.latestError()

    console.log(`\nOn-chain error message: ${Buffer.from(latestError.slice(2), 'hex').toString()}`)
  })
