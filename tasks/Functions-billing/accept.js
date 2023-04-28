const { networks } = require("../../networks")

task("functions-sub-accept", "Accepts ownership of an Functions subscription after a transfer is requested")
  .addParam("subid", "Subscription ID")
  .setAction(async (taskArgs) => {
    if (network.name === "hardhat") {
      throw Error("This command cannot be used on a local hardhat chain.  Specify a valid network.")
    }

    const subscriptionId = taskArgs.subid

    const RegistryFactory = await ethers.getContractFactory(
      "contracts/dev/functions/FunctionsBillingRegistry.sol:FunctionsBillingRegistry"
    )
    const registry = await RegistryFactory.attach(networks[network.name]["functionsBillingRegistryProxy"])

    // Check that the subscription is valid
    let preSubInfo
    try {
      preSubInfo = await registry.getSubscription(subscriptionId)
    } catch (error) {
      if (error.errorName === "InvalidSubscription") {
        throw Error(`Subscription ID "${subscriptionId}" is invalid or does not exist`)
      }
      throw error
    }

    // Accept subscription ownership (only works if a transfer has been requested by the previous owner)
    try {
      console.log(`Accepting ownership of subscription ${subscriptionId}`)
      const acceptTx = await registry.acceptSubscriptionOwnerTransfer(subscriptionId)
      console.log(
        `Waiting ${networks[network.name].confirmations} blocks for transaction ${acceptTx.hash} to be confirmed...`
      )
      await acceptTx.wait(networks[network.name].confirmations)
    } catch (error) {
      console.log(
        `\nFailed to accept ownership. Ensure that a transfer has been requested by the previous owner ${preSubInfo[1]}`
      )
      throw error
    }

    const signerAddr = (await ethers.getSigners())[0].address

    console.log(`Ownership of subscription ${subscriptionId} transferred to ${signerAddr}`)

    // Print information about the accepted subscription
    let postSubInfo = await registry.getSubscription(subscriptionId)

    console.log(`\nSubscription ${subscriptionId} owner: ${postSubInfo[1]}`)
    console.log(`Balance: ${ethers.utils.formatEther(postSubInfo[0])} LINK`)
    console.log(`${postSubInfo[2].length} authorized consumer contract${postSubInfo[2].length === 1 ? "" : "s"}:`)
    console.log(postSubInfo[2])
  })
