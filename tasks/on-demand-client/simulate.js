const { simulateRequest, buildRequest } = require('../utils/onDemandRequestSimulator')
const { getDecodedResultLog } = require('../utils/onDemandRequestSimulator/simulateRequest')
const { getNetworkConfig } = require('../utils/utils')

task('on-demand-simulate', 'Simulates an end-to-end fulfillment locally')
    .addOptionalParam(
      'name',
      'Name of the contract to test (defaults to OnDemandConsumer)'
    )
    .addOptionalParam(
        'gaslimit',
        'The maximum amount of gas that can be used to fulfill a request (defaults to 100,000)'
    )
    .setAction(async (taskArgs, hre) => {
        if (network.name !== 'hardhat') {
          throw Error('Simulated requests can only be conducted using --network "hardhat"')
        }

        const contractName = taskArgs.name ?? 'OnDemandConsumer'
        const gasLimit = parseInt(taskArgs.gaslimit ?? '100000')
        if (gasLimit >= 400000) {
          throw Error('Gas limit must be less than 400,000')
        }

        console.log('\nSimulating on demand request locally...')
        const { success, result, resultLog } = await simulateRequest('../../../on-demand-request-config.js')
        console.log(`\n${resultLog}`)

        const request = await buildRequest('../../../on-demand-request-config.js')

        const { oracle, registry, linkToken } = await deployMockOracle()
        const clientFactory = await ethers.getContractFactory(contractName)
        const client = await clientFactory.deploy(oracle.address)
        await client.deployTransaction.wait(1)
        const createSubscriptionTx = await registry.createSubscription()
        const createSubscriptionReceipt = await createSubscriptionTx.wait(1)
        const subscriptionId = createSubscriptionReceipt.events[0].args['subscriptionId'].toNumber()
        const juelsAmount = ethers.utils.parseUnits('10')
        await linkToken.transferAndCall(
          registry.address,
          juelsAmount,
          ethers.utils.defaultAbiCoder.encode(['uint64'], [subscriptionId])
        )
        await registry.addConsumer(subscriptionId, client.address)
        const accounts = await ethers.getSigners()
        const deployer = accounts[0]
        const whitelistTx = await oracle.addAuthorizedSenders([deployer.address])
        await whitelistTx.wait(1)

        await new Promise(async (resolve) => {
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
            i ++
          }
          try {
            await registry.fulfillAndBill(
              requestId,
              success ? result : '0x',
              success ? '0x' : result,
              transmitter,
              signers,
              ocrConfig.transmitters.length,
              // TODO: the values below must be accurate to provide accurate gas estimation
              0,
              500_000,
              {
                gasLimit: 500_000
              }
            )
          } catch (fulfillError) {
            console.log('Unexpected error encountered when calling fulfillRequest in client contract.')
            console.log(fulfillError)
            resolve()
          }

          client.on('OCRResponse', async (result, err) => {
            if (result !== '0x') {
                console.log(
                    `\nOn-chain response represented as a hex string: ${result}\n${getDecodedResultLog(
                        require('../../on-demand-request-config'),
                        result
                    )}`
                )
            }
            if (err !== '0x') {
                console.log(`\nOn-chain error message: ${Buffer.from(err.slice(2), 'hex')}`)
            }
          })

          registry.on('BillingEnd', async (
            eventSubscriptionId,
            eventRequestId,
            eventWeiPerUnitGas,
            eventTotalGasUsed,
            eventSignerPayment,
            eventTransmitterPayment,
            eventTotalCost,
            eventSuccess
          ) => {
            if (requestId == eventRequestId) {
              if (!eventSuccess) {
                console.log('Error encountered when calling fulfillRequest in client contract.\n' +
                  'Ensure the fulfillRequest function in the client contract is correct and the --gaslimit is sufficent.')
              }
              console.log(`\nGas used to fulfill request: ${eventTotalGasUsed}`)
              console.log(`Transmission cost: ${hre.ethers.utils.formatUnits(eventTransmitterPayment, 18)} LINK`)
              console.log(`Base fee: ${hre.ethers.utils.formatUnits(eventSignerPayment, 18)} LINK`)
              console.log(`Total cost: ${hre.ethers.utils.formatUnits(eventTotalCost, 18)} LINK`)
              return resolve()
            }
          })
        })
    })

const deployMockOracle = async () => {
  const networkConfig = getNetworkConfig('hardhat')

  const linkTokenFactory = await ethers.getContractFactory("LinkToken")
  const linkToken = await linkTokenFactory.deploy()

  // TODO: Gas reimbursement cost should be calculated in native token, not ETH
  const linkEthFeedAddress = networkConfig["linkEthPriceFeed"]

  const registryFactory = await ethers.getContractFactory("OCR2DRRegistry")
  const registry = await registryFactory.deploy(linkToken.address, linkEthFeedAddress)
  await registry.deployTransaction.wait(1)

  const config = {
      maxGasLimit: 450_000,
      stalenessSeconds: 86_400,
      gasAfterPaymentCalculation: 21_000 + 5_000 + 2_100 + 20_000 + 2 * 2_100 - 15_000 + 7_315,
      weiPerUnitLink: ethers.BigNumber.from("5000000000000000"),
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

  const oracleFactoryFactory = await ethers.getContractFactory("OCR2DROracleFactory")
  const oracleFactory = await oracleFactoryFactory.deploy()
  await oracleFactory.deployTransaction.wait(1)

  const accounts = await ethers.getSigners()
  const deployer = accounts[0]
  const OracleDeploymentTransaction = await oracleFactory.deployNewOracle()
  const OracleDeploymentReceipt = await OracleDeploymentTransaction.wait(1)
  const OCR2DROracleAddress = OracleDeploymentReceipt.events[1].args.oracle
  const oracle = await ethers.getContractAt("OCR2DROracle", OCR2DROracleAddress, deployer)

  const acceptTx = await oracle.acceptOwnership()
  await acceptTx.wait(1)

  await oracle.setDONPublicKey(
    ethers.utils.toUtf8Bytes(networkConfig["ocr2odPublicKey"])
  )
  // Set the current account as an authorized sender on the oracle in order to simulate a fulfillment locally
  await registry.setAuthorizedSenders([oracle.address, deployer.address])
  await oracle.setRegistry(registry.address)

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

  return { oracle, registry, linkToken }
}

module.exports = {}
