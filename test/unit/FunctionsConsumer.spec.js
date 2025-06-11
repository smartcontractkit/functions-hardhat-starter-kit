const { expect } = require("chai")
const { ethers } = require("hardhat")
require("dotenv").config()

describe("FunctionsConsumer Unit Tests", function () {
  let owner, nonOwner, consumer, router, donId, subscriptionId

  const dummySource = `
    if (!args || args.length !== 2) throw Error("Need two args");
    return Functions.encodeUint256(parseInt(args[0]) + parseInt(args[1]));
  `

  beforeEach(async function () {
    expect(process.env.PRIVATE_KEY, "Missing PRIVATE_KEY in .env").to.not.be.undefined
    owner = new ethers.Wallet(process.env.PRIVATE_KEY, ethers.provider)
    nonOwner = new ethers.Wallet(process.env.SECONDARY_PRIVATE_KEY, ethers.provider)
    expect(owner.address).to.not.equal(nonOwner.address, "Owner and non-owner should be different")
    expect(owner.address).to.not.equal(ethers.constants.AddressZero, "Owner address should not be zero")
    expect(nonOwner.address).to.not.equal(ethers.constants.AddressZero, "Non-owner address should not be zero")

    router = process.env.CHAINLINK_ROUTER_ADDRESS
    donId = process.env.CHAINLINK_DON_ID
    subscriptionId = process.env.CHAINLINK_SUBSCRIPTION_ID

    console.log("Owner address:", owner.address)
    console.log("Non-owner address:", nonOwner.address)
    console.log("Router:", router)
    console.log("DON ID:", donId)
    console.log("Subscription ID:", subscriptionId)

    if (!router || !donId || !subscriptionId) {
      console.warn("Missing Chainlink config. Skipping unit tests.")
      this.skip() // Properly skip tests
    }

    const Consumer = await ethers.getContractFactory("FunctionsConsumer")
    consumer = await Consumer.deploy(router, donId)
    await consumer.deployed()

    console.log("Consumer deployed at:", consumer.address)
  })

  describe("Deployment", function () {
    it("sets DON ID and owner correctly", async function () {
      expect(consumer).to.not.be.undefined
      expect(await consumer.donId()).to.equal(donId)
      expect(await consumer.owner()).to.equal(owner.address)
    })
  })

  describe("Ownership", function () {
    it("only owner can set DON ID", async function () {
      const newDonId = ethers.utils.formatBytes32String("nonowner-don")

      let errorCaught = false
      try {
        await consumer.connect(nonOwner).setDonId(newDonId)
      } catch (error) {
        errorCaught = true
        console.log("Error caught for setDonId:", error.reason || error.message)

        // Check multiple levels of error nesting based on actual error structure
        const errorString = JSON.stringify(error)
        const errorMessage = error.message || error.toString()
        const errorReason = error.reason || ""

        const hasExpectedError =
          errorString.includes("Only callable by owner") ||
          errorMessage.includes("Only callable by owner") ||
          errorReason.includes("Only callable by owner") ||
          (error.error && error.error.reason && error.error.reason.includes("Only callable by owner")) ||
          (error.error && error.error.message && error.error.message.includes("Only callable by owner")) ||
          (error.error &&
            error.error.error &&
            error.error.error.reason &&
            error.error.error.reason.includes("Only callable by owner"))

        expect(hasExpectedError, `Expected "Only callable by owner" error not found. Full error: ${errorString}`).to.be
          .true
      }

      expect(errorCaught, "Expected transaction to revert").to.be.true

      // The DON ID should remain unchanged
      expect(await consumer.donId()).to.equal(donId)
    })

    it("owner can set DON ID", async function () {
      const newDonId = ethers.utils.formatBytes32String("new-don-id")

      const tx = await consumer.connect(owner).setDonId(newDonId)
      await tx.wait()

      console.log("DON ID set transaction hash:", tx.hash)

      await new Promise((resolve) => setTimeout(resolve, 200))

      expect(await consumer.donId()).to.equal(newDonId)
    })

    it("only owner can transfer ownership", async function () {
      // Verify current owner first
      expect(await consumer.owner()).to.equal(owner.address)

      let errorCaught = false
      try {
        await consumer.connect(nonOwner).transferOwnership(nonOwner.address)
      } catch (error) {
        errorCaught = true
        console.log("Error caught for transferOwnership:", error.reason || error.message)

        // Check multiple levels of error nesting based on actual error structure
        const errorString = JSON.stringify(error)
        const errorMessage = error.message || error.toString()
        const errorReason = error.reason || ""

        const hasExpectedError =
          errorString.includes("Only callable by owner") ||
          errorMessage.includes("Only callable by owner") ||
          errorReason.includes("Only callable by owner") ||
          (error.error && error.error.reason && error.error.reason.includes("Only callable by owner")) ||
          (error.error && error.error.message && error.error.message.includes("Only callable by owner")) ||
          (error.error &&
            error.error.error &&
            error.error.error.reason &&
            error.error.error.reason.includes("Only callable by owner"))

        expect(hasExpectedError, `Expected "Only callable by owner" error not found. Full error: ${errorString}`).to.be
          .true
      }

      expect(errorCaught, "Expected transaction to revert").to.be.true

      // Owner should remain unchanged
      expect(await consumer.owner()).to.equal(owner.address)
    })
  })

  describe("sendRequest", function () {
    it("blocks non-owner from sending request", async function () {
      let errorCaught = false
      try {
        await consumer.connect(nonOwner).sendRequest(dummySource, 0, "0x", [], [], subscriptionId, 100000)
      } catch (error) {
        errorCaught = true
        console.log("Full error structure:", JSON.stringify(error, null, 2))

        // Check multiple levels of error nesting based on the actual error structure
        const errorString = JSON.stringify(error)
        const errorMessage = error.message || error.toString()
        const errorReason = error.reason || ""

        // Check the specific nested structure from the actual error
        const hasExpectedError =
          errorString.includes("Only callable by owner") ||
          errorMessage.includes("Only callable by owner") ||
          errorReason.includes("Only callable by owner") ||
          (error.error && error.error.reason && error.error.reason.includes("Only callable by owner")) ||
          (error.error && error.error.message && error.error.message.includes("Only callable by owner")) ||
          (error.error &&
            error.error.error &&
            error.error.error.reason &&
            error.error.error.reason.includes("Only callable by owner"))

        expect(hasExpectedError, `Expected "Only callable by owner" error not found. Full error: ${errorString}`).to.be
          .true
      }

      expect(errorCaught, "Expected transaction to revert with gas estimation error").to.be.true
    })
  })
})
