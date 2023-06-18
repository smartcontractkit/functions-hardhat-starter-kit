const { deployments, ethers } = require("hardhat")

const { simulateRequest, buildRequest, getRequestConfig } = require("../../FunctionsSandboxLibrary")

describe("Functions Consumer Unit Tests", async function () {
  let consumer

  beforeEach(async () => {
    await deployments.fixture(["all"])
    consumer = await ethers.getContract("FunctionsConsumer")
  })

  it("Simulate Functions Request via Mocking Chainlink Node", async () => {
    try {
      const unvalidatedRequestConfig = require("./Functions-request-config.js")
      const requestConfig = getRequestConfig(unvalidatedRequestConfig)
      // Fetch the mock DON public key
      const oracle = await ethers.getContractAt("FunctionsOracle", "0x0cDF3DDCD472eec0B1Cc0f30F0379B18952B4870")
      const DONPublicKey = await oracle.getDONPublicKey()
      // Remove the preceding 0x from the DON public key
      requestConfig.DONPublicKey = DONPublicKey.slice(2)
      const request = await buildRequest(requestConfig)

      const requestTx = await consumer.executeRequest(
        request.source,
        request.secrets ?? [],
        request.args ?? [], // Chainlink Functions request args
        1, // Subscription ID
        300000 // Gas limit for the transaction
      )

      const requestTxReceiptChainlink = await requestTx.wait(1)
      const requestId = requestTxReceiptChainlink.events[2].args.id

      const { success, result, resultLog } = await simulateRequest(requestConfig)
      console.log(`\n${resultLog}`)

      const registry = await ethers.getContractAt(
        "FunctionsBillingRegistry",
        "0x68B1D87F95878fE05B998F19b66F4baba5De1aed"
      )

      const accounts = await ethers.getSigners()
      const dummyTransmitter = accounts[0].address
      const dummySigners = Array(31).fill(dummyTransmitter)
      const fulfillTx = await registry.fulfillAndBill(
        requestId,
        success ? result : "0x",
        success ? "0x" : result,
        dummyTransmitter,
        dummySigners,
        4,
        100_000,
        500_000,
        {
          gasLimit: 500_000,
        }
      )
      await fulfillTx.wait(1)
    } catch (fulfillError) {
      // Catch & report any unexpected fulfillment errors
      console.log("\nUnexpected error encountered when calling fulfillRequest in client contract.")
      console.log(fulfillError)
    }
  })
})
