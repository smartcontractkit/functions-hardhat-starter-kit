const { SubscriptionManager } = require("@chainlink/functions-toolkit")
const { networks } = require("../../networks")

task(
  "functions-sub-info",
  "Gets the Functions billing subscription balance, owner, and list of authorized consumer contract addresses"
)
  .addParam("subid", "Subscription ID")
  .setAction(async (taskArgs) => {
    if (network.name === "hardhat") {
      throw Error("This command cannot be used on a local hardhat chain.  Specify a valid network.")
    }

    const subId = taskArgs.subid

    const signer = await ethers.getSigner()
    const linkTokenAddress = networks[network.name]["linkToken"]
    const functionsRouterAddress = networks[network.name]["functionsRouter"]

    const sm = new SubscriptionManager({ signer, linkTokenAddress, functionsRouterAddress })
    await sm.initialize()

    const subInfo = await sm.getSubscriptionInfo(subId)
    // parse balances into LINK for readability
    subInfo.balance = ethers.utils.formatEther(subInfo.balance) + " LINK"
    subInfo.blockedBalance = ethers.utils.formatEther(subInfo.blockedBalance) + " LINK"
    console.log(`\nInfo for subscription '${subId}': `, subInfo)
  })
