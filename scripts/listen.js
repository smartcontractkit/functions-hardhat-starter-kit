// Loads environment variables from .env.enc file (if it exists)
require("@chainlink/env-enc").config("../.env.enc")

const { networks } = require("../networks")

const { ResponseListener, decodeResult, ReturnType } = require("@chainlink/functions-toolkit")
const { providers } = require("ethers")

const subscriptionId = "TODO" // TODO @dev update this  to show your subscription Id

if (!subscriptionId || isNaN(subscriptionId)) {
  throw Error("Please update the subId variable in scripts/listen.js to your subscription ID.")
}

const networkName = "polygonMumbai" // TODO @dev update this to your network name

// Mount Response Listener
const provider = new providers.JsonRpcProvider(networks[networkName].url)
const functionsRouterAddress = networks[networkName]["functionsRouter"]

const responseListener = new ResponseListener({ provider, functionsRouterAddress })
// Remove existing listeners
console.log("\nRemoving existing listeners...")
responseListener.stopListeningForResponses()

console.log(`\nListening for Functions Responses for subscriptionId ${subscriptionId} on network ${networkName}...`)
// Listen for response
responseListener.listenForResponses(subscriptionId, (response) => {
  console.log(`\n✅ Request ${response.requestId} fulfilled. Functions Status Code: ${response.fulfillmentCode}`)
  if (!response.errorString) {
    console.log(
      "\nFunctions response received!\nData written on chain:",
      response.responseBytesHexstring,
      "\n and that decodes to an int256 value of: ",
      decodeResult(response.responseBytesHexstring, ReturnType.int256).toString(),
      "\n"
    )
  } else {
    console.log("\n❌ Error during the execution: ", response.errorString, "\n")
  }
})
