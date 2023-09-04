const { networks } = require("./networks")

const { ResponseListener, decodeResult, ReturnType } = require("@chainlink/functions-toolkit")
const { providers } = require("ethers")

const network = { name: "polygonMumbai" }
const subId = 43

// TODO - consider adding nodemon to project dependencies to auto-restart this script
// Mount Response Listener
const provider = new providers.JsonRpcProvider(networks[network.name].url)
const functionsRouterAddress = networks[network.name]["functionsRouter"]

const responseListener = new ResponseListener({ provider, functionsRouterAddress })
//remove existing listeners.
console.log("\nRemoving existing listeners...")
responseListener.stopListeningForResponses()

console.log(`\nMounting new Response Listener for subId ${subId}...`)
// Listen for response
responseListener.listenForResponses(subId, (response) => {
  console.log(`\n✅ Request ${response.requestId} fulfilled. Functions Status Code: ${response.fulfillmentCode}`)
  if (!response.errorString) {
    console.log(
      "\nFunctions response received!\nData written on chain:",
      response.responseBytesHexstring,
      "\n and that decodes to an int256 value of: ",
      decodeResult(response.responseBytesHexstring, ReturnType.int256).toString()
    )
  } else {
    console.log(`\n❌ Error during the execution: `, response.errorString)
  }
})
