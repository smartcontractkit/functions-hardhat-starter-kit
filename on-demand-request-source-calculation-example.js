// This example shows how to calculate a continuously compounding interested rate.
// This calculation would require significant on-chain gas, but is easy for a decentralized oracle network.

// Arguments can be provided when a request is initated on-chain and used in the request source code as shown below
const principalAmount = parseInt(args[4]);
const APYTimes100 = parseInt(args[5]);
const APYAsDecimalPercentage = (APYTimes100 / 100) / 100

const timeInYears = (1/12) // represents 1 month
const eulersNumber = 2.7183;

// A = Pe^(rt)
const totalAmountAfterInterest = principalAmount * eulersNumber ** (APYAsDecimalPercentage * timeInYears)

// Use one of the following functions to convert the returned value to a Buffer
// representing the bytes that are returned to the client smart contract:
// - OCR2DR.encodeUint256
// - OCR2DR.encodeInt256
// - OCR2DR.encodeString
// Or return a Buffer for a custom byte encoding
return OCR2DR.encodeUint256(Math.round(totalAmountAfterInterest))