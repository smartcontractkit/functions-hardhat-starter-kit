const { simulateRequest, buildRequest, getDecodedResultLog } = require('../onDemandRequestSimulator')
const { writeFileSync } = require('fs');

(async () => {
  const builtRequest = await buildRequest(require('../on-demand-request-config.js'))
  writeFileSync('on-demand-request.json', JSON.stringify(builtRequest))
})()
