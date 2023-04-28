const { networks } = require("../../networks")

task(
  "functions-set-oracle-addr",
  "Updates the oracle address for a FunctionsConsumer client contract using the FunctionsOracle address from `network-config.js`"
)
  .addParam("contract", "Address of the client contract to update")
  .setAction(async (taskArgs) => {
    if (network.name === "hardhat") {
      throw Error("This command cannot be used on a local hardhat chain.  Specify a valid network.")
    }

    console.log(
      `Setting oracle address to ${networks[network.name]["functionsOracleProxy"]} Functions client contract ${
        taskArgs.contract
      } on ${network.name}`
    )
    const clientContractFactory = await ethers.getContractFactory("FunctionsConsumer")
    const clientContract = await clientContractFactory.attach(taskArgs.contract)

    const updateTx = await clientContract.updateOracleAddress(networks[network.name]["functionsOracleProxy"])

    console.log(
      `\nWaiting ${networks[network.name].confirmations} blocks for transaction ${updateTx.hash} to be confirmed...`
    )
    await updateTx.wait(networks[network.name].confirmations)

    console.log(
      `\nUpdated oracle address to ${networks[network.name]["functionsOracleProxy"]} for Functions client contract ${
        taskArgs.contract
      } on ${network.name}`
    )
  })
