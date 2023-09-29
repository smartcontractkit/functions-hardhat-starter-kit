const { SubscriptionManager } = require("@chainlink/functions-toolkit")
const chalk = require("chalk")
const { networks } = require("../../networks")
const utils = require("../utils")

task("functions-sub-fund", "Funds a billing subscription for Functions consumer contracts")
  .addParam("amount", "Amount to fund subscription in LINK")
  .addParam("subid", "Subscription ID to fund")
  .setAction(async (taskArgs) => {
    const signer = await ethers.getSigner()
    const linkTokenAddress = networks[network.name]["linkToken"]
    const functionsRouterAddress = networks[network.name]["functionsRouter"]
    const txOptions = { confirmations: networks[network.name].confirmations }

    const subscriptionId = parseInt(taskArgs.subid)
    const linkAmount = taskArgs.amount
    const juelsAmount = ethers.utils.parseUnits(linkAmount, 18).toString()

    const sm = new SubscriptionManager({ signer, linkTokenAddress, functionsRouterAddress })
    await sm.initialize()

    await utils.prompt(
      `\nPlease confirm that you wish to fund Subscription ${subscriptionId} with ${chalk.blue(
        linkAmount + " LINK"
      )} from your wallet.`
    )

    console.log(`\nFunding subscription ${subscriptionId} with ${linkAmount} LINK...`)

    const fundTxReceipt = await sm.fundSubscription({ juelsAmount, subscriptionId, txOptions })
    console.log(
      `\nSubscription ${subscriptionId} funded with ${linkAmount} LINK in Tx: ${fundTxReceipt.transactionHash}`
    )

    const subInfo = await sm.getSubscriptionInfo(subscriptionId)

    // parse balances into LINK for readability
    subInfo.balance = ethers.utils.formatEther(subInfo.balance) + " LINK"
    subInfo.blockedBalance = ethers.utils.formatEther(subInfo.blockedBalance) + " LINK"

    console.log("\nUpdated subscription Info: ", subInfo)
  })
