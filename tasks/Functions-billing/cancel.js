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
      `\nPlease confirm that you wish to cancel Subscription ${subscriptionId} and have its LINK balance sent to wallet ${refundAddress}.\nNote that a portion of the LINK balance will be deducted if a minimum number of requests were not performed with the subscription.\nRead the documentation for more details: https://docs.chain.link/chainlink-functions/resources/billing#withdrawing-funds`
    )

    console.log(`Canceling subscription ${subscriptionId}`)
    let cancelTx
    try {
      cancelTx = await sm.cancelSubscription({ subscriptionId, refundAddress, txOptions })
    } catch (error) {
      console.log(
        "Error cancelling subscription. Please ensure there are no pending requests or stale requests which have not been timed out before attempting to cancel."
      )
      throw error
    }
    console.log(`\nSubscription ${subscriptionId} cancelled in Tx: ${cancelTx.transactionHash}`)
  })
