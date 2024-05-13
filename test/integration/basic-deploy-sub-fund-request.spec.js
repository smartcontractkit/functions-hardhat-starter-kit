const http = require("http")
const path = require("path")
const { network, ethers, run } = require("hardhat")
const { networks } = require("../../networks.js")
const { expect } = require("chai")

async function checkLocalFunctionsTestnetRunning() {
  if (network.name == "localFunctionsTestnet") {
    const LOCAL_FUNCTIONS_TESTNET = "http://localhost:8545/"
    return new Promise((resolve, reject) => {
      http
        .get(LOCAL_FUNCTIONS_TESTNET, (res) => {
          if (res.statusCode === 404) {
            // RPC URL returns 404 for get requests
            resolve("Local Functions Testnet is running at ", LOCAL_FUNCTIONS_TESTNET, "\n")
          } else {
            reject(`Expected 404 for Get request to ${LOCAL_FUNCTIONS_TESTNET} but got ${res.statusCode}\n`)
          }
        })
        .on("error", (err) => {
          reject(
            `Local Functions Testnet is not running at ${LOCAL_FUNCTIONS_TESTNET}: ${err.message}.\n Please run 'npm run startLocalFunctionsTestnet'\n`
          )
        })
    })
  }
}

describe("Functions Consumer Integration Tests", async function () {
  const EMPTY_BYTES = "0x0000000000000000000000000000000000000000000000000000000000000000"
  let functionsConsumer
  let testnetConfigs = networks.localFunctionsTestnet

  beforeEach(() => {
    return checkLocalFunctionsTestnetRunning()
  })

  it("Deploys consumer to local functions testnet", async () => {
    const FunctionsConsumerFactory = await ethers.getContractFactory("FunctionsConsumer")
    functionsConsumer = await FunctionsConsumerFactory.deploy(
      testnetConfigs.functionsRouter,
      ethers.utils.formatBytes32String(testnetConfigs.donId)
    )
    await functionsConsumer.deployed()

    console.log("FunctionsConsumer deployed to:", functionsConsumer.address)

    expect(await functionsConsumer.donId()).to.equal(ethers.utils.formatBytes32String(testnetConfigs.donId))
    expect(await functionsConsumer.s_lastRequestId()).to.equal(EMPTY_BYTES)
  })

  it("makes request ", async () => {
    await run("functions-sub-create", { contract: functionsConsumer.address, amount: "3" })
    const subscriptionId = 1 // on LocalFunctionsTestnet the first subscription ID is 1 and it increments by 1 each time, unless the testnet is terminated.
    const callbackGasLimit = 100_000
    const configPath = `${__dirname}/../../Functions-request-config.js`
    const requestConfig = require(configPath)

    console.log("Requesting with config: ", requestConfig)

    const requestTx = await functionsConsumer.sendRequest(
      "return Functions.encodeUint256(Math.round(1981))", // requestConfig.source,
      requestConfig.secretsLocation,
      [],
      requestConfig.args ?? [],
      requestConfig.bytesArgs ?? [],
      subscriptionId,
      callbackGasLimit
    )

    const requestTxReceipt = await requestTx.wait(1)
    console.log(
      `Functions request has been initiated in transaction ${requestTx.hash} with request ID ${requestTxReceipt.events[2].args.id}. Note the request ID may change if a re-org occurs, but the transaction hash will remain constant.\nWaiting for fulfillment from the Decentralized Oracle Network...\n`
    )
  })
})
