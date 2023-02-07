const { networkConfig } = require("../../network-config")
const { types } = require("hardhat/config")

task("functions-upgrade", "Upgrades the implementation of an existing Functions contract")
  .addParam("type", "Name of the contract to upgrade, options: oracle, registry", null, types.string)
  .setAction(async (taskArgs) => {
    console.log("\n__Recompiling Contracts__")
    await run("compile")

    if (network.name === "hardhat") {
      throw Error("This command cannot be used on a local development chain.  Specify a valid network.")
    }

    let overrides = undefined
    if (network.name === "goerli") {
      overrides = {
        // be careful, this may drain your balance quickly
        maxPriorityFeePerGas: ethers.utils.parseUnits("50", "gwei"),
        maxFeePerGas: ethers.utils.parseUnits("50", "gwei"),
      }
    }

    let proxyAddress, newImplementationFactory, contractPath
    const { type } = taskArgs
    if (type === "registry" || type === "Registry" || type === "REGISTRY") {
      proxyAddress = networkConfig[network.name]["functionsBillingRegistryProxy"]
      contractPath =
        "contracts/dev/functions/migrations/FunctionsBillingRegistryMigration.sol:FunctionsBillingRegistryMigration"
      newImplementationFactory = await ethers.getContractFactory(contractPath)
    } else if (type === "oracle" || type === "Oracle" || type === "ORACLE") {
      proxyAddress = networkConfig[network.name]["functionsOracleProxy"]
      contractPath = "contracts/dev/functions/migrations/FunctionsOracleMigration.sol:FunctionsOracleMigration"
      newImplementationFactory = await ethers.getContractFactory(contractPath)
    } else {
      throw Error("The parameter for '--contract' must be one of: oracle, registry.")
    }

    console.log("Validating upgrade...")
    await upgrades.validateUpgrade(proxyAddress, newImplementationFactory)
    console.log("Upgrade is ready! Deploying..")

    const proxyToNewImplementation = await upgrades.upgradeProxy(proxyAddress, newImplementationFactory, {
      kind: "transparent",
    })
    console.log(`Waiting for the transaction ${proxyToNewImplementation.deployTransaction.hash} to be confirmed`)
    await proxyToNewImplementation.deployTransaction.wait(1)

    const proxyAdminAddress = await upgrades.deployProxyAdmin()
    const proxyAdmin = await ethers.getContractAt("ProxyAdmin", proxyAdminAddress, await ethers.getSigner())
    const newImplementationAddress = await proxyAdmin.getProxyImplementation(proxyToNewImplementation.address)

    console.log(`New ${type} implementation at:`, newImplementationAddress)

    if (process.env.ETHERSCAN_API_KEY || process.env.POLYGONSCAN_API_KEY) {
      try {
        console.log(`Verifying new ${type} implementation contract...`)
        await run("verify:verify", {
          address: proxyToNewImplementation.address,
          contract: contractPath,
        })
        console.log(`New ${type} implementation contract verified!`)
      } catch (error) {
        console.log("Error verifying contracts.  Delete the ./build folder and try again.")
        console.log(error)
      }
    }

    console.log(`New ${type} implementation successfully deployed to ${newImplementationAddress} on ${network.name}`)
  })
