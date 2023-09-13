const { networks } = require("../../networks")

task(
  "functions-set-donid",
  "Updates the oracle address for a FunctionsConsumer consumer contract using the FunctionsOracle address from `network-config.js`"
)
  .addParam("contract", "Address of the consumer contract to update")
  .setAction(async (taskArgs) => {
    const donId = networks[network.name]["donId"]
    console.log(`Setting donId to ${donId} in Functions consumer contract ${taskArgs.contract} on ${network.name}`)
    const consumerContractFactory = await ethers.getContractFactory("FunctionsConsumer")
    const consumerContract = await consumerContractFactory.attach(taskArgs.contract)

    const donIdBytes32 = hre.ethers.utils.formatBytes32String(donId)
    const updateTx = await consumerContract.setDonId(donIdBytes32)

    console.log(
      `\nWaiting ${networks[network.name].confirmations} blocks for transaction ${updateTx.hash} to be confirmed...`
    )
    await updateTx.wait(networks[network.name].confirmations)

    console.log(`\nUpdated donId to ${donId} for Functions consumer contract ${taskArgs.contract} on ${network.name}`)
  })
