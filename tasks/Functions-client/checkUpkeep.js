task("functions-check-upkeep", "Checks if checkUpkeep returns true for an Automation compatible contract")
  .addParam("contract", "Address of the contract to check")
  .addOptionalParam(
    "data",
    "Hex string representing bytes that are passed to the checkUpkeep function (defaults to empty bytes)"
  )
  .setAction(async (taskArgs) => {
    if (network.name === "hardhat") {
      throw Error(
        'This command cannot be used on a local hardhat chain.  Specify a valid network or simulate an FunctionsConsumer request locally with "npx hardhat functions-simulate".'
      )
    }

    const checkData = taskArgs.data ?? []

    console.log(
      `Checking if upkeep is required for Automation client contract ${taskArgs.contract} on network ${network.name}`
    )
    const autoClientContractFactory = await ethers.getContractFactory("AutomatedFunctionsConsumer")
    const autoClientContract = await autoClientContractFactory.attach(taskArgs.contract)

    const checkUpkeep = await autoClientContract.checkUpkeep(checkData)

    console.log(`\nUpkeep needed: ${checkUpkeep[0]}\nPerform data: ${checkUpkeep[1]}`)
  })
