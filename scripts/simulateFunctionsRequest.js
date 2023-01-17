const { simulateRequest, getDecodedResultLog } = require("../FunctionsRequestSimulator")

const simulate = async (requestConfigPath) => {
  if (!requestConfigPath) throw new Error("Request config path not provided")
  const requestConfig = require(requestConfigPath)
  const { resultLog, result, success } = await simulateRequest(requestConfig)

  console.log(`\n${resultLog}`)
  if (success) {
    console.log(`Value returned from souce code: ${result}\n${getDecodedResultLog(requestConfig, result)}`)
    return
  }
}

module.exports = { simulate }
