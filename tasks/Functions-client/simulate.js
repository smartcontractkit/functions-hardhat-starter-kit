const {
  simulateRequest,
  buildRequest,
  getDecodedResultLog,
  getRequestConfig,
} = require("../../FunctionsSandboxLibrary")
const { networkConfig } = require("../../network-config")

task("functions-simulate", "Simulates an end-to-end fulfillment locally for the FunctionsConsumer contract")
  .addOptionalParam(
    "gaslimit",
    "Maximum amount of gas that can be used to call fulfillRequest in the client contract (defaults to 100,000)"
  )
  .setAction(async (taskArgs, hre) => {
    // Simulation can only be conducted on a local fork of the blockchain
    if (network.name !== "hardhat") {
      throw Error('Simulated requests can only be conducted using --network "hardhat"')
    }

    // Check to see if the maximum gas limit has been exceeded
    const gasLimit = parseInt(taskArgs.gaslimit ?? "100000")
    if (gasLimit > 300000) {
      throw Error("Gas limit must be less than or equal to 300,000")
    }

    // Recompile the latest version of the contracts
    console.log("\n__Compiling Contracts__")
    await run("compile")

    // Deploy a mock oracle & registry contract to simulate a fulfillment
    const { oracle, registry, linkToken } = await deployMockOracle()
    // Deploy the client contract
    const clientFactory = await ethers.getContractFactory("FunctionsConsumer")
    const client = await clientFactory.deploy(oracle.address)
    await client.deployTransaction.wait(1)

    const accounts = await ethers.getSigners()
    const deployer = accounts[0]
    // Add the wallet initiating the request to the oracle allowlist to authorize a simulated fulfillment
    const allowlistTx = await oracle.addAuthorizedSenders([deployer.address])
    await allowlistTx.wait(1)

    // Create & fund a subscription
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
    await registry.addConsumer(subscriptionId, client.address)

    // Build the parameters to make a request from the client contract
    const requestConfig = require("../../Functions-request-config.js")
    const validatedRequestConfig = getRequestConfig(requestConfig)
    // Fetch the mock DON public key
    const DONPublicKey = await oracle.getDONPublicKey()
    // Remove the preceding 0x from the DON public key
    requestConfig.DONPublicKey = DONPublicKey.slice(2)
    const request = await buildRequest(requestConfig)

    // Make a request & simulate a fulfillment
    await new Promise(async (resolve) => {
      // Initiate the request from the client contract
      const clientContract = await clientFactory.attach(client.address)
      const requestTx = await clientContract.executeRequest(
        request.source,
        request.secrets ?? [],
        validatedRequestConfig.secretsLocation,
        request.args ?? [],
        subscriptionId,
        gasLimit
      )
      const requestTxReceipt = await requestTx.wait(1)
      const requestId = requestTxReceipt.events[2].args.id
      const requestGasUsed = requestTxReceipt.gasUsed.toString()

      // Simulating the JavaScript code locally
      console.log("\nExecuting JavaScript request source code locally...")
      const unvalidatedRequestConfig = require("../../Functions-request-config.js")
      const requestConfig = getRequestConfig(unvalidatedRequestConfig)

      if (requestConfig.secretsLocation === 1) {
        requestConfig.secrets = undefined

        if (!requestConfig.globalOffchainSecrets || Object.keys(requestConfig.globalOffchainSecrets).length === 0) {
          console.log("Using secrets assigned to the first node as no global secrets were provided")
          if (
            requestConfig.perNodeOffchainSecrets &&
            requestConfig.perNodeOffchainSecrets[0] &&
            Object.keys(requestConfig.perNodeOffchainSecrets[0]).length > 0
          ) {
            requestConfig.secrets = requestConfig.perNodeOffchainSecrets[0]
          }
        } else {
          requestConfig.secrets = requestConfig.globalOffchainSecrets
        }
      }

      const { success, result, resultLog } = await simulateRequest(requestConfig)
      console.log(`\n${resultLog}`)

      // Simulate a request fulfillment
      const accounts = await ethers.getSigners()
      const dummyTransmitter = accounts[0].address
      const dummySigners = Array(31).fill(dummyTransmitter)
      let i = 0
      try {
        const fulfillTx = await registry.fulfillAndBill(
          requestId,
          success ? result : "0x",
          success ? "0x" : result,
          dummyTransmitter,
          dummySigners,
          4,
          100_000,
          500_000,
          {
            gasLimit: 500_000,
          }
        )
        await fulfillTx.wait(1)
      } catch (fulfillError) {
        // Catch & report any unexpected fulfillment errors
        console.log("\nUnexpected error encountered when calling fulfillRequest in client contract.")
        console.log(fulfillError)
        resolve()
      }

      // Listen for the OCRResponse event & log the simulated response returned to the client contract
      client.on("OCRResponse", async (eventRequestId, result, err) => {
        console.log("__Simulated On-Chain Response__")
        if (eventRequestId !== requestId) {
          throw new Error(`${eventRequestId} is not equal to ${requestId}`)
        }
        // Check for & log a successful request
        if (result !== "0x") {
          console.log(
            `Response returned to client contract represented as a hex string: ${result}\n${getDecodedResultLog(
              requestConfig,
              result
            )}`
          )
        }
        // Check for & log a request that returned an error message
        if (err !== "0x") {
          console.log(`Error message returned to client contract: "${Buffer.from(err.slice(2), "hex")}"\n`)
        }
      })

      // Listen for the BillingEnd event & log the estimated billing data
      registry.on(
        "BillingEnd",
        async (
          eventRequestId,
          eventSubscriptionId,
          eventSignerPayment,
          eventTransmitterPayment,
          eventTotalCost,
          eventSuccess
        ) => {
          if (requestId == eventRequestId) {
            // Check for a successful request & log a message if the fulfillment was not successful
            if (!eventSuccess) {
              console.log(
                "\nError encountered when calling fulfillRequest in client contract.\n" +
                  "Ensure the fulfillRequest function in the client contract is correct and the --gaslimit is sufficient.\n"
              )
            }

            const fulfillGasUsed = await getGasUsedForFulfillRequest(success, result)
            console.log(`Gas used by sendRequest: ${requestGasUsed}`)
            console.log(`Gas used by client callback function: ${fulfillGasUsed}`)
            return resolve()
          }
        }
      )
    })
  })

