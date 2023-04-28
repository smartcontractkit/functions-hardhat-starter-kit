const { networks } = require("../../networks")

task("functions-sub-add", "Adds a client contract to the Functions billing subscription")
  .addParam("subid", "Subscription ID")
  .addParam("contract", "Address of the Functions client contract to authorize for billing")
  .setAction(async (taskArgs) => {
    if (network.name == "hardhat") {
      throw Error("This command cannot be used on a local hardhat chain.  Specify a valid network.")
    }

    const subscriptionId = taskArgs.subid
    const consumer = taskArgs.contract

    await addClientConsumerToSubscription(subscriptionId, consumer)
  })

const addClientConsumerToSubscription = async (subscriptionId, consumer) => {
  const RegistryFactory = await ethers.getContractFactory("FunctionsBillingRegistry")
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

  // Check that the requesting wallet is the owner of the subscription
  const accounts = await ethers.getSigners()
  const signer = accounts[0]
  if (preSubInfo[1] !== signer.address) {
    throw Error("The current wallet is not the owner of the subscription")
  }

  // Check that the consumer is not already authorized (for convenience)
  const existingConsumers = preSubInfo[2].map((addr) => addr.toLowerCase())
  if (existingConsumers.includes(consumer.toLowerCase())) {
    throw Error(`Consumer ${consumer} is already authorized to use subscription ${subscriptionId}`)
  }

  console.log(`Adding consumer contract address ${consumer} to subscription ${subscriptionId}`)
  const addTx = await registry.addConsumer(subscriptionId, consumer)

  console.log(`Waiting ${networks[network.name].confirmations} blocks for transaction ${addTx.hash} to be confirmed...`)
  await addTx.wait(networks[network.name].confirmations)
  console.log(`\nAdded consumer contract address ${consumer} to subscription ${subscriptionId}`)

  // Print information about the subscription
  const postSubInfo = await registry.getSubscription(subscriptionId)
  console.log(
    `${postSubInfo[2].length} authorized consumer contract${
      postSubInfo[2].length === 1 ? "" : "s"
    } for subscription ${subscriptionId}:`
  )
  console.log(postSubInfo[2])
}

module.exports.addClientConsumerToSubscription = addClientConsumerToSubscription
