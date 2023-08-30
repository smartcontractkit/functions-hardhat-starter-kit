const { SubscriptionManager } = require("@chainlink/functions-toolkit")

const { networks } = require("../../networks")
const utils = require("../utils")

task("functions-sub-fund", "Funds a billing subscription for Functions consumer contracts")
  .addParam("amount", "Amount to fund subscription in LINK")
  .addParam("subid", "Subscription ID to fund")
  .setAction(async (taskArgs) => {
    if (network.name === "hardhat") {
      throw Error("This command cannot be used on a local hardhat chain.  Specify a valid network.")
    }

    const signer = await ethers.getSigner()
    const linkTokenAddress = networks[network.name]["linkToken"]
    const functionsRouterAddress = networks[network.name]["functionsRouter"]
    const txOptions = { confirmations: networks[network.name].confirmations }

    const subId = taskArgs.subid
    const linkAmount = taskArgs.amount
    const juelsAmount = ethers.utils.parseUnits(linkAmount, 18)

    const sm = new SubscriptionManager({ signer, linkTokenAddress, functionsRouterAddress })
    await sm.initialize()

    await utils.prompt(
      `\nPlease confirm that you wish to fund Subscription ${subId} with ${linkAmount} LINK from your wallet.`
    )

    console.log(`\nFunding subscription ${subId} with ${linkAmount} LINK...`)

    const fundTxReceipt = await sm.fundSubscription({ juelsAmount, subId, txOptions })
    console.log(`\nSubscription ${subId} funded with ${linkAmount} LINK in Tx: ${fundTxReceipt.transactionHash}`)

    const subInfo = await sm.getSubscriptionInfo(subId)

    // parse balances into LINK for readability
    subInfo.balance = ethers.utils.formatEther(subInfo.balance) + " LINK"
    subInfo.blockedBalance = ethers.utils.formatEther(subInfo.blockedBalance) + " LINK"

    console.log("\nUpdated subscription Info: ", subInfo)
  })
