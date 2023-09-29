const { SubscriptionManager } = require("@chainlink/functions-toolkit")

const utils = require("../utils")
const { networks } = require("../../networks")

task(
  "functions-sub-cancel",
  "Cancels Functions billing subscription and refunds unused balance. Cancellation is only possible if there are no pending requests"
)
  .addParam("subid", "Subscription ID to cancel")
  .addOptionalParam(
    "refundaddress",
    "Address where the remaining subscription balance is sent (defaults to caller's address)"
  )
  .setAction(async (taskArgs) => {
    const subscriptionId = parseInt(taskArgs.subid)
    const refundAddress = taskArgs.refundaddress ?? (await ethers.getSigners())[0].address

    const signer = await ethers.getSigner()
    const linkTokenAddress = networks[network.name]["linkToken"]
    const functionsRouterAddress = networks[network.name]["functionsRouter"]
    const confirmations = networks[network.name].confirmations
    const txOptions = { confirmations }

    const sm = new SubscriptionManager({ signer, linkTokenAddress, functionsRouterAddress })
    await sm.initialize()

    await utils.prompt(
      `\nPlease confirm that you wish to cancel Subscription ${subscriptionId} and have its LINK balance sent to wallet ${refundAddress}.`
    )

    console.log(`Canceling subscription ${subscriptionId}`)
    const cancelTx = await sm.cancelSubscription({ subscriptionId, refundAddress, txOptions })
    console.log(`\nSubscription ${subscriptionId} cancelled in Tx: ${cancelTx.transactionHash}`)
  })
