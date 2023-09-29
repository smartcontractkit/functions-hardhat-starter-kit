task("functions-check-upkeep", "Checks if checkUpkeep returns true for an Automation compatible contract")
  .addParam("contract", "Address of the contract to check")
  .addOptionalParam(
    "data",
    "Hex string representing bytes that are passed to the checkUpkeep function (defaults to empty bytes)"
  )
  .setAction(async (taskArgs) => {
    const checkData = taskArgs.data ?? []

    console.log(
      `Checking if upkeep is required for Automation consumer contract ${taskArgs.contract} on network ${network.name}`
    )
    const autoConsumerContractFactory = await ethers.getContractFactory("AutomatedFunctionsConsumer")
    const autoConsumerContract = await autoConsumerContractFactory.attach(taskArgs.contract)

    const checkUpkeep = await autoConsumerContract.checkUpkeep(checkData)

    console.log(`\nUpkeep needed: ${checkUpkeep[0]}\nPerform data: ${checkUpkeep[1]}`)
  })
