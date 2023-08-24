const { networks } = require("../../networks")

const { SubscriptionManager } = require("@chainlink/functions-toolkit")

task("functions-sub-create", "Creates a new billing subscription for Functions consumer contracts")
  .addOptionalParam("amount", "Initial amount used to fund the subscription in LINK")
  .addOptionalParam("contract", "Address of the client contract address authorized to use the new billing subscription")
  .setAction(async (taskArgs) => {
    if (network.name === "hardhat") {
      throw Error(
        'This command cannot be used on a local hardhat chain.  Specify a valid network or simulate a request locally with "npx hardhat functions-simulate".'
      )
    }

    const linkAmount = taskArgs.amount
    const consumerAddress = taskArgs.contract
    const signer = await ethers.getSigner()
    const linkTokenAddress = networks[network.name]["linkToken"]
    const functionsRouterAddress = networks[network.name]["functionsRouter"]

    const RouterFactory = await ethers.getContractFactory("contracts/dev/functions/FunctionsRouter.sol:FunctionsRouter")
    const routerContract = await RouterFactory.attach(functionsRouterAddress)

    const subscriptionManager = new SubscriptionManager({ signer, linkTokenAddress, functionsRouterAddress })
    await subscriptionManager.initialize()
    console.log("working ======= \n")
    // console.log("Creating Functions billing subscription")
    // const createSubscriptionTx = await routerContract.createSubscription()

    // // If a consumer or linkAmount was also specified, wait 1 block instead of networks[network.name].confirmations blocks
    // const createWaitBlockConfirmations = consumerAddress || linkAmount ? 1 : networks[network.name].confirmations
    // console.log(
    //   `Waiting ${createWaitBlockConfirmations} blocks for transaction ${createSubscriptionTx.hash} to be confirmed...`
    // )
    // const createSubscriptionReceipt = await createSubscriptionTx.wait(createWaitBlockConfirmations)

    // const subscriptionId = createSubscriptionReceipt.events[0].args["subscriptionId"].toNumber()

    // console.log(`Subscription created with ID: ${subscriptionId}`)

    // if (linkAmount) {
    //   // Fund subscription
    //   const juelsAmount = ethers.utils.parseUnits(linkAmount)

    //   const LinkTokenFactory = await ethers.getContractFactory("LinkToken")
    //   const linkToken = await LinkTokenFactory.attach(linkTokenAddress)

    //   const accounts = await ethers.getSigners()
    //   const signer = accounts[0]

    //   // Check for a sufficent LINK balance to fund the subscription
    //   const balance = await linkToken.balanceOf(signer.address)
    //   if (juelsAmount.gt(balance)) {
    //     throw Error(
    //       `Insufficent LINK balance. Trying to fund subscription with ${ethers.utils.formatEther(
    //         juelsAmount
    //       )} LINK, but only have ${ethers.utils.formatEther(balance)}.`
    //     )
    //   }

    //   console.log(`Funding with ${ethers.utils.formatEther(juelsAmount)} LINK`)
    //   const fundTx = await linkToken.transferAndCall(
    //     networks[network.name]["functionsBillingRegistryProxy"],
    //     juelsAmount,
    //     ethers.utils.defaultAbiCoder.encode(["uint64"], [subscriptionId])
    //   )
    //   // If a consumer was also specified, wait 1 block instead of networks[network.name].confirmations blocks
    //   const fundWaitBlockConfirmations = !!consumerAddress ? 1 : networks[network.name].confirmations
    //   console.log(`Waiting ${fundWaitBlockConfirmations} blocks for transaction ${fundTx.hash} to be confirmed...`)
    //   await fundTx.wait(fundWaitBlockConfirmations)

    //   console.log(`Subscription ${subscriptionId} funded with ${ethers.utils.formatEther(juelsAmount)} LINK`)
    // }

    // if (consumerAddress) {
    //   // Add consumer
    //   console.log(`Adding consumer contract address ${consumerAddress} to subscription ${subscriptionId}`)
    //   const addTx = await routerContract.addConsumer(subscriptionId, consumerAddress)
    //   console.log(
    //     `Waiting ${networks[network.name].confirmations} blocks for transaction ${addTx.hash} to be confirmed...`
    //   )
    //   await addTx.wait(networks[network.name].confirmations)

    //   console.log(`Authorized consumer contract: ${consumerAddress}`)
    // }

    // const subInfo = await routerContract.getSubscription(subscriptionId)
    // console.log(`\nCreated subscription with ID: ${subscriptionId}`)
    // console.log(`Owner: ${subInfo[1]}`)
    // console.log(`Balance: ${ethers.utils.formatEther(subInfo[0])} LINK`)
    // console.log(`${subInfo[2].length} authorized consumer contract${subInfo[2].length === 1 ? "" : "s"}:`)
    // console.log(subInfo[2])
  })
