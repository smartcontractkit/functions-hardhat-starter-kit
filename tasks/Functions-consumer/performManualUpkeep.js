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

    const autoConsumerContractFactory = await ethers.getContractFactory("AutomatedFunctionsConsumer")
    const autoConsumerContract = await autoConsumerContractFactory.attach(taskArgs.contract)

    console.log(
      `\nCalling performUpkeep for Automation consumer contract ${taskArgs.contract} on network ${network.name}${
        taskArgs.data ? ` with data ${performData}` : ""
      }`
    )
    const performUpkeepTx = await autoConsumerContract.performUpkeep(performData, overrides)

    console.log(
      `\nWaiting ${networks[network.name].confirmations} blocks for transaction ${
        performUpkeepTx.hash
      } to be confirmed...`
    )
    const events = (await performUpkeepTx.wait(networks[network.name].confirmations)).events

    const requestRevertedWithErrorMsg = events.find((e) => e.event === "RequestRevertedWithErrorMsg")
    if (requestRevertedWithErrorMsg) {
      console.log(`\nRequest reverted with error message: ${requestRevertedWithErrorMsg.args.reason}`)
      return
    }

    const requestRevertedWithoutErrorMsg = events.find((e) => e.event === "RequestRevertedWithoutErrorMsg")
    if (requestRevertedWithoutErrorMsg) {
      console.log(
        `\nRequest reverted without error message. Ensure your request has been set correctly, the subscription is funded and the consumer contract is authorized.\n(Raw data: ${requestRevertedWithoutErrorMsg.data})`
      )
      return
    }

    const reqId = await autoConsumerContract.s_lastRequestId()
    console.log("\nLast request ID received by the Automation Consumer Contract...", reqId)
  })
