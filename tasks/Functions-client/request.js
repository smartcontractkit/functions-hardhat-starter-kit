const { simulateRequest, buildRequest, getDecodedResultLog } = require("../../FunctionsRequestSimulator")
const { VERIFICATION_BLOCK_CONFIRMATIONS, networkConfig } = require("../../network-config")
const readline = require("readline-promise").default

task("functions-request", "Initiates a request from an Functions client contract")
  .addParam("contract", "Address of the client contract to call")
  .addParam("subid", "Billing subscription ID used to pay for the request")
  .addOptionalParam(
    "gaslimit",
    "Maximum amount of gas that can be used to call fulfillRequest in the client contract (defaults to 100,000)"
  )
  .setAction(async (taskArgs, hre) => {
    let overrides;

    if (network.name === "hardhat") {
      throw Error(
        'This command cannot be used on a local development chain.  Specify a valid network or simulate an Functions request locally with "npx hardhat functions-simulate".'
      )
    }

    if (network.name === "goerli") {
      overrides = {
        // be careful, this may drain your balance quickly
        maxPriorityFeePerGas: ethers.utils.parseUnits("50", "gwei"),
        maxFeePerGas: ethers.utils.parseUnits("50", "gwei"),
        gasLimit: 500000,
      }
    }  

    // Get the required parameters
    const contractAddr = taskArgs.contract
    const subscriptionId = taskArgs.subid
    const gasLimit = parseInt(taskArgs.gaslimit ?? "100000")
    if (gasLimit > 300000) {
      throw Error("Gas limit must be less than or equal to 300,000")
    }

    // Attach to the required contracts
    const clientContractFactory = await ethers.getContractFactory("FunctionsConsumer")
    const clientContract = clientContractFactory.attach(contractAddr)
    const OracleFactory = await ethers.getContractFactory("FunctionsOracle")
    const oracle = await OracleFactory.attach(networkConfig[network.name]["functionsOracle"])
    const registryAddress = await oracle.getRegistry()
    const RegistryFactory = await ethers.getContractFactory("FunctionsBillingRegistry")
    const registry = await RegistryFactory.attach(registryAddress)

    console.log("Simulating Functions request locally...")
    const requestConfig = require("../../Functions-request-config.js")
    const { success, resultLog } = await simulateRequest(requestConfig)
    console.log(`\n${resultLog}`)

    // If the simulated JavaScript source code contains an error, confirm the user still wants to continue
    if (!success) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      })
      const q1answer = await rl.questionAsync(
        "There was an error when running the JavaScript source code for the request.\nContinue? (y) Yes / (n) No\n"
      )
      rl.close()
      if (q1answer.toLowerCase() !== "y" && q1answer.toLowerCase() !== "yes") {
        return
      }
    }

    // Check that the subscription is valid
    let subInfo
    try {
      subInfo = await registry.getSubscription(subscriptionId)
    } catch (error) {
      if (error.errorName === "InvalidSubscription") {
        throw Error(`Subscription ID "${subscriptionId}" is invalid or does not exist`)
      }
      throw error
    }
    // Validate the client contract has been authorized to use the subscription
    const existingConsumers = subInfo[2].map((addr) => addr.toLowerCase())
    if (!existingConsumers.includes(contractAddr.toLowerCase())) {
      throw Error(`Consumer contract ${contractAddr} is not registered to use subscription ${subscriptionId}`)
    }

    // Fetch the DON public key from on-chain
    const DONPublicKey = await oracle.getDONPublicKey()
    // Remove the preceeding 0x from the DON public key
    requestConfig.DONPublicKey = DONPublicKey.slice(2)
    // Build the parameters to make a request from the client contract
    const request = await buildRequest(requestConfig)

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
      `\nIf all ${gasLimit} callback gas is used, this request is estimated to cost ${hre.ethers.utils.formatUnits(
        estimatedCostJuels,
        18
      )} LINK`
    )
    // Ask for confirmation before initiating the request on-chain
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })
    let cont = false
    const q2answer = await rl.questionAsync("Continue? (y) Yes / (n) No\n")
    rl.close()
    if (q2answer.toLowerCase() !== "y" && q2answer.toLowerCase() !== "yes") {
      return
    }

    // Use a promise to wait & listen for the fulfillment event before returning
    await new Promise(async (resolve, reject) => {
      let requestId

      // Initate the listeners before making the request
      // Listen for fulfillment errors
      oracle.on("UserCallbackError", async (eventRequestId, msg) => {
        if (requestId == eventRequestId) {
          console.log("Error in client contract callback function")
          console.log(msg)
        }
      })
      oracle.on("UserCallbackRawError", async (eventRequestId, msg) => {
        if (requestId == eventRequestId) {
          console.log("Error in client contract callback function")
          console.log(Buffer.from(msg, "hex").toString())
        }
      })
      // Listen for successful fulfillment
      let billingEndEventRecieved = false
      let ocrResponseEventReceived = false
      clientContract.on("OCRResponse", async (result, err) => {
        console.log(`Request ${requestId} fulfilled!`)
        if (result !== "0x") {
          console.log(
            `Response returned to client contract represented as a hex string: ${result}\n${getDecodedResultLog(
              require("../../Functions-request-config"),
              result
            )}`
          )
        }
        if (err !== "0x") {
          console.log(`Error message returned to client contract: "${Buffer.from(err.slice(2), "hex")}"\n`)
        }
        ocrResponseEventReceived = true
        if (billingEndEventRecieved) {
          return resolve()
        }
      })
      // Listen for the BillingEnd event, log cost breakdown & resolve
      registry.on(
        "BillingEnd",
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
            console.log(`Transmission cost: ${hre.ethers.utils.formatUnits(eventTransmitterPayment, 18)} LINK`)
            console.log(`Base fee: ${hre.ethers.utils.formatUnits(eventSignerPayment, 18)} LINK`)
            console.log(`Total cost: ${hre.ethers.utils.formatUnits(eventTotalCost, 18)} LINK\n`)
            if (!eventSuccess) {
              console.log(
                "Error encountered when calling fulfillRequest in client contract.\n" +
                  "Ensure the fulfillRequest function in the client contract is correct and the --gaslimit is sufficent."
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
      // Initiate the on-chain request after all listeners are initalized
      console.log(`\nRequesting new data for FunctionsConsumer contract ${contractAddr} on network ${network.name}`)
      const requestTx = overrides
        ? await clientContract.executeRequest(
          request.source,
          request.secrets ?? [],
          request.args ?? [],
          subscriptionId,
          gasLimit,
          overrides,
        )
        : await clientContract.executeRequest(
          request.source,
          request.secrets ?? [],
          request.args ?? [],
          subscriptionId,
          gasLimit
        )
      // If a response is not received within 5 minutes, the request has failed
      setTimeout(
        () =>
          reject(
            "A response not received within 5 minutes of the request being initiated and has been canceled. Your subscription was not charged. Please make a new request."
          ),
        300_000
      )
      console.log(
        `Waiting ${VERIFICATION_BLOCK_CONFIRMATIONS} blocks for transaction ${requestTx.hash} to be confirmed...`
      )

      const requestTxReceipt = await requestTx.wait(VERIFICATION_BLOCK_CONFIRMATIONS)
      requestId = requestTxReceipt.events[2].args.id
      console.log(`\nRequest ${requestId} initiated`)
      console.log(`Waiting for fulfillment...\n`)
    })
  })
