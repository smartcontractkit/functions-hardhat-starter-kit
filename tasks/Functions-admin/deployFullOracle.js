const { VERIFICATION_BLOCK_CONFIRMATIONS, networkConfig } = require("../../network-config")

task(
  "functions-deploy-oracle",
  "Deploys & configures a new FunctionsBillingRegistry and FunctionsOracle (functions-set-ocr-config must still be run after this command)"
).setAction(async () => {
  console.log("\n__Recompiling Contracts__")
  await run("compile")

  const linkEthFeedAddress = networkConfig[network.name]["linkEthPriceFeed"]
  const linkTokenAddress = networkConfig[network.name]["linkToken"]
  let overrides = undefined
  if (network.name === "goerli") {
    overrides = {
      // be careful, this may drain your balance quickly
      maxPriorityFeePerGas: ethers.utils.parseUnits("50", "gwei"),
      maxFeePerGas: ethers.utils.parseUnits("50", "gwei"),
    }
  }

  if (network.name === "mumbai") {
    overrides = { gasLimit: 5000000 }
  }

  const proxyAdminAddress = await upgrades.deployProxyAdmin()
  console.log(`Proxy Admin contract is deployed at ${proxyAdminAddress} on ${network.name}`)
  const proxyAdmin = await ethers.getContractAt("ProxyAdmin", proxyAdminAddress, await ethers.getSigner())

  let oracleProxy
  const FunctionsOracle = await ethers.getContractFactory("FunctionsOracle")
  console.log("Deploying Functions Oracle Proxy & implementation contract")
  oracleProxy = overrides
    ? await upgrades.deployProxy(FunctionsOracle, [], {
        kind: "transparent",
        constructorArgs: overrides,
      })
    : await upgrades.deployProxy(FunctionsOracle)
  console.log(`Waiting for the transaction ${oracleProxy.deployTransaction.hash} to be confirmed`)
  await oracleProxy.deployTransaction.wait(1)
  const oracleImplementation = await proxyAdmin.getProxyImplementation(oracleProxy.address)
  console.log(
    `FunctionsOracle proxy deployed to ${oracleProxy.address} using the implementation at ${oracleImplementation} on ${network.name}`
  )

  console.log("Deploying Functions registry", linkEthFeedAddress, linkTokenAddress)
  const registryFactory = await ethers.getContractFactory("FunctionsBillingRegistry")
  const registryProxy = overrides
    ? await upgrades.deployProxy(registryFactory, [linkTokenAddress, linkEthFeedAddress, oracleProxy.address], {
        kind: "transparent",
        constructorArgs: overrides,
      })
    : await upgrades.deployProxy(registryFactory, [linkTokenAddress, linkEthFeedAddress, oracleProxy.address])
  console.log(`Waiting for the transaction ${registryProxy.deployTransaction.hash} to be confirmed`)
  await registryProxy.deployTransaction.wait(1)
  const registryImplementation = await proxyAdmin.getProxyImplementation(registryProxy.address)
  console.log(
    `FunctionsBillingRegistry proxy deployed to ${registryProxy.address} using the implementation at ${registryImplementation} on ${network.name}`
  )

  // Set up Functions Oracle
  console.log(`Setting DON public key to ${networkConfig[network.name]["functionsPublicKey"]}`)
  overrides
    ? await oracleProxy.setDONPublicKey("0x" + networkConfig[network.name]["functionsPublicKey"], overrides)
    : await oracleProxy.setDONPublicKey("0x" + networkConfig[network.name]["functionsPublicKey"])
  console.log("DON public key set")

  console.log("Authorizing oracle with registry")
  overrides
    ? await registryProxy.setAuthorizedSenders([oracleProxy.address], overrides)
    : await registryProxy.setAuthorizedSenders([oracleProxy.address])
  console.log("Oracle authorized with registry")

  console.log(`Setting oracle registry to ${registryProxy.address}`)
  const setRegistryTx = overrides
    ? await oracleProxy.setRegistry(registryProxy.address, overrides)
    : await oracleProxy.setRegistry(registryProxy.address)
  console.log("Oracle registry set")

  if (process.env.ETHERSCAN_API_KEY || process.env.POLYGONSCAN_API_KEY) {
    console.log("Waiting 6 blocks before verifying contracts...")
    await setRegistryTx.wait(6)

    try {
      console.log("Verifying registry contracts...")
      await run("verify:verify", {
        address: registryProxy.address,
        contract: "contracts/dev/functions/FunctionsBillingRegistry.sol:FunctionsBillingRegistry",
      })
      console.log("Billing registry contracts verified")

      console.log("Verifying oracle contracts...")
      await run("verify:verify", {
        address: oracleProxy.address,
        contract: "contracts/dev/functions/FunctionsOracle.sol:FunctionsOracle",
      })
      console.log("Oracle contracts verified")
    } catch (error) {
      console.log("Error verifying contracts.  Delete the ./build folder and try again.")
      console.log(error)
    }
  }

  console.log(`\nFunctionsBillingRegistry successfully deployed to ${registryProxy.address} on ${network.name}`)
  console.log(`FunctionsOracle successfully deployed to ${oracleProxy.address} on ${network.name}`)
})
