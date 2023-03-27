"use strict"
Object.defineProperty(exports, "__esModule", { value: true })
exports.secretsRedactorFactory = exports.Log = void 0
class Log {}
exports.Log = Log
Log.error = (message, requestId) =>
  console.log(
    JSON.stringify({
      logLevel: "error",
      timestamp: Date.now(),
      message,
      requestId,
    })
  )
Log.warn = (message, requestId) =>
  console.log(
    JSON.stringify({
      logLevel: "warn",
      timestamp: Date.now(),
      message,
      requestId,
    })
  )
Log.info = (message, requestId) => {
  if (process.env["LOG_LEVEL"] && process.env["LOG_LEVEL"]?.toLowerCase() !== "false") {
    console.log(
      JSON.stringify({
        logLevel: "info",
        timestamp: Date.now(),
        message,
        requestId,
      })
    )
  }
}
Log.debug = (message, requestId) => {
  if (process.env["LOG_LEVEL"]?.toLowerCase() === "debug" || process.env["LOG_LEVEL"]?.toLowerCase() === "trace") {
    console.log(
      JSON.stringify({
        logLevel: "debug",
        timestamp: Date.now(),
        message,
        requestId,
      })
    )
  }
}
Log.trace = (message, requestId) => {
  if (process.env["LOG_LEVEL"]?.toLowerCase() === "trace") {
    console.log(
      JSON.stringify({
        logLevel: "trace",
        timestamp: Date.now(),
        message,
        requestId,
      })
    )
  }
}
const secretsRedactorFactory = (secrets) => {
  const allSecretsToRedact = Array.from(new Set(getSecretsToRedact(secrets))).filter((s) => s !== "<REDACTED SECRET>")
  return function secretsRedactor(stringToRedact) {
    let redactedString = stringToRedact
    for (const secret of allSecretsToRedact) {
      redactedString = redactedString.split(secret).join("<REDACTED SECRET>").slice(0, 2048)
    }
    // Curtail the URL length to prevent excess logging
    return redactedString
  }
}
exports.secretsRedactorFactory = secretsRedactorFactory
const getSecretsToRedact = (secrets) => {
  const secretsKeys = Object.keys(secrets)
  const secretsValues = Object.values(secrets)
  return secretsKeys.concat(secretsValues)
}
