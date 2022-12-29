const { getNetworkConfig } = require('../utils/utils')
const { VERIFICATION_BLOCK_CONFIRMATIONS, developmentChains } = require('../../helper-hardhat-config')

task('on-demand-deploy-client', 'Deploys the OnDemandConsumer contract').setAction(async () => {
  if (developmentChains.includes(network.name)) {
    throw Error('This command cannot be used on a local development chain.  Please specify a valid network or simulate an OnDemandConsumer request locally with "npx hardhat on-demand-simulate".')
  }

  console.log(`Deploying OnDemandConsumer contract to ${network.name}`)
  const networkConfig = getNetworkConfig(network.name)
  const oracleAddress = networkConfig.ocr2drOracle

  const clientContractFactory = await ethers.getContractFactory('OnDemandConsumer')
  const clientContract = await clientContractFactory.deploy(oracleAddress)

  const waitBlockConfirmations = developmentChains.includes(network.name) ? 1 : VERIFICATION_BLOCK_CONFIRMATIONS
  console.log(
    `Waiting ${waitBlockConfirmations} blocks for transaction ${clientContract.deployTransaction.hash} to be confirmed...`
  )
  const deployTxResult = await clientContract.deployTransaction.wait(waitBlockConfirmations)
  console.log(`OnDemandConsumer deployed to ${clientContract.address} on ${network.name}`)

  if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    console.log('Verifying contract...')
    await run('verify:verify', {
      address: clientContract.address,
      constructorArguments: [oracleAddress],
    })
    console.log('Contract verified')
  }
})
