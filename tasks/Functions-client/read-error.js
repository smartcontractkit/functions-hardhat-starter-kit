task('functions-read-error', 'Reads the latest error returned to a FunctionsConsumer client contract')
  .addParam('contract', 'Address of the client contract to read')
  .setAction(async (taskArgs) => {
    if (network.name === 'hardhat') {
      throw Error('This command cannot be used on a local hardhat chain.  Please specify a valid network or simulate an FunctionsConsumer request locally with "npx hardhat functions-simulate".')
    }

    console.log(`Reading error data from Functions client contract ${taskArgs.contract} on network network.name`)
    const clientContractFactory = await ethers.getContractFactory('FunctionsConsumer')
    const clientContract = await clientContractFactory.attach(taskArgs.contract)
    let latestError = await clientContract.latestError()

    console.log(`\nOn-chain error message: ${Buffer.from(latestError.slice(2), 'hex').toString()}`)
  })
