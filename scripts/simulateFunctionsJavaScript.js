const { simulateRequest, getDecodedResultLog, getRequestConfig } = require("../FunctionsSandboxLibrary")

const runSimulation = async (requestConfig) => {
  const { resultLog, result, success } = await simulateRequest(requestConfig)

  console.log(`\n${resultLog}`)
  if (success) {
    console.log(`Value returned from source code: ${result}\n${getDecodedResultLog(requestConfig, result)}`)
    return
  }
}

;(async () => {
  const unvalidatedRequestConfig = require("../Functions-request-config.js")
  const requestConfig = getRequestConfig(unvalidatedRequestConfig)

  if (requestConfig.secretsLocation === 1) {
    requestConfig.secrets = {}
    if (requestConfig.globalSecrets && Object.keys(requestConfig.globalSecrets).length !== 0) {
      requestConfig.secrets = requestConfig.globalSecrets
      console.log("\n__SIMULATING JAVASCRIPT WITH DEFAULT SECRETS__")
      await runSimulation(requestConfig)
    }

    if (!requestConfig.perNodeSecrets) {
      return
    }

    for (let i = 0; i < requestConfig.perNodeSecrets.length; i++) {
      requestConfig.secrets = requestConfig.perNodeSecrets[i]
      console.log(`\n__SIMULATING JAVASCRIPT WITH SECRETS ASSIGNED TO NODE ${i}__`)
      await runSimulation(requestConfig)
    }
    return
  }

  console.log("\n__Simulating JavaScript__")
  await runSimulation(requestConfig)
})()
