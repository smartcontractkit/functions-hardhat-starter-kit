const { simulateRequest, buildRequest, getDecodedResultLog } = require('../../onDemandRequestSimulator')
const { networkConfig } = require('../../network-config')

task('on-demand-simulate', 'Simulates an end-to-end fulfillment locally')
  .addOptionalParam('gaslimit', 'The maximum amount of gas that can be used to fulfill a request (defaults to 100,000)')
  .setAction(async (taskArgs, hre) => {
    // Simuation can only be conducted on a local fork of the blockchain
    if (network.name !== 'hardhat') {
      throw Error('Simulated requests can only be conducted using --network "hardhat"')
    }

    // Check to see if the maximum gas limit has been exceeded
    const gasLimit = parseInt(taskArgs.gaslimit ?? '100000')
    if (gasLimit > 300000) {
      throw Error('Gas limit must be less than or equal to 300,000')
    }

    // Simulating the JavaScript code locally
    console.log('\nExecuting JavaScript request source code locally...')
    const { success, result, resultLog } = await simulateRequest(require('../../on-demand-request-config.js'))
    console.log(`\n${resultLog}`)

    // Recompile the latest version of the contracts
    console.log('__Compiling Contracts__')
    await run('compile')

    // Deploy a mock oracle & registry contract to simulate a fulfillment
    const { oracle, registry, linkToken } = await deployMockOracle()
    // Deploy the client contract
    const clientFactory = await ethers.getContractFactory('OnDemandConsumer')
    const client = await clientFactory.deploy(oracle.address)
    await client.deployTransaction.wait(1)

    // Create & fund a subscription
    const createSubscriptionTx = await registry.createSubscription()
    const createSubscriptionReceipt = await createSubscriptionTx.wait(1)
    const subscriptionId = createSubscriptionReceipt.events[0].args['subscriptionId'].toNumber()
    const juelsAmount = ethers.utils.parseUnits('10')
    await linkToken.transferAndCall(
      registry.address,
      juelsAmount,
      ethers.utils.defaultAbiCoder.encode(['uint64'], [subscriptionId])
    )
    // Authorize the client contract to use the subscription
    await registry.addConsumer(subscriptionId, client.address)
    const accounts = await ethers.getSigners()
    const deployer = accounts[0]

    // Add the wallet initiating the request to the oracle whitelist
    const whitelistTx = await oracle.addAuthorizedSenders([deployer.address])
    await whitelistTx.wait(1)

    // Build the parameters to make a request from the client contract
    const requestConfig = require('../../on-demand-request-config.js')
    // Fetch the DON public key from on-chain
    const DONPublicKey = await oracle.getDONPublicKey()
    // Remove the preceeding 0x from the DON public key
    requestConfig.DONPublicKey = DONPublicKey.slice(2)
    const request = await buildRequest(requestConfig)

    // Make a request & simulate a fulfillment
    await new Promise(async (resolve) => {
      // Initiate the request from the client contract
      const clientContract = await clientFactory.attach(client.address)
      const requestTx = await clientContract.executeRequest(
        request.source,
        request.secrets ?? [],
        request.args ?? [],
        subscriptionId,
        gasLimit
      )
      const requestTxReceipt = await requestTx.wait(1)
      const requestId = requestTxReceipt.events[2].args.id

      // Simulate a request fulfillment
      const ocrConfig = require('../../OCR2DROracleConfig.json')
      const transmitter = ocrConfig.transmitters[0]
      const signers = Array(31).fill(transmitter)
      let i = 0
      for (const t of ocrConfig.transmitters) {
        signers[i] = t
        i++
      }
      let totalGasUsed
      try {
        const fulfillTx = await registry.fulfillAndBill(
          requestId,
          success ? result : '0x',
          success ? '0x' : result,
          transmitter,
          signers,
          ocrConfig.transmitters.length,
          100_000,
          500_000,
          {
            gasLimit: 500_000,
          }
        )
        const fulfillTxData = await fulfillTx.wait(1)
        totalGasUsed = fulfillTxData.gasUsed.toNumber()
      } catch (fulfillError) {
        // Catch & report any unexpected fulfillment errors
        console.log('\nUnexpected error encountered when calling fulfillRequest in client contract.')
        console.log(fulfillError)
        resolve()
      }

      // Listen for the OCRResponse event & log the simulated response returned to the client contract
      client.on('OCRResponse', async (result, err) => {
        console.log('\n__Simulated On-Chain Response__')
        // Check for & log a successful request
        if (result !== '0x') {
          console.log(
            `Response returned to client contract represented as a hex string: ${result}\n${getDecodedResultLog(
              requestConfig,
              result
            )}`
          )
        }
        // Check for & log a request that returned an error message
        if (err !== '0x') {
          console.log(`Error message returned to client contract: ${Buffer.from(err.slice(2), 'hex')}\n`)
        }
      })

      // Listen for the BillingEnd event & log the estimated billing data
      registry.on(
        'BillingEnd',
        async (
          eventSubscriptionId,
          eventRequestId,
          eventSignerPayment,
          eventTransmitterPayment,
          eventTotalCost,
          eventSuccess
        ) => {
          if (requestId == eventRequestId) {
            // Check for a successful request & log a mesage if the fulfillment was not successful
            if (!eventSuccess) {
              console.log(
                '\nError encountered when calling fulfillRequest in client contract.\n' +
                  'Ensure the fulfillRequest function in the client contract is correct and the --gaslimit is sufficent.\n'
              )
            }
            // Amount of gas used to send and validate the OCR report
            const estimatedValidationGas = 100_000
            console.log(`Approximate gas used to validate & fulfill request: ${totalGasUsed + estimatedValidationGas}`)
            console.log(
              `Estimated transmission cost: ${hre.ethers.utils.formatUnits(eventTransmitterPayment, 18)} LINK (This will vary based on gas price)`
            )
            console.log(`Base fee: ${hre.ethers.utils.formatUnits(eventSignerPayment, 18)} LINK`)
            console.log(`Total estimated cost: ${hre.ethers.utils.formatUnits(eventTotalCost, 18)} LINK`)
            return resolve()
          }
        }
      )
    })
  })

