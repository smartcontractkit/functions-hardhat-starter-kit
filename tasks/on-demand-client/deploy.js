const { VERIFICATION_BLOCK_CONFIRMATIONS, networkConfig } = require('../../network-config')

task('on-demand-deploy-client', 'Deploys the OnDemandConsumer contract').setAction(async () => {
  if (network.name === 'hardhat') {
    throw Error('This command cannot be used on a local hardhat chain.  Specify a valid network or simulate an OnDemandConsumer request locally with "npx hardhat on-demand-simulate".')
  }

  console.log(`Deploying OnDemandConsumer contract to ${network.name}`)

  const oracleAddress = networkConfig[network.name]['ocr2drOracle']

  console.log('\n__Compiling Contracts__')
  await run('compile')

  const clientContractFactory = await ethers.getContractFactory('OnDemandConsumer')
  const clientContract = await clientContractFactory.deploy(oracleAddress)

  console.log(
    `\nWaiting ${VERIFICATION_BLOCK_CONFIRMATIONS} blocks for transaction ${clientContract.deployTransaction.hash} to be confirmed...`
  )
  await clientContract.deployTransaction.wait(VERIFICATION_BLOCK_CONFIRMATIONS)

  if (process.env.ETHERSCAN_API_KEY || process.env.POLYGONSCAN_API_KEY) {
    try {
      console.log('\nVerifying contract...')
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

  console.log(`\nOnDemandConsumer deployed to ${clientContract.address} on ${network.name}`)
})
