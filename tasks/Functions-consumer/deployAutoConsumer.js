const { types } = require("hardhat/config")
const { networks } = require("../../networks")

task("functions-deploy-auto-consumer", "Deploys the AutomatedFunctionsConsumer contract")
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
  .setAction(async (taskArgs) => {
    console.log("\n__Compiling Contracts__")
    await run("compile")

    const functionsRouterAddress = networks[network.name]["functionsRouter"]
    const donId = networks[network.name]["donId"]
    const donIdBytes32 = hre.ethers.utils.formatBytes32String(donId)
    const confirmationBlocks = networks[network.name].confirmations

    console.log(`Deploying AutomatedFunctionsConsumer contract to ${network.name}`)
    const autoConsumerContractFactory = await ethers.getContractFactory("AutomatedFunctionsConsumer")
    const autoConsumerContract = await autoConsumerContractFactory.deploy(functionsRouterAddress, donIdBytes32)

    console.log(
      `\nWaiting ${confirmationBlocks} blocks for transaction ${autoConsumerContract.deployTransaction.hash} to be confirmed...`
    )
    await autoConsumerContract.deployTransaction.wait(confirmationBlocks)

    const consumerAddress = autoConsumerContract.address

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
        "\nPOLYGONSCAN_API_KEY, ETHERSCAN_API_KEY or SNOWTRACE_API_KEY is missing. Skipping contract verification..."
      )
    }

    console.log(`\nAutomatedFunctionsConsumer contract deployed to ${consumerAddress} on ${network.name}`)
  })
