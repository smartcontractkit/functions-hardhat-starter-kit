const { SubscriptionManager, buildRequestCBOR } = require("@chainlink/functions-toolkit")

const { types } = require("hardhat/config")
const { networks } = require("../../networks")
const { setAutoRequest } = require("./setAutoRequest")

task("functions-deploy-auto-client", "Deploys the AutomatedFunctionsConsumer contract")
  .addParam("subid", "Billing subscription ID used to pay for Functions requests")
  .addOptionalParam("verify", "Set to true to verify client contract", false, types.boolean)
  .addOptionalParam(
    "gaslimit",
    "Maximum amount of gas to call fulfillRequest in the client contract (defaults to 250000)",
    250000,
    types.int
  )
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
  .setAction(async (taskArgs) => {
    console.log("\n__Compiling Contracts__")
    await run("compile")

    const functionsRouterAddress = networks[network.name]["functionsRouter"]
    const donId = networks[network.name]["donId"]
    const donIdBytes32 = hre.ethers.utils.formatBytes32String(donId)
    const signer = await ethers.getSigner()
    const linkTokenAddress = networks[network.name]["linkToken"]
    const txOptions = { confirmations: networks[network.name].confirmations }

    const subscriptionId = taskArgs.subid
    const callbackGasLimit = taskArgs.gaslimit

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
    const autoClientContractFactory = await ethers.getContractFactory("AutomatedFunctionsConsumer")
    const autoClientContract = await autoClientContractFactory.deploy(
      functionsRouterAddress,
      donIdBytes32,
      callbackGasLimit
    )

    console.log(`\nWaiting 1 block for transaction ${autoClientContract.deployTransaction.hash} to be confirmed...`)
    await autoClientContract.deployTransaction.wait(1)

    const consumerAddress = autoClientContract.address

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
        await autoClientContract.deployTransaction.wait(Math.max(6 - networks[network.name].confirmations, 0))
        await run("verify:verify", {
          address: consumerAddress,
          constructorArguments: [functionsRouterAddress, donIdBytes32, callbackGasLimit],
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
    } else if (verifyContract) {
      console.log(
        "\nPOLYGONSCAN_API_KEY, ETHERSCAN_API_KEY or SNOWTRACE_API_KEY is missing. Skipping contract verification..."
      )
    }

    console.log(`\nAutomatedFunctionsConsumer contract deployed to ${consumerAddress} on ${network.name}`)
  })
