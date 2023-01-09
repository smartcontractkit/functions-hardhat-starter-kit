const { VERIFICATION_BLOCK_CONFIRMATIONS, networkConfig } = require('../../network-config')

task('functions-deploy-oracle', 'Deploys & configures a new FunctionsRegistry, FunctionsOracleFactory and FunctionsOracle (functions-set-ocr-config must still be run after this command)')
  .setAction(async () => {
    const linkEthFeedAddress = networkConfig[network.name]['linkEthPriceFeed']
    const linkTokenAddress = networkConfig[network.name]['linkToken']
    let overrides = undefined
    if (network.config.chainId == 5) {
      overrides = {
        // be careful, this may drain your balance quickly
        maxPriorityFeePerGas: ethers.utils.parseUnits("50", "gwei"),
        maxFeePerGas: ethers.utils.parseUnits("50", "gwei"),
      }
    }
  
    console.log('Deploying Functions registry')
    const registryFactory = await ethers.getContractFactory('FunctionsRegistry')
    const registry = await registryFactory.deploy(linkTokenAddress, linkEthFeedAddress, overrides)
    console.log(`Waiting for transaction ${registry.deployTransaction.hash} to be confirmed...`)
    await registry.deployTransaction.wait(1)
    console.log(`FunctionsRegistry deployed to ${registry.address} on ${network.name}`)
  
    console.log('Setting registy configuration')
    const config = {
      maxGasLimit: 450_000,
      stalenessSeconds: 86_400,
      gasAfterPaymentCalculation: 21_000 + 5_000 + 2_100 + 20_000 + 2 * 2_100 - 15_000 + 7_315,
      weiPerUnitLink: ethers.BigNumber.from('5000000000000000'),
      gasOverhead: 100_000,
      requestTimeoutSeconds: 300,
    }
    await registry.setConfig(
      config.maxGasLimit,
      config.stalenessSeconds,
      config.gasAfterPaymentCalculation,
      config.weiPerUnitLink,
      config.gasOverhead,
      config.requestTimeoutSeconds
    )
    console.log('Registry configuration set')
  
    console.log('Deploying Functions oracle factory')
    const oracleFactoryFactory = await ethers.getContractFactory('FunctionsOracleFactory')
    const oracleFactory = await oracleFactoryFactory.deploy(overrides)
    console.log(`Waiting for transaction ${oracleFactory.deployTransaction.hash} to be confirmed...`)
    await oracleFactory.deployTransaction.wait(1)
    console.log(`FunctionsOracleFactory deployed to ${oracleFactory.address} on ${network.name}`)
  
    console.log('Deploying Functions oracle')
    const accounts = await ethers.getSigners()
    const deployer = accounts[0]
    const OracleDeploymentTransaction = await oracleFactory.deployNewOracle(overrides)
    console.log(`Waiting for transaction ${OracleDeploymentTransaction.hash} to be confirmed...`)
    const OracleDeploymentReceipt = await OracleDeploymentTransaction.wait(1)
    const FunctionsOracleAddress = OracleDeploymentReceipt.events[1].args.oracle
    const oracle = await ethers.getContractAt('FunctionsOracle', FunctionsOracleAddress, deployer)
    console.log(`FunctionsOracle deployed to ${oracle.address} on ${network.name}`)
  
    // Set up Functions Oracle
    console.log(`Accepting oracle contract ownership`)
    const acceptTx = await oracle.acceptOwnership(overrides)
    console.log(`Waiting for transaction ${acceptTx.hash} to be confirmed...`)
    await acceptTx.wait(1)
    console.log('Oracle ownership accepted')
  
    console.log(`Setting DON public key to ${networkConfig[network.name]['functionsPublicKey']}`)
    await oracle.setDONPublicKey('0x' + networkConfig[network.name]['functionsPublicKey'], overrides)
    console.log('DON public key set')
  
    console.log('Authorizing oracle with registry')
    await registry.setAuthorizedSenders([oracle.address], overrides)
    console.log('Oracle authorized with registry')
  
    console.log(`Setting oracle registry to ${registry.address}`)
    const setRegistryTx = await oracle.setRegistry(registry.address, overrides)
    console.log('Oracle registry set')
  
    if (process.env.ETHERSCAN_API_KEY || process.env.POLYGONSCAN_API_KEY) {
      console.log('Waiting 6 blocks before verifying contracts...')
      await setRegistryTx.wait(6)

      try { 
        console.log('Verifying registry contract...')
        await run('verify:verify', {
          address: registry.address,
          constructorArguments: [linkTokenAddress, linkEthFeedAddress],
        })
        console.log('Oracle registry contract verified')
    
        console.log('Verifying oracle factory contract...')
        await run('verify:verify', {
          address: oracleFactory.address,
          constructorArguments: [],
        })
        console.log('Oracle factory contract verified')
    
        console.log('Verifying oracle contract...')
        await run('verify:verify', {
          address: oracle.address,
          constructorArguments: [],
        })
        console.log('Oracle contract verified')
      } catch (error) {
        console.log('Error verifying contracts.  Delete the ./build folder and try again.')
        console.log(error)
      }
    }
    
    console.log(`\nFunctionsOracle successfully deployed to ${oracle.address} on ${network.name}\n`)
  })
