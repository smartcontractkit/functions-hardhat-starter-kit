const { VERIFICATION_BLOCK_CONFIRMATIONS } = require("../../network-config")

task("functions-declare-winner", "Declare the winner of the Google Analytics vote demo")
  .addParam("contract", "Address of the contract to call")
  .setAction(async (taskArgs) => {
    if (network.name === "hardhat") {
      throw Error(
        'This command cannot be used on a local hardhat chain.  Specify a valid network or simulate an FunctionsConsumer request locally with "npx hardhat functions-simulate".'
      )
    }

    const autoClientContractFactory = await ethers.getContractFactory("AutomatedFunctionsConsumer")
    const autoClientContract = await autoClientContractFactory.attach(taskArgs.contract)

    const declareWinnerTx = await autoClientContract.declareWinner()

    const declareWinnerTxResult = await declareWinnerTx.wait(1)

    console.log(`\n${declareWinnerTxResult.events[0].args.winner}`)
  })
