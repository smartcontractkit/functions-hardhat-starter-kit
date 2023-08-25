const { networks } = require("../../networks")
const { SubscriptionManager } = require("@chainlink/functions-toolkit")

task("functions-sub-remove", "Removes a client contract from an Functions billing subscription")
  .addParam("subid", "Subscription ID")
  .addParam("contract", "Address of the client contract to remove from billing subscription")
  .setAction(async (taskArgs) => {
    if (network.name === "hardhat") {
      throw Error(
        'This command cannot be used on a local hardhat chain.  Please specify a valid network or simulate an FunctionsConsumer request locally with "npx hardhat functions-simulate".'
      )
    }

    const signer = await ethers.getSigner()
    const functionsRouterAddress = networks[network.name]["functionsRouter"]
    const linkTokenAddress = networks[network.name]["linkToken"]

    const consumerAddress = taskArgs.contract
    const subId = taskArgs.subid
    const confirmations = networks[network.name].confirmations
    const txOptions = { confirmations }

    const sm = new SubscriptionManager({ signer, linkTokenAddress, functionsRouterAddress })
    await sm.initialize()

    console.log(`\nRemoving '${consumerAddress}' from subscription '${subId}'...`)
    let removeConsumerTx = await sm.removeConsumer({ subId, consumerAddress, txOptions })

    const subInfo = await sm.getSubscriptionInfo(subId)
    console.log(
      `\nRemoved '${consumerAddress}' from subscription '${subId}' in Tx: '${removeConsumerTx.transactionHash}'.  \nUpdated Subscription Info:\n`,
      subInfo
    )
  })