const getGasUsedForFulfillRequest = async (success, result) => {
  const accounts = await ethers.getSigners()
  const deployer = accounts[0]
  const simulatedRequestId = "0x0000000000000000000000000000000000000000000000000000000000000001"

  const clientFactory = await ethers.getContractFactory("FunctionsConsumer")
  const client = await clientFactory.deploy(deployer.address)
  client.addSimulatedRequestId(deployer.address, simulatedRequestId)
  await client.deployTransaction.wait(1)

  let txReceipt
  if (success) {
    txReceipt = await client.handleOracleFulfillment(simulatedRequestId, result, [])
  } else {
    txReceipt = await client.handleOracleFulfillment(simulatedRequestId, [], result)
  }
  const txResult = await txReceipt.wait(1)

  return txResult.gasUsed.toString()
}

const deployMockOracle = async () => {
  // Deploy a mock LINK token contract
  const linkTokenFactory = await ethers.getContractFactory("LinkToken")
  const linkToken = await linkTokenFactory.deploy()
  const linkEthFeedAddress = networkConfig["hardhat"]["linkEthPriceFeed"]
  // Deploy proxy admin
  await upgrades.deployProxyAdmin()
  // Deploy the oracle contract
  const oracleFactory = await ethers.getContractFactory("contracts/dev/functions/FunctionsOracle.sol:FunctionsOracle")
  const oracleProxy = await upgrades.deployProxy(oracleFactory, [], {
    kind: "transparent",
  })
  await oracleProxy.deployTransaction.wait(1)
  // Set the secrets encryption public DON key in the mock oracle contract
  await oracleProxy.setDONPublicKey("0x" + networkConfig["hardhat"]["functionsPublicKey"])
  // Deploy the mock registry billing contract
  const registryFactory = await ethers.getContractFactory(
    "contracts/dev/functions/FunctionsBillingRegistry.sol:FunctionsBillingRegistry"
  )
  const registryProxy = await upgrades.deployProxy(
    registryFactory,
    [linkToken.address, linkEthFeedAddress, oracleProxy.address],
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
