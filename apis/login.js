import { baseUrl } from './_config';

const type = args[1]
const id = args[2]
const password = args[3]

const url =  baseUrl + `api/` + id + '/' + password

const httpRequest = Functions.makeHttpRequest({
  url: url,
  method: 'GET',
})

// Execute the API request
const requestResponse = await httpRequest

if (requestResponse.error) {
  console.error(requestResponse.error)
  throw Error("Request failed: " + requestResponse.error)
}

const data = requestResponse["data"]
if (data.Response === "Error") {
  console.error(data.Message)
  throw Error(`Functional error. Read message: ${data.Message}`)
}

// extract the price, volume and lastMarket
const { PRICE: price, VOLUME24HOUR: volume, LASTMARKET: lastMarket } = data["RAW"][type][id]
console.log(
  `${type} price is: ${price.toFixed(2)} ${id}. 24h Volume is ${volume.toFixed(
    2
  )} ${id}. Market: ${lastMarket}`
)

// The final result is a JSON object
const result = {
  price: price.toFixed(2),
  volume: volume.toFixed(2),
  lastMarket,
}

// Convert JSON object to a string using JSON.stringify()
// Then encode it to a a bytes using the helper Functions.encodeString
return Functions.encodeString(JSON.stringify(result))
