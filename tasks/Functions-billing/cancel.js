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
    if (network.name == "hardhat") {
      throw Error("This command cannot be used on a local hardhat chain.  Specify a valid network.")
    }

    const subId = taskArgs.subid
    const refundAddress = taskArgs.refundAddress ?? (await ethers.getSigners())[0].address

    const signer = await ethers.getSigner()
    const linkTokenAddress = networks[network.name]["linkToken"]
    const functionsRouterAddress = networks[network.name]["functionsRouter"]
    const confirmations = networks[network.name].confirmations
    const txOptions = { confirmations }

    const sm = new SubscriptionManager({ signer, linkTokenAddress, functionsRouterAddress })
    await sm.initialize()

    await utils.prompt(
      `\nPlease confirm that you wish to cancel Subscription '${subId}' and have its LINK balance sent to wallet '${refundAddress}'?`
    )

    console.log(`Canceling subscription ${subId}`)
    const cancelTx = await sm.cancelSubscription({ subId, refundAddress, txOptions })
    console.log(`\nSubscription ${subId} cancelled in Tx: '${cancelTx.transactionHash}'.`)
  })
