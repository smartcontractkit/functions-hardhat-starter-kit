const { SubscriptionManager } = require("@chainlink/functions-toolkit")

const { networks } = require("../../networks")
const utils = require("../utils")

task("functions-sub-create", "Creates a new billing subscription for Functions consumer contracts")
  .addOptionalParam("amount", "Initial amount used to fund the subscription in LINK")
  .addOptionalParam("contract", "Address of the client contract address authorized to use the new billing subscription")
  .setAction(async (taskArgs) => {
    if (network.name === "hardhat") {
      throw Error(
        'This command cannot be used on a local hardhat chain.  Specify a valid network or simulate a request locally with "npx hardhat functions-simulate".'
      )
    }

    const signer = await ethers.getSigner()
    const functionsRouterAddress = networks[network.name]["functionsRouter"]
    const linkTokenAddress = networks[network.name]["linkToken"]

    const linkAmount = taskArgs.amount
    const confirmations = linkAmount > 0 ? networks[network.name].confirmations : 1
    const consumerAddress = taskArgs.contract
    const txOptions = { confirmations }

    const sm = new SubscriptionManager({ signer, linkTokenAddress, functionsRouterAddress })
    await sm.initialize()

    console.log("\nCreating Functions billing subscription...")
    const subId = await sm.createSubscription({ consumerAddress, txOptions })
    console.log(`\nCreated Functions billing subscription: '${subId}'`)

    // Fund subscription
    if (linkAmount) {
      await utils.prompt(
        `\nPlease confirm that you wish to fund Subscription '${subId}' with '${linkAmount}' LINK from your wallet.'`
      )

      console.log(`\nFunding subscription '${subId}' with '${linkAmount}' LINK...`)

      const fundTxReceipt = await sm.fundSubscription({ linkAmount, subId, txOptions })
      console.log(
        `\nSubscription '${subId}' funded with '${linkAmount}' LINK in Tx: ''${fundTxReceipt.transactionHash}'`
      )

      const subInfo = await sm.getSubscriptionInfo(subId)
      console.log("\nSubscription Info: ", subInfo)
    }
  })
