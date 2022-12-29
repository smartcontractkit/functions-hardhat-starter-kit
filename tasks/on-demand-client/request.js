const { simulateRequest, buildRequest } = require('../utils/onDemandRequestSimulator')
const { getDecodedResultLog } = require('../utils/onDemandRequestSimulator/simulateRequest')
const { VERIFICATION_BLOCK_CONFIRMATIONS, developmentChains } = require('../../helper-hardhat-config')
const { getNetworkConfig } = require('../utils/utils')
const readline = require('readline/promises')

task('on-demand-request', 'Calls an On Demand API consumer contract to request external data')
  .addParam('contract', 'The address of the On Demand On Demand API Consumer contract that you want to call')
  .addParam('subid', 'The billing subscription ID used to pay for the request')
  .addOptionalParam('gaslimit', 'The maximum amount of gas that can be used to fulfill a request (defaults to 100,000)')
  .setAction(async (taskArgs, hre) => {
    if (developmentChains.includes(network.name)) {
      throw Error('This command cannot be used on a local development chain.  Please specify a valid network or simulate an OnDemandConsumer request locally with "npx hardhat on-demand-simulate".')
    }

    // Get the required parameters
    const networkConfig = getNetworkConfig(network.name)
    const contractAddr = taskArgs.contract
    const subscriptionId = taskArgs.subid
    const gasLimit = parseInt(taskArgs.gaslimit ?? '100000')
    if (gasLimit >= 400000) {
      throw Error('Gas limit must be less than 400,000')
    }

    // Attach to the required contracts
    const clientContractFactory = await ethers.getContractFactory('OnDemandConsumer')
    const clientContract = clientContractFactory.attach(contractAddr)
    const OracleFactory = await ethers.getContractFactory('OCR2DROracle')
    const oracle = await OracleFactory.attach(networkConfig['ocr2drOracle'])
    const registryAddress = await oracle.getRegistry()
    const RegistryFactory = await ethers.getContractFactory('OCR2DRRegistry')
    const registry = await RegistryFactory.attach(registryAddress)

    console.log('Simulating on demand request locally...')
    const { success, resultLog } = await simulateRequest('../../../on-demand-request-config.js', await oracle.getDONPublicKey())
    console.log(`\n${resultLog}`)

    // If the simulated JavaScript source code contains an error, confirm the user still wants to continue
    if (!success) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      })
      await rl.question(
        'There was an error when running the JavaScript source code for the request.  Do you still want to continue? (y) Yes / (n) No\n',
        async function (input) {
          if (input.toLowerCase() !== 'y' && input.toLowerCase() !== 'yes') {
            rl.close()
            process.exit(0)
          }
        })
      rl.close()
    }

    // Check that the subscription is valid
    let subInfo
    try {
      subInfo = await registry.getSubscription(subscriptionId)
    } catch (error) {
      if (error.errorName === 'InvalidSubscription') {
        throw Error(`Subscription ID "${subscriptionId}" is invalid or does not exist`)
      }
      throw error
    }
    // Validate the client contract has been authorized to use the subscription
    const existingConsumers = subInfo[2].map((addr) => addr.toLowerCase())
    if (!existingConsumers.includes(contractAddr.toLowerCase())) {
      throw Error(`Consumer contract ${contractAddr} is not registered to use subscription ${subscriptionId}`)
    }

    // Build the request
    const request = await buildRequest('../../../on-demand-request-config.js', await oracle.getDONPublicKey())

    // Estimate the cost of the request
    const { lastBaseFeePerGas, maxPriorityFeePerGas } = await hre.ethers.provider.getFeeData()
    const estimatedCostJuels = await clientContract.estimateCost(
      [
        0, // Inline
        0, // Inline
        0, // JavaScript
        request.source,
        request.secrets ?? [],
        request.args ?? [],
      ],
      subscriptionId,
      gasLimit,
      maxPriorityFeePerGas.add(lastBaseFeePerGas)
    )
    // Ensure the subscription has a sufficent balance
    const linkBalance = subInfo[0]
    if (subInfo[0].lt(estimatedCostJuels)) {
      throw Error(
        `Subscription ${subscriptionId} does not have sufficent funds. The estimated cost is ${estimatedCostJuels} Juels LINK, but has balance of ${linkBalance}`
      )
    }

    // Print the estimated cost of the request
    console.log(
      `If all ${gasLimit} callback gas is used, this request is estimated to cost ${hre.ethers.utils.formatUnits(
        estimatedCostJuels,
        18
      )} LINK\n`
    )
    // Ask for confirmation before initiating the request on-chain
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })
    await rl.question('Continue? (y) Yes / (n) No\n', async function (input) {
      if (input.toLowerCase() !== 'y' && input.toLowerCase() !== 'yes') {
        rl.close()
        process.exit(0)
      }
      resolve()
    })
    rl.close()

    // Use a promise to wait & listen for the fulfillment event before resolving
    await new Promise(async (resolve, reject) => {
      // Initate the listeners before making the request

      // Listen for fulfillment errors
      oracle.on('UserCallbackError', async (eventRequestId, msg) => {
        if (requestId == eventRequestId) {
          console.log('Error in client contract callback function')
          console.log(msg)
        }
      })
      oracle.on('UserCallbackRawError', async (eventRequestId, msg) => {
        if (requestId == eventRequestId) {
          console.log('Error in client contract callback function')
          console.log(Buffer.from(msg, 'hex').toString())
        }
      })
      // Listen for successful fulfillment
      let billingEndEventRecieved = false
      let ocrResponseEventReceived = false
      clientContract.on('OCRResponse', async (result, err) => {
        console.log(`\nRequest ${requestId} fulfilled!`)
        if (result !== '0x') {
          console.log(
            `\nResponse returned to client contract represented as a hex string: ${result}\n${getDecodedResultLog(
              require('../../on-demand-request-config'),
              result
            )}`
          )
        }
        if (err !== '0x') {
          console.log(`\nError message returned to client contract: ${Buffer.from(err.slice(2), 'hex')}\n`)
        }
        ocrResponseEventReceived = true
        if (billingEndEventRecieved) {
          return resolve()
        }
      })
      // Listen for the BillingEnd event, log cost breakdown & resolve
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
            console.log(
              `\nTransmission cost: ${hre.ethers.utils.formatUnits(eventTransmitterPayment, 18)} LINK`
            )
            console.log(`Base fee: ${hre.ethers.utils.formatUnits(eventSignerPayment, 18)} LINK`)
            console.log(`Total cost: ${hre.ethers.utils.formatUnits(eventTotalCost, 18)} LINK`)
            if (!eventSuccess) {
              console.log(
                '\nError encountered when calling fulfillRequest in client contract.\n' +
                  'Ensure the fulfillRequest function in the client contract is correct and the --gaslimit is sufficent.'
              )
              return resolve()
            }
            billingEndEventRecieved = true
            if (ocrResponseEventReceived) {
              return resolve()
            }
          }
        }
      )

      console.log(`\nRequesting new data from On Demand API Consumer contract ${contractAddr} on network ${network.name}`)
      const requestTx = await clientContract.executeRequest(
        request.source,
        request.secrets ?? [],
        request.args ?? [],
        subscriptionId,
        gasLimit
      )
      // If a response is not received within 5 minutes, the request has failed
      setTimeout(
        () => reject(
          'A response not received within 5 minutes of the request being initiated and has been canceled. Your subscription was not charged. Please make a new request.'
        ),
        300_000
      )
      const waitBlockConfirmations = developmentChains.includes(network.name) ? 1 : VERIFICATION_BLOCK_CONFIRMATIONS
      console.log(`Waiting ${waitBlockConfirmations} blocks for transaction ${requestTx.hash} to be confirmed...`)
      const requestTxReceipt = await requestTx.wait(waitBlockConfirmations)
      const requestId = requestTxReceipt.events[2].args.id
      console.log(`\nRequest ${requestId} initiated`)
      console.log(`Waiting for fulfillment...`)
    })
  })
module.exports = {}
