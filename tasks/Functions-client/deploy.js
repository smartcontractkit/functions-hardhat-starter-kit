const { VERIFICATION_BLOCK_CONFIRMATIONS, networkConfig } = require('../../network-config')

task('functions-deploy-client', 'Deploys the FunctionsConsumer contract').setAction(async () => {
  if (network.name === 'hardhat') {
    throw Error('This command cannot be used on a local hardhat chain.  Specify a valid network or simulate an FunctionsConsumer request locally with "npx hardhat functions-simulate".')
  }

  console.log(`Deploying FunctionsConsumer contract to ${network.name}`)

  const oracleAddress = networkConfig[network.name]['functionsOracle']

  console.log('\n__Compiling Contracts__')
  await run('compile')

  const clientContractFactory = await ethers.getContractFactory('FunctionsConsumer')
  const clientContract = await clientContractFactory.deploy(oracleAddress)

  console.log(
    `\nWaiting ${VERIFICATION_BLOCK_CONFIRMATIONS} blocks for transaction ${clientContract.deployTransaction.hash} to be confirmed...`
  )
  await clientContract.deployTransaction.wait(VERIFICATION_BLOCK_CONFIRMATIONS)

  if (process.env.ETHERSCAN_API_KEY || process.env.POLYGONSCAN_API_KEY) {
    try {
      console.log('\nVerifying contract...')
      await clientContract.deployTransaction.wait(Math.max(6 - VERIFICATION_BLOCK_CONFIRMATIONS, 0))
      await run('verify:verify', {
        address: clientContract.address,
        constructorArguments: [oracleAddress],
      })
      console.log('Contract verified')
    } catch (error) {
      console.log('Error verifying contract.  Delete the ./build folder and try again.')
      console.log(error)
    }
  }

  console.log(`\nFunctionsConsumer contract deployed to ${clientContract.address} on ${network.name}`)
})
