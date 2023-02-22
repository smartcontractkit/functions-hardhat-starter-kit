// This example shows how to calculate a continuously compounding interested rate.
// This calculation would require significant on-chain gas, but is easy for a decentralized oracle network.

// Arguments can be provided when a request is initated on-chain and used in the request source code as shown below
const principalAmount = parseInt(args[4])
const APYTimes100 = parseInt(args[5])
const APYAsDecimalPercentage = APYTimes100 / 100 / 100

const timeInYears = 1 / 12 // represents 1 month
const eulersNumber = 2.7183

// Continuously-compounding interest formula: A = Pe^(rt)
const totalAmountAfterInterest = principalAmount * eulersNumber ** (APYAsDecimalPercentage * timeInYears)

// The source code MUST return a Buffer or the request will return an error message
// Use one of the following functions to convert to a Buffer representing the response bytes that are returned to the client smart contract:
// - Functions.encodeUint256
// - Functions.encodeInt256
// - Functions.encodeString
// Or return a custom Buffer for a custom byte encoding
return Functions.encodeUint256(Math.round(totalAmountAfterInterest))
