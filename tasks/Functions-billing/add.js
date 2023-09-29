const { SubscriptionManager } = require("@chainlink/functions-toolkit")
const { networks } = require("../../networks")

task("functions-sub-add", "Adds a consumer contract to the Functions billing subscription")
  .addParam("subid", "Subscription ID")
  .addParam("contract", "Address of the Functions consumer contract to authorize for billing")
  .setAction(async (taskArgs) => {
    const consumerAddress = taskArgs.contract
    const subscriptionId = parseInt(taskArgs.subid)

    const signer = await ethers.getSigner()
    const linkTokenAddress = networks[network.name]["linkToken"]
    const functionsRouterAddress = networks[network.name]["functionsRouter"]
    const txOptions = { confirmations: networks[network.name].confirmations }

    const sm = new SubscriptionManager({ signer, linkTokenAddress, functionsRouterAddress })
    await sm.initialize()

    console.log(`\nAdding ${consumerAddress} to subscription ${subscriptionId}...`)
    const addConsumerTx = await sm.addConsumer({ subscriptionId, consumerAddress, txOptions })
    console.log(`Added consumer contract ${consumerAddress} in Tx: ${addConsumerTx.transactionHash}`)
  })
