// deploy/00_deploy_my_contract.js
const deployMockOracle = async () => {
  const SHARED_DON_PUBLIC_KEY =
    "a30264e813edc9927f73e036b7885ee25445b836979cb00ef112bc644bd16de2db866fa74648438b34f52bb196ffa386992e94e0a3dc6913cee52e2e98f1619c"

  // Deploy mocks: LINK token & LINK/ETH price feed
  const linkTokenFactory = await ethers.getContractFactory("LinkToken")
  const linkPriceFeedFactory = await ethers.getContractFactory("MockV3Aggregator")
  const linkToken = await linkTokenFactory.deploy()
  const linkPriceFeed = await linkPriceFeedFactory.deploy(0, ethers.BigNumber.from(5021530000000000))
  // Deploy proxy admin
  await upgrades.deployProxyAdmin()
  // Deploy the oracle contract
  const oracleFactory = await ethers.getContractFactory("contracts/dev/functions/FunctionsOracle.sol:FunctionsOracle")
  const oracleProxy = await upgrades.deployProxy(oracleFactory, [], {
    kind: "transparent",
  })
  await oracleProxy.deployTransaction.wait(1)
  // Set the secrets encryption public DON key in the mock oracle contract
  await oracleProxy.setDONPublicKey("0x" + SHARED_DON_PUBLIC_KEY)
  // Deploy the mock registry billing contract
  const registryFactory = await ethers.getContractFactory(
    "contracts/dev/functions/FunctionsBillingRegistry.sol:FunctionsBillingRegistry"
  )
  const registryProxy = await upgrades.deployProxy(
    registryFactory,
    [linkToken.address, linkPriceFeed.address, oracleProxy.address],
    {
      kind: "transparent",
    }
  )
  await registryProxy.deployTransaction.wait(1)
  // Set registry configuration
  const config = {
    maxGasLimit: 300_000,
    stalenessSeconds: 86_400,
    gasAfterPaymentCalculation: 39_173,
    weiPerUnitLink: ethers.BigNumber.from("5000000000000000"),
    gasOverhead: 519_719,
    requestTimeoutSeconds: 300,
  }
  await registryProxy.setConfig(
    config.maxGasLimit,
    config.stalenessSeconds,
    config.gasAfterPaymentCalculation,
    config.weiPerUnitLink,
    config.gasOverhead,
    config.requestTimeoutSeconds
  )
  // Set the current account as an authorized sender in the mock registry to allow for simulated local fulfillments
  const accounts = await ethers.getSigners()
  const deployer = accounts[0]
  await registryProxy.setAuthorizedSenders([oracleProxy.address, deployer.address])
  await oracleProxy.setRegistry(registryProxy.address)

  return { oracle: oracleProxy, registry: registryProxy, linkToken }
}

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  let { oracle, registry, linkToken } = await deployMockOracle()

  const consumer = await deploy("FunctionsConsumer", {
    from: deployer,
    args: [oracle.address],
    log: true,
    // we need to wait if on a live network so we can verify properly
    waitConfirmations: 1,
  })

  const allowlistTx = await oracle.addAuthorizedSenders([deployer, consumer.address])
  await allowlistTx.wait(1)

  const createSubscriptionTx = await registry.createSubscription()
  const createSubscriptionReceipt = await createSubscriptionTx.wait(1)
  const subscriptionId = createSubscriptionReceipt.events[0].args["subscriptionId"].toNumber()

  const juelsAmount = ethers.utils.parseUnits("10")
  await linkToken.transferAndCall(
    registry.address,
    juelsAmount,
    ethers.utils.defaultAbiCoder.encode(["uint64"], [subscriptionId])
  )
  // Authorize the client contract to use the subscription
  await registry.addConsumer(subscriptionId, consumer.address)
}
module.exports.tags = ["all"]
