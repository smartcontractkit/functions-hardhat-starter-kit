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

    if (network.name === "hardhat") {
      throw Error(
        'This command cannot be used on a local hardhat chain.  Specify a valid network or simulate an FunctionsConsumer request locally with "npx hardhat functions-simulate".'
      )
    }

    const performData = taskArgs.data ?? []

    console.log(
      `Calling performUpkeep for Automation client contract ${taskArgs.contract} on network ${network.name}${
        taskArgs.data ? ` with data ${performData}` : ""
      }`
    )
    const autoClientContractFactory = await ethers.getContractFactory("AutomatedFunctionsConsumer")
    const autoClientContract = await autoClientContractFactory.attach(taskArgs.contract)

    const checkUpkeep = await autoClientContract.performUpkeep(performData, overrides)

    console.log(
      `Waiting ${networks[network.name].confirmations} blocks for transaction ${checkUpkeep.hash} to be confirmed...`
    )
    await checkUpkeep.wait(networks[network.name].confirmations)

    console.log(`\nSuccessfully called performUpkeep`)
  })
