const { networks } = require("../../networks")
const { SubscriptionManager } = require("@chainlink/functions-toolkit")

task("functions-sub-remove", "Removes a consumer contract from an Functions billing subscription")
  .addParam("subid", "Subscription ID")
  .addParam("contract", "Address of the consumer contract to remove from billing subscription")
  .setAction(async (taskArgs) => {
    const signer = await ethers.getSigner()
    const functionsRouterAddress = networks[network.name]["functionsRouter"]
    const linkTokenAddress = networks[network.name]["linkToken"]

    const consumerAddress = taskArgs.contract
    const subscriptionId = parseInt(taskArgs.subid)
    const confirmations = networks[network.name].confirmations
    const txOptions = { confirmations }

    const sm = new SubscriptionManager({ signer, linkTokenAddress, functionsRouterAddress })
    await sm.initialize()

    console.log(`\nRemoving ${consumerAddress} from subscription ${subscriptionId}...`)
    let removeConsumerTx = await sm.removeConsumer({ subscriptionId, consumerAddress, txOptions })

    const subInfo = await sm.getSubscriptionInfo(subscriptionId)
    // parse balances into LINK for readability
    subInfo.balance = ethers.utils.formatEther(subInfo.balance) + " LINK"
    subInfo.blockedBalance = ethers.utils.formatEther(subInfo.blockedBalance) + " LINK"
    console.log(
      `\nRemoved ${consumerAddress} from subscription ${subscriptionId} in Tx: ${removeConsumerTx.transactionHash}\nUpdated Subscription Info:\n`,
      subInfo
    )
  })
