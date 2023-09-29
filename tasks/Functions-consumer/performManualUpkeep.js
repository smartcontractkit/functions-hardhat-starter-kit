const { networks } = require("../../networks")

task("functions-perform-upkeep", "Manually call performUpkeep in an Automation compatible contract")
  .addParam("contract", "Address of the contract to call")
  .addOptionalParam(
    "data",
    "Hex string representing bytes that are passed to the performUpkeep function (defaults to empty bytes)"
  )
  .setAction(async (taskArgs) => {
    // A manual gas limit is required as the gas limit estimated by Ethers is not always accurate
    const overrides = {
      gasLimit: 1000000,
      gasPrice: networks[network.name].gasPrice,
    }

    // Call performUpkeep
    const performData = taskArgs.data ?? []

    console.log(
      `Calling performUpkeep for Automation consumer contract ${taskArgs.contract} on network ${network.name}${
        taskArgs.data ? ` with data ${performData}` : ""
      }`
    )
    const autoConsumerContractFactory = await ethers.getContractFactory("AutomatedFunctionsConsumer")
    const autoConsumerContract = await autoConsumerContractFactory.attach(taskArgs.contract)

    const checkUpkeep = await autoConsumerContract.performUpkeep(performData, overrides)

    console.log(
      `Waiting ${networks[network.name].confirmations} blocks for transaction ${checkUpkeep.hash} to be confirmed...`
    )
    await checkUpkeep.wait(networks[network.name].confirmations)

    console.log(`\nSuccessfully called performUpkeep`)

    const reqId = await autoConsumerContract.s_lastRequestId()
    console.log("\nLast request ID received by the Automation Consumer Contract...", reqId)
  })
