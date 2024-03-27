const { SubscriptionManager } = require("@chainlink/functions-toolkit")
const chalk = require("chalk")
const { networks } = require("../../networks")
const utils = require("../utils")

task("functions-sub-create", "Creates a new billing subscription for Functions consumer contracts")
  .addOptionalParam("amount", "Initial amount used to fund the subscription in LINK")
  .addOptionalParam(
    "contract",
    "Address of the consumer contract address authorized to use the new billing subscription"
  )
  .setAction(async (taskArgs) => {
    const signer = await ethers.getSigner()
    const functionsRouterAddress = networks[network.name]["functionsRouter"]
    const linkTokenAddress = networks[network.name]["linkToken"]

    const linkAmount = taskArgs.amount
    const confirmations = linkAmount > 0 ? networks[network.name].confirmations : 1
    const consumerAddress = taskArgs.contract
    const txOptions = {
      confirmations,
      overrides: {
        gasPrice: networks[network.name].gasPrice,
      },
    }

    const sm = new SubscriptionManager({ signer, linkTokenAddress, functionsRouterAddress })
    await sm.initialize()

    console.log("\nCreating Functions billing subscription...")
    const subscriptionId = await sm.createSubscription({ consumerAddress, txOptions })
    console.log(`\nCreated Functions billing subscription: ${subscriptionId}`)

    // Fund subscription
    if (linkAmount) {
      await utils.prompt(
        `\nPlease confirm that you wish to fund Subscription ${subscriptionId} with ${chalk.blue(
          linkAmount + " LINK"
        )} from your wallet.`
      )

      console.log(`\nFunding subscription ${subscriptionId} with ${linkAmount} LINK...`)
      const juelsAmount = ethers.utils.parseUnits(linkAmount, 18).toString()
      const fundTxReceipt = await sm.fundSubscription({ juelsAmount, subscriptionId, txOptions })
      console.log(
        `\nSubscription ${subscriptionId} funded with ${linkAmount} LINK in Tx: ${fundTxReceipt.transactionHash}`
      )

      const subInfo = await sm.getSubscriptionInfo(subscriptionId)
      // parse  balances into LINK for readability
      subInfo.balance = ethers.utils.formatEther(subInfo.balance) + " LINK"
      subInfo.blockedBalance = ethers.utils.formatEther(subInfo.blockedBalance) + " LINK"

      console.log("\nSubscription Info: ", subInfo)
    }
  })