const deployMockOracle = async () => {
  // Deploy a mock LINK token contract
  const linkTokenFactory = await ethers.getContractFactory('LinkToken')
  const linkToken = await linkTokenFactory.deploy()

  // TODO: Gas reimbursement cost should be calculated in native token, not ETH
  const linkEthFeedAddress = networkConfig['hardhat']['linkEthPriceFeed']

  // Deploy the mock registry billing contract
  const registryFactory = await ethers.getContractFactory('OCR2DRRegistry')
  const registry = await registryFactory.deploy(linkToken.address, linkEthFeedAddress)
  await registry.deployTransaction.wait(1)
  // Set registry configuration
  const config = {
    maxGasLimit: 400_000,
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
  // Deploy the mock oracle factory contract
  const oracleFactoryFactory = await ethers.getContractFactory('OCR2DROracleFactory')
  const oracleFactory = await oracleFactoryFactory.deploy()
  await oracleFactory.deployTransaction.wait(1)
  // Deploy the mock oracle contract
  const accounts = await ethers.getSigners()
  const deployer = accounts[0]
  const OracleDeploymentTransaction = await oracleFactory.deployNewOracle()
  const OracleDeploymentReceipt = await OracleDeploymentTransaction.wait(1)
  const OCR2DROracleAddress = OracleDeploymentReceipt.events[1].args.oracle
  const oracle = await ethers.getContractAt('OCR2DROracle', OCR2DROracleAddress, deployer)
  // Accept ownership of the mock oracle contract
  const acceptTx = await oracle.acceptOwnership()
  await acceptTx.wait(1)
  // Set the secrets encryption public DON key in the mock oracle contract
  await oracle.setDONPublicKey('0x' + networkConfig['hardhat']['ocr2drPublicKey'])
  // Set the current account as an authorized sender in the mock registry to allow for simulated local fulfillments
  await registry.setAuthorizedSenders([oracle.address, deployer.address])
  await oracle.setRegistry(registry.address)
  // Set the mock oracle OCR configuration settings
  const ocrConfig = require('../../OCR2DROracleConfig.json')
  const setOcrConfigTx = await oracle.setConfig(
    ocrConfig.signers,
    ocrConfig.transmitters,
    ocrConfig.f,
    ocrConfig.onchainConfig,
    ocrConfig.offchainConfigVersion,
    ocrConfig.offchainConfig
  )
  await setOcrConfigTx.wait(1)
  // Return the mock oracle, mock registry & mock LINK token contracts
  return { oracle, registry, linkToken }
}
