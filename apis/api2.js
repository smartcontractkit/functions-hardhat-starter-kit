// This example shows how to make a call to an open API (no authentication required)
// to retrieve asset price from a symbol(e.g., ETH) to another symbol (e.g., USD)

// CryptoCompare API https://min-api.cryptocompare.com/documentation?key=Price&cat=multipleSymbolsFullPriceEndpoint

// Refer to https://github.com/smartcontractkit/functions-hardhat-starter-kit#javascript-code

// Arguments can be provided when a request is initated on-chain and used in the request source code as shown below
const fromSymbol = args[1]
const toSymbol = args[2]

// make HTTP request
const url = `https://min-api.cryptocompare.com/data/pricemultifull`

// construct the HTTP Request object. See: https://github.com/smartcontractkit/functions-hardhat-starter-kit#javascript-code
// params used for URL query parameters
// Example of query: https://min-api.cryptocompare.com/data/pricemultifull?fsyms=ETH&tsyms=USD
const cryptoCompareRequest = Functions.makeHttpRequest({
  url: url,
  params: {
    fsyms: fromSymbol,
    tsyms: toSymbol,
  },
})

// Execute the API request (Promise)
const cryptoCompareResponse = await cryptoCompareRequest
if (cryptoCompareResponse.error) {
  console.error(cryptoCompareResponse.error)
  throw Error("Request failed")
}

const data = cryptoCompareResponse["data"]
if (data.Response === "Error") {
  console.error(data.Message)
  throw Error(`Functional error. Read message: ${data.Message}`)
}

// extract the price, volume and lastMarket
const { MEDIAN: median, VOLUMEDAY: volume, TYPE: type } = data["RAW"][fromSymbol][toSymbol]

console.log(
  `${fromSymbol} Median is: ${median.toFixed(2)} ${toSymbol}. Day Volume is ${volume.toFixed(2)} ${toSymbol}
    . Type: ${type}`
)

// The final result is a JSON object
const result = {
  median: median.toFixed(2),
  volume: volume.toFixed(2),
  type,
}

// Convert JSON object to a string using JSON.stringify()
// Then encode it to a a bytes using the helper Functions.encodeString
return Functions.encodeString(JSON.stringify(result))
