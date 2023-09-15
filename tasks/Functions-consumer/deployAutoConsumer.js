const { SubscriptionManager, buildRequestCBOR } = require("@chainlink/functions-toolkit")

const { types } = require("hardhat/config")
const { networks } = require("../../networks")
const { setAutoRequest } = require("./setAutoRequest")

task("functions-deploy-auto-consumer", "Deploys the AutomatedFunctionsConsumer contract")
  .addParam("subid", "Billing subscription ID used to pay for Functions requests")
  .addOptionalParam("verify", "Set to true to verify consumer contract", false, types.boolean)
  .addOptionalParam(
    "simulate",
    "Flag indicating if simulation should be run before making an on-chain request",
    true,
    types.boolean
  )
  .addOptionalParam(
    "configpath",
    "Path to Functions request config file",
    `${__dirname}/../../Functions-request-config.js`,
    types.string
  )
  .addOptionalParam(
    "gaslimit",
    "Maximum amount of gas that can be used to call fulfillRequest in the consumer contract (only used to estimate Functions request cost)",
    250000,
    types.int
  )
  .setAction(async (taskArgs) => {
    console.log("\n__Compiling Contracts__")
    await run("compile")

    const callbackGasLimit = taskArgs.gaslimit
    const functionsRouterAddress = networks[network.name]["functionsRouter"]
    const donId = networks[network.name]["donId"]
    const donIdBytes32 = hre.ethers.utils.formatBytes32String(donId)
    const signer = await ethers.getSigner()
    const linkTokenAddress = networks[network.name]["linkToken"]
    const txOptions = { confirmations: networks[network.name].confirmations }

    const subscriptionId = taskArgs.subid

    // Initialize SubscriptionManager
    const subManager = new SubscriptionManager({ signer, linkTokenAddress, functionsRouterAddress })
    await subManager.initialize()

    // Validate callbackGasLimit
    const { gasPrice } = await hre.ethers.provider.getFeeData()
    const gasPriceWei = BigInt(Math.ceil(hre.ethers.utils.formatUnits(gasPrice, "wei").toString()))
    await subManager.estimateFunctionsRequestCost({
      donId,
      subscriptionId,
      callbackGasLimit,
      gasPriceWei,
    })

    console.log(`Deploying AutomatedFunctionsConsumer contract to ${network.name}`)
    const autoConsumerContractFactory = await ethers.getContractFactory("AutomatedFunctionsConsumer")
    const autoConsumerContract = await autoConsumerContractFactory.deploy(functionsRouterAddress, donIdBytes32)

    console.log(`\nWaiting 1 block for transaction ${autoConsumerContract.deployTransaction.hash} to be confirmed...`)
    await autoConsumerContract.deployTransaction.wait(1)

    const consumerAddress = autoConsumerContract.address

    console.log(`\nAdding ${consumerAddress} to subscription ${subscriptionId}...`)
    const addConsumerTx = await subManager.addConsumer({ subscriptionId, consumerAddress, txOptions })
    console.log(`\nAdded consumer contract ${consumerAddress} in Tx: ${addConsumerTx.transactionHash}`)

    const verifyContract = taskArgs.verify
    if (
      network.name !== "localFunctionsTestnet" &&
      verifyContract &&
      !!networks[network.name].verifyApiKey &&
      networks[network.name].verifyApiKey !== "UNSET"
    ) {
      try {
        console.log(`\nVerifying contract ${consumerAddress}...`)
        await autoConsumerContract.deployTransaction.wait(Math.max(6 - networks[network.name].confirmations, 0))
        await run("verify:verify", {
          address: consumerAddress,
          constructorArguments: [functionsRouterAddress, donIdBytes32],
        })
        console.log("Contract verified")
      } catch (error) {
        if (!error.message.includes("Already Verified")) {
          console.log("Error verifying contract.  Delete the build folder and try again.")
          console.log(error)
        } else {
          console.log("Contract already verified")
        }
      }
    } else if (verifyContract && network.name !== "localFunctionsTestnet") {
      console.log(
        "\nPOLYGONSCAN_API_KEY, ETHERSCAN_API_KEY or FUJI_SNOWTRACE_API_KEY is missing. Skipping contract verification..."
      )
    }

    console.log(`\nAutomatedFunctionsConsumer contract deployed to ${consumerAddress} on ${network.name}`)
  })
