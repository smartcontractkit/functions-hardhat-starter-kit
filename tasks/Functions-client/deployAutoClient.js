const { types } = require("hardhat/config")
const { networks } = require("../../networks")
const { addClientConsumerToSubscription } = require("../Functions-billing/add")
const { setAutoRequest } = require("./setAutoRequest")

task("functions-deploy-auto-client", "Deploys the AutomatedFunctionsConsumer contract")
  .addParam("subid", "Billing subscription ID used to pay for Functions requests")
  .addOptionalParam("interval", "Update interval in seconds for Automation to call performUpkeep", 300, types.int)
  .addOptionalParam("verify", "Set to true to verify client contract", false, types.boolean)
  .addOptionalParam(
    "gaslimit",
    "Maximum amount of gas that can be used to call fulfillRequest in the client contract",
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
    if (network.name === "hardhat") {
      throw Error(
        'This command cannot be used on a local hardhat chain.  Specify a valid network or simulate an FunctionsConsumer request locally with "npx hardhat functions-simulate".'
      )
    }

    if (taskArgs.gaslimit > 300000) {
      throw Error("Gas limit must be less than or equal to 300,000")
    }

    console.log(`Deploying AutomatedFunctionsConsumer contract to ${network.name}`)

    console.log("\n__Compiling Contracts__")
    await run("compile")

    const autoClientContractFactory = await ethers.getContractFactory("AutomatedFunctionsConsumer")
    const autoClientContract = await autoClientContractFactory.deploy(
      networks[network.name]["functionsOracleProxy"],
      taskArgs.subid,
      taskArgs.gaslimit,
      taskArgs.interval
    )

    console.log(`\nWaiting 1 block for transaction ${autoClientContract.deployTransaction.hash} to be confirmed...`)
    await autoClientContract.deployTransaction.wait(1)

    await addClientConsumerToSubscription(taskArgs.subid, autoClientContract.address)

    taskArgs.contract = autoClientContract.address

    await setAutoRequest(autoClientContract.address, taskArgs)

    const verifyContract = taskArgs.verify

    if (verifyContract && !!networks[network.name].verifyApiKey && networks[network.name].verifyApiKey !== "UNSET") {
      try {
        console.log("\nVerifying contract...")
        await autoClientContract.deployTransaction.wait(Math.max(6 - networks[network.name].confirmations, 0))
        await run("verify:verify", {
          address: autoClientContract.address,
          constructorArguments: [
            networks[network.name]["functionsOracleProxy"],
            taskArgs.subid,
            taskArgs.gaslimit,
            taskArgs.interval,
          ],
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

    console.log(`\nAutomatedFunctionsConsumer contract deployed to ${autoClientContract.address} on ${network.name}`)
  })
