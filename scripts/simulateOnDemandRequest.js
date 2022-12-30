const { simulateRequest, getDecodedResultLog } = require('../onDemandRequestSimulator')
const requestConfig = require('../on-demand-request-config.js')

;(async () => {
  const { resultLog, result } = await simulateRequest(requestConfig)

  console.log(`\n${resultLog}`)
  console.log(
    `Response returned to client contract represented as a hex string: ${result}\n${getDecodedResultLog(
      requestConfig,
      result
    )}`
  )
})()
