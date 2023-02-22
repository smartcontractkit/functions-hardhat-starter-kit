const { VERIFICATION_BLOCK_CONFIRMATIONS, networkConfig } = require("../../network-config")

task("functions-timeout-requests", "Times out expired requests for a given client contract and subscription ID")
  .addParam("contract", "Address of the client contract")
  .addParam("subid", "Subscription ID")
  .setAction(async (taskArgs) => {
    if (network.name === "hardhat") {
      throw Error(
        'This command cannot be used on a local hardhat chain.  Specify a valid network or simulate an FunctionsConsumer request locally with "npx hardhat functions-simulate".'
      )
    }

    console.log(
      `Timing out requests for client contract ${consumerAddress} and subscription ${subscriptionId} on ${taskArgs.network}`
    )

    const RegistryFactory = await ethers.getContractFactory("FunctionsBillingRegistry")
    const registry = await RegistryFactory.attach(networkConfig[network.name]["functionsBillingRegistryProxy"])

    const requestIdsToTimeout = await getRequestsToTimeout(registry, taskArgs.contract, taskArgs.subid)

    if (requestIdsToTimeout.length > 0) {
      console.log(`Timing out expired requestIds, ${requestIdsToTimeout}`)
      await registry.timeoutRequests(requestIdsToTimeout)
      console.log(`\nSuccessfully timed out all expired requests`)
    } else {
      console.log(
        `No expired requests were found for client contract ${consumerAddress} and subscription ${subscriptionId} on ${taskArgs.network}`
      )
    }
  })

const getRequestsToTimeout = async (consumerAddress, subscriptionId, registry) => {
  console.log("Getting latest nonce and generating all past request IDs")
  const latestNonce = await registry.getLatestNonce(consumerAddress, subscriptionId)

  const allPastRequestIds = []
  // The lowest-possible nonce for a request is 2
  for (let i = latestNonce; i > 1; i--) {
    const requestId = computeRequestId(
      networkConfig[network.name]["functionsOracleProxy"],
      consumerAddress,
      subscriptionId,
      i
    )
    allPastRequestIds.push(requestId)
  }

  console.log("Checking for all expired requests")
  const areRequestIdsExpired = await registry.checkRequestIdsToTimeout(allPastRequestIds)

  const requestIdsToTimeout = []
  for (let i = 0; i < allPastRequestIds.length; i++) {
    if (areRequestIdsExpired[i]) {
      requestIdsToTimeout.push(allPastRequestIds[i])
    }
  }

  return requestIdsToTimeout
}

const computeRequestId = (donAddress, consumerAddress, subscriptionId, nonce) => {
  const encodedBytes = ethers.utils.defaultAbiCoder.encode(
    ["address", "address", "uint64", "uint64"],
    [donAddress, consumerAddress, subscriptionId, nonce]
  )

  return ethers.utils.keccak256(encodedBytes)
}
