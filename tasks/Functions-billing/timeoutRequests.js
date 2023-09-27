const { SubscriptionManager, fetchRequestCommitment } = require("@chainlink/functions-toolkit")
const { networks } = require("../../networks")
const { providers } = require("ethers")

task(
  "functions-timeout-requests",
  "Times out expired Functions requests which have not been fulfilled within 5 minutes"
)
  .addParam("requestids", "1 or more request IDs to timeout separated by commas")
  .addOptionalParam("toblock", "Ending search block number (defaults to latest block)")
  .addOptionalParam("pastblockstosearch", "Number of past blocks to search", 1000, types.int)
  .setAction(async (taskArgs) => {
    const requestIdsToTimeout = taskArgs.requestids.split(",")
    console.log(`Timing out requests ${requestIdsToTimeout} on ${network.name}`)
    const toBlock = taskArgs.toblock ? Number(taskArgs.toblock) : "latest"
    const pastBlocksToSearch = parseInt(taskArgs.pastblockstosearch)

    const signer = await ethers.getSigner()
    const linkTokenAddress = networks[network.name]["linkToken"]
    const functionsRouterAddress = networks[network.name]["functionsRouter"]
    const donId = networks[network.name]["donId"]
    const txOptions = { confirmations: networks[network.name].confirmations }

    const sm = new SubscriptionManager({ signer, linkTokenAddress, functionsRouterAddress })
    await sm.initialize()

    const requestCommitments = []
    for (const requestId of requestIdsToTimeout) {
      try {
        const requestCommitment = await fetchRequestCommitment({
          requestId,
          provider: new providers.JsonRpcProvider(networks[network.name].url),
          functionsRouterAddress,
          donId,
          toBlock,
          pastBlocksToSearch,
        })
        console.log(`Fetched commitment for request ID ${requestId}`)
        if (requestCommitment.timeoutTimestamp < BigInt(Math.round(Date.now() / 1000))) {
          requestCommitments.push(requestCommitment)
        } else {
          console.log(`Request ID ${requestId} has not expired yet (skipping)`)
        }
      } catch (error) {
        console.log(`Failed to fetch commitment for request ID ${requestId} (skipping): ${error}`)
      }
    }

    if (requestCommitments.length > 0) {
      await sm.timeoutRequests({
        requestCommitments,
        txOptions,
      })
      console.log("Requests successfully timed out")
    }
  })
