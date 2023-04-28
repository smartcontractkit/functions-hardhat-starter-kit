const { networks } = require("../../networks")

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
    const consumer = taskArgs.contract

    const RegistryFactory = await ethers.getContractFactory(
      "contracts/dev/functions/FunctionsBillingRegistry.sol:FunctionsBillingRegistry"
    )
    const registry = await RegistryFactory.attach(networks[network.name]["functionsBillingRegistryProxy"])

    // TODO: Remove the following 6 lines on open access
    const Oracle = await ethers.getContractFactory("contracts/dev/functions/FunctionsOracle.sol:FunctionsOracle")
    const oracle = await Oracle.attach(networks[network.name]["functionsOracleProxy"])
    const isWalletAllowed = await oracle.isAuthorizedSender((await ethers.getSigner()).address)

    if (!isWalletAllowed)
      return console.log(
        "\nChainlink Functions is currently in a closed testing phase.\nFor access sign up here:\nhttps://functions.chain.link"
      )

    console.log("Creating Functions billing subscription")
    const createSubscriptionTx = await registry.createSubscription()

    // If a consumer or linkAmount was also specified, wait 1 block instead of networks[network.name].confirmations blocks
    const createWaitBlockConfirmations = consumer || linkAmount ? 1 : networks[network.name].confirmations
    console.log(
      `Waiting ${createWaitBlockConfirmations} blocks for transaction ${createSubscriptionTx.hash} to be confirmed...`
    )
    const createSubscriptionReceipt = await createSubscriptionTx.wait(createWaitBlockConfirmations)

    const subscriptionId = createSubscriptionReceipt.events[0].args["subscriptionId"].toNumber()

    console.log(`Subscription created with ID: ${subscriptionId}`)

    if (linkAmount) {
      // Fund subscription
      const juelsAmount = ethers.utils.parseUnits(linkAmount)

      const LinkTokenFactory = await ethers.getContractFactory("LinkToken")
      const linkToken = await LinkTokenFactory.attach(networks[network.name]["linkToken"])

      const accounts = await ethers.getSigners()
      const signer = accounts[0]

      // Check for a sufficent LINK balance to fund the subscription
      const balance = await linkToken.balanceOf(signer.address)
      if (juelsAmount.gt(balance)) {
        throw Error(
          `Insufficent LINK balance. Trying to fund subscription with ${ethers.utils.formatEther(
            juelsAmount
          )} LINK, but only have ${ethers.utils.formatEther(balance)}.`
        )
      }

      console.log(`Funding with ${ethers.utils.formatEther(juelsAmount)} LINK`)
      const fundTx = await linkToken.transferAndCall(
        networks[network.name]["functionsBillingRegistryProxy"],
        juelsAmount,
        ethers.utils.defaultAbiCoder.encode(["uint64"], [subscriptionId])
      )
      // If a consumer was also specified, wait 1 block instead of networks[network.name].confirmations blocks
      const fundWaitBlockConfirmations = !!consumer ? 1 : networks[network.name].confirmations
      console.log(`Waiting ${fundWaitBlockConfirmations} blocks for transaction ${fundTx.hash} to be confirmed...`)
      await fundTx.wait(fundWaitBlockConfirmations)

      console.log(`Subscription ${subscriptionId} funded with ${ethers.utils.formatEther(juelsAmount)} LINK`)
    }

    if (consumer) {
      // Add consumer
      console.log(`Adding consumer contract address ${consumer} to subscription ${subscriptionId}`)
      const addTx = await registry.addConsumer(subscriptionId, consumer)
      console.log(
        `Waiting ${networks[network.name].confirmations} blocks for transaction ${addTx.hash} to be confirmed...`
      )
      await addTx.wait(networks[network.name].confirmations)

      console.log(`Authorized consumer contract: ${consumer}`)
    }

    const subInfo = await registry.getSubscription(subscriptionId)
    console.log(`\nCreated subscription with ID: ${subscriptionId}`)
    console.log(`Owner: ${subInfo[1]}`)
    console.log(`Balance: ${ethers.utils.formatEther(subInfo[0])} LINK`)
    console.log(`${subInfo[2].length} authorized consumer contract${subInfo[2].length === 1 ? "" : "s"}:`)
    console.log(subInfo[2])
  })
