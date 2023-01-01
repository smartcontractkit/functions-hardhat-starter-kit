const { simulateRequest, getDecodedResultLog } = require('../onDemandRequestSimulator')
const requestConfig = require('../on-demand-request-config.js')

;(async () => {
  const { resultLog, result, success } = await simulateRequest(requestConfig)

  console.log(`\n${resultLog}`)
  if (success) {
    console.log(
      `Value returned from souce code: ${result}\n${getDecodedResultLog(
        requestConfig,
        result
      )}`
    )
    return
  }
})()
