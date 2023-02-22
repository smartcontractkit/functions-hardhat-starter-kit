const { VERIFICATION_BLOCK_CONFIRMATIONS, networkConfig } = require("../../network-config")

task("functions-timeout-requests", "Times out expired requests")
  .addParam("requestids", "1 or more request IDs to timeout")
  .setAction(async (taskArgs) => {
    if (network.name === "hardhat") {
      throw Error(
        'This command cannot be used on a local hardhat chain.  Specify a valid network.'
      )
    }

    console.log(
      `Timing out requests ${taskArgs.requestids} on ${taskArgs.network}`
    )

    const RegistryFactory = await ethers.getContractFactory("FunctionsBillingRegistry")
    const registry = await RegistryFactory.attach(networkConfig[network.name]["functionsBillingRegistryProxy"])

    await registry.timeoutRequests(taskArgs.requestids)

    console.log(
      `Successfully timed out request ${taskArgs.requestids}`
    )
  })