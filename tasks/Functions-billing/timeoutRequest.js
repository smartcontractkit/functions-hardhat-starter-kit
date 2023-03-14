const { networkConfig, VERIFICATION_BLOCK_CONFIRMATIONS } = require("../../network-config")

task("functions-timeout-requests", "Times out expired requests")
  .addParam("requestids", "1 or more request IDs to timeout separated by commas")
  .setAction(async (taskArgs) => {
    if (network.name === "hardhat") {
      throw Error(
        'This command cannot be used on a local hardhat chain.  Specify a valid network.'
      )
    }

    const requestIdsToTimeout = taskArgs.requestids.split(",")

    console.log(
      `Timing out requests ${requestIdsToTimeout} on ${network.name}`
    )

    const RegistryFactory = await ethers.getContractFactory("FunctionsBillingRegistry")
    const registry = await RegistryFactory.attach(networkConfig[network.name]["functionsBillingRegistryProxy"])

    // Listen for timed-out request events
    registry.on("RequestTimedOut", (timedOutRequestId) => {
      // Filter in case multiple users attempt to time out requests simultaneously
      if (requestIdsToTimeout.includes(timedOutRequestId)) {
        console.log(`Request ${timedOutRequestId} successfully timed out`)
      }
    })

    const timeoutTx = await registry.timeoutRequests(requestIdsToTimeout, { gasLimit: 10_000_000 })

    console.log(`Waiting ${VERIFICATION_BLOCK_CONFIRMATIONS} blocks for transaction ${timeoutTx.hash} to be confirmed...`)
    await timeoutTx.wait(VERIFICATION_BLOCK_CONFIRMATIONS)

    // Close the event listener
    await registry.removeAllListeners()
    
    console.log("\nTimeout requests transaction complete")
  })