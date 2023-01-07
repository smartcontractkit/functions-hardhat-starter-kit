const { ethers, network, run } = require('hardhat')
const { VERIFICATION_BLOCK_CONFIRMATIONS, networkConfig } = require('../../network-config')
const LINK_TOKEN_ABI = require('@chainlink/contracts/abi/v0.4/LinkToken.json')

const { buildRequest, simulateRequest } = require('../../FunctionsRequestSimulator')

async function deployAutomatedApiConsumer(chainId = network.config.chainId) {
  console.log('Simulating Functions request locally...')

  const { success, resultLog } = await simulateRequest('../../Functions-request-config.js')

  console.log(resultLog)

  if (!success) {
    return
  }

  const request = await buildRequest('../../Functions-request-config.js')

  const accounts = await ethers.getSigners()
  const deployer = accounts[0]

  let linkToken
  let mockOracle
  let linkTokenAddress
  let oracleAddress

  if (chainId == 31337) {
    const linkTokenFactory = await ethers.getContractFactory('LinkToken')
    linkToken = await linkTokenFactory.connect(deployer).deploy()

    const mockOracleFactoryFactory = await ethers.getContractFactory('FunctionsOracleFactory')
    mockOracleFactory = await mockOracleFactoryFactory.connect(deployer).deploy()
    const OracleDeploymentTransaction = await mockOracleFactory.deployNewOracle(
      ethers.utils.toUtf8Bytes(networkConfig[chainId]['functionsPublicKey'])
    )
    const OracleDeploymentReceipt = await OracleDeploymentTransaction.wait()
    const FunctionsOracleAddress = OracleDeploymentReceipt.events[0].args.oracle
    mockOracle = await ethers.getContractAt('FunctionsOracle', FunctionsOracleAddress)

    linkTokenAddress = linkToken.address
    oracleAddress = mockOracle.address

    // Set up Functions Oracle
    await mockOracle.setAuthorizedSenders([deployer.address])
  } else {
    oracleAddress = networkConfig[chainId]['functionsOracle']
    linkTokenAddress = networkConfig[chainId]['linkToken']
    linkToken = new ethers.Contract(linkTokenAddress, LINK_TOKEN_ABI, deployer)
  }
  const updateInterval = networkConfig[chainId]['keepersUpdateInterval'] || '30'

  const arguments = [oracleAddress, request.source, request.args ?? [], request.secrets ?? [], updateInterval]
  const apiConsumerFactory = await ethers.getContractFactory('AutomatedAPIConsumer')
  const apiConsumer = await apiConsumerFactory.deploy(...arguments)

  const waitBlockConfirmations = developmentChains.includes(network.name) ? 1 : VERIFICATION_BLOCK_CONFIRMATIONS
  await apiConsumer.deployTransaction.wait(waitBlockConfirmations)

  console.log(`AutomatedAPIConsumer deployed to ${apiConsumer.address} on ${network.name}`)

  if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    await run('verify:verify', {
      address: apiConsumer.address,
      constructorArguments: arguments,
    })
  }

  // auto-funding
  const fundAmount = networkConfig[chainId]['fundAmount']
  await linkToken.transfer(apiConsumer.address, fundAmount)

  console.log(`AutomatedAPIConsumer funded with ${fundAmount} JUELS`)

  return { apiConsumer, mockOracle }
}

module.exports = {
  deployAutomatedApiConsumer,
}
