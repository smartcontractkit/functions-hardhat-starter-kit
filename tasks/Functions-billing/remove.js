const { VERIFICATION_BLOCK_CONFIRMATIONS, networkConfig } = require("../../network-config")

task("functions-sub-remove", "Removes a client contract from an Functions billing subscription")
  .addParam("subid", "Subscription ID")
  .addParam("contract", "Address of the client contract to remove from billing subscription")
  .setAction(async (taskArgs) => {
    if (network.name === "hardhat") {
      throw Error(
        'This command cannot be used on a local hardhat chain.  Please specify a valid network or simulate an FunctionsConsumer request locally with "npx hardhat functions-simulate".'
      )
    }

    const subscriptionId = taskArgs.subid
    const consumer = taskArgs.contract

    const RegistryFactory = await ethers.getContractFactory(
      "contracts/dev/functions/FunctionsBillingRegistry.sol:FunctionsBillingRegistry"
    )
    const registry = await RegistryFactory.attach(networkConfig[network.name]["functionsBillingRegistryProxy"])

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

    // Check that the requesting wallet is the owner of the subscription
    const accounts = await ethers.getSigners()
    const signer = accounts[0]
    if (preSubInfo[1] !== signer.address) {
      throw Error("The current wallet is not the owner of the subscription")
    }

    // Check that the consumer is currently authorized before attempting to remove
    const existingConsumers = preSubInfo[2].map((addr) => addr.toLowerCase())
    if (!existingConsumers.includes(consumer.toLowerCase())) {
      throw Error(`Consumer address ${consumer} is not registered to use subscription ${subscriptionId}`)
    }

    console.log(`Removing consumer contract address ${consumer} to subscription ${subscriptionId}`)
    const rmTx = await registry.removeConsumer(subscriptionId, consumer)

    console.log(`Waiting ${VERIFICATION_BLOCK_CONFIRMATIONS} blocks for transaction ${rmTx.hash} to be confirmed...`)
    await rmTx.wait(VERIFICATION_BLOCK_CONFIRMATIONS)
    console.log(`\nRemoved consumer contract address ${consumer} from subscription ${subscriptionId}`)

    const postSubInfo = await registry.getSubscription(subscriptionId)
    console.log(
      `${postSubInfo[2].length} authorized consumer contract${
        postSubInfo[2].length === 1 ? "" : "s"
      } for subscription ${subscriptionId}:`
    )
    console.log(postSubInfo[2])
  })
