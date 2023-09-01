const { SubscriptionManager } = require("@chainlink/functions-toolkit")
const { networks } = require("../../networks")

task("functions-sub-add", "Adds a client contract to the Functions billing subscription")
  .addParam("subid", "Subscription ID")
  .addParam("contract", "Address of the Functions client contract to authorize for billing")
  .setAction(async (taskArgs) => {
    if (network.name == "hardhat") {
      throw Error("This command cannot be used on a local hardhat chain.  Specify a valid network.")
    }

    const { subid: subId, contract: consumerAddress } = taskArgs

    const signer = await ethers.getSigner()
    const linkTokenAddress = networks[network.name]["linkToken"]
    const functionsRouterAddress = networks[network.name]["functionsRouter"]
    const txOptions = { confirmations: networks[network.name].confirmations }

    const sm = new SubscriptionManager({ signer, linkTokenAddress, functionsRouterAddress })
    await sm.initialize()

    console.log(`\nAdding ${consumerAddress} to subscription ${subId}...`)
    const addConsumerTx = await sm.addConsumer({ subId, consumerAddress, txOptions })
    console.log(`Added consumer contract ${consumerAddress} in Tx: ${addConsumerTx.transactionHash}`)
  })
