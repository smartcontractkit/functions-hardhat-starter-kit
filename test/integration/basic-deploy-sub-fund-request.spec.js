const { network, ethers } = require("hardhat")
const http = require("http")
const { networks } = require("../../networks.js")
const { expect } = require("chai")

function checkLocalFunctionsTestnetRunning() {
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

describe("Functions Consumer Integration Tests", async function () {
  const EMPTY_BYTES = "0x0000000000000000000000000000000000000000000000000000000000000000"
  let functionsConsumerAddress
  let testnetConfigs = networks.localFunctionsTestnet

  beforeEach(() => {
    return checkLocalFunctionsTestnetRunning()
  })

  it("Deploys consumer to local functions testnet", async () => {
    const FunctionsConsumer = await ethers.getContractFactory("FunctionsConsumer")
    const functionsConsumer = await FunctionsConsumer.deploy(
      testnetConfigs.functionsRouter,
      ethers.utils.formatBytes32String(testnetConfigs.donId)
    )
    await functionsConsumer.deployed()
    functionsConsumerAddress = functionsConsumer.address
    console.log("FunctionsConsumer deployed to:", functionsConsumerAddress)

    expect(await functionsConsumer.donId()).to.equal(ethers.utils.formatBytes32String(testnetConfigs.donId))

    expect(await functionsConsumer.s_lastRequestId()).to.equal(EMPTY_BYTES)
  })
})
