const { simulateRequest, buildRequest } = require('../utils/onDemandRequestSimulator')
const { getDecodedResultLog } = require('../utils/onDemandRequestSimulator/simulateRequest')
const { getNetworkConfig } = require('../utils/utils')

task('on-demand-simulate', 'Simulates an end-to-end fulfillment locally')
    .addOptionalParam(
      'name',
      'Name of the contract to test (defaults to OnDemandClient)'
    )
    .addOptionalParam(
        'gaslimit',
        'The maximum amount of gas that can be used to fulfill a request (defaults to 100,000)'
    )
    .setAction(async (taskArgs, hre) => {
        if (network.name !== 'hardhat') {
          throw Error('Simulated requests can only be conducted using --network "hardhat"')
        }

        const contractName = taskArgs.name ?? 'OnDemandClient'
        const gasLimit = parseInt(taskArgs.gaslimit ?? '100000')
        if (gasLimit >= 400000) {
          throw Error('Gas limit must be less than 400,000')
        }

        console.log('Simulating on demand request locally...')
        const { success, result, resultLog } = await simulateRequest('../../on-demand-request-config.js')
        console.log(`\n${resultLog}`)

        const request = await buildRequest('../../on-demand-request-config.js')

        const { oracle, registry } = await deployMockOracle()
        const networkConfig = getNetworkConfig(network.name)
        const clientFactory = await ethers.getContractFactory(contractName)
        const client = await clientFactory.deploy()

        const createSubscriptionTx = await registry.createSubscription()
        const createSubscriptionReceipt = await createSubscriptionTx.wait(1)
        const subscriptionId = createSubscriptionReceipt.events[0].args['subscriptionId'].toNumber()
        await linkToken.transferAndCall(
          networkConfig['ocr2odOracleRegistry'],
          juelsAmount,
          ethers.utils.defaultAbiCoder.encode(['uint64'], [subscriptionId])
        )
        await registry.addConsumer(subscriptionId, client.address)

        await new Promise(async (resolve) => {
          const requestTx = await client.executeRequest(
            request.source,
            request.secrets ?? [],
            request.args ?? [],
            subscriptionId,
            gasLimit
          )
          const requestTxReceipt = await requestTx.wait(1)
          const requestId = requestTxReceipt.events[2].args.id

          const accounts = await ethers.getSigners()
          const deployer = accounts[0]
          const ocrConfig = require('../../OCR2DROracleConfig.json')
          const transmitter = ocrConfig.transmitters[0]
          const signers = Array(ocrConfig.transmitters.length).fill(deployer.address)

          let i = 0
          for (const t of ocrConfig.transmitters) {
            signers[i] = t
            i ++
          }

          await registry.fulfillAndBill(
            requestId,
            success ? result : '0x0',
            success ? '0x0' : result,
            ocrConfig.transmitters[0],
            signers,
            ocrConfig.transmitters.length,
            // TODO: these 2 values below must be accurate to provide accurate gas estimation
            1_000_000,
            0,
          )

          client.on('OCRResponse', async (result, err) => {
            console.log(`Request ${requestId} fulfilled!`)
            if (result !== '0x') {
                console.log(
                    `\nResponse represented as a hex string: ${result}\n${getDecodedResultLog(
                        require('../../on-demand-request-config'),
                        result
                    )}`
                )
            }
            if (err !== '0x') {
                console.log(`\nResponse error: ${Buffer.from(err.slice(2), 'hex')}\n`)
            }
            return resolve()
          })

          registry.on('BillingEnd', async (
            eventSubscriptionId,
            eventRequestId,
            eventSignerPayment,
            eventTransmitterPayment,
            eventTotalCost,
            eventSuccess
          ) => {
            if (requestId == eventRequestId) {
              console.log(`Total cost: ${hre.ethers.utils.formatUnits(totalCost, 18)} LINK`)
            }
          })

          oracle.on('UserCallbackError', async (eventRequestId, msg) => {
              console.log('Error in client contract callback function')
              return resolve()
          })
        })
    })

const deployMockOracle = async () => {
  const networkConfig = getNetworkConfig('hardhat')

  const linkTokenFactory = await ethers.getContractFactory("LinkToken")
  const linkToken = await linkTokenFactory.deploy()

  const ethLinkFeedAddress = networkConfig["linkEthPriceFeed"]

  const registryFactory = await ethers.getContractFactory("OCR2DRRegistry")
  const registry = await registryFactory.deploy(linkToken.address, ethLinkFeedAddress)
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

  return { oracle, registry }
}

module.exports = {}
