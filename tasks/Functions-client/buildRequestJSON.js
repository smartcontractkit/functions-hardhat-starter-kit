const { simulateRequest, buildRequest, getRequestConfig } = require("../../FunctionsSandboxLibrary")
const { networkConfig } = require("../../network-config")
const readline = require("readline-promise").default
const axios = require("axios")
const fs = require("fs")

task("functions-build-request", "Creates a JSON file with Functions request parameters")
  .addOptionalParam("output", "Output file name (defaults to Functions-request.json)")
  .setAction(async (taskArgs, hre) => {

    const OracleFactory = await ethers.getContractFactory("FunctionsOracle")
    const oracle = await OracleFactory.attach(networkConfig[network.name]["functionsOracle"])

    console.log("Simulating Functions request locally...")
    const unvalidatedRequestConfig = require("../../Functions-request-config.js")
    const requestConfig = getRequestConfig(unvalidatedRequestConfig)

    if (requestConfig.secretsLocation === 1) {
      if (!requestConfig.secrets || Object.keys(requestConfig.secrets).length === 0) {
        requestConfig.secrets = requestConfig.perNodeOffchainSecrets[0] ?? {}
      }
      // Get node addresses for off-chain secrets
      const [nodeAddresses, publicKeys] = await oracle.getAllNodePublicKeys()
      if (requestConfig.secretsURLs && requestConfig.secretsURLs.length > 0) {
        await verifyOffchainSecrets(requestConfig.secretsURLs, nodeAddresses)
      }
    }

    const { success, resultLog } = await simulateRequest(requestConfig)
    console.log(`\n${resultLog}`)

    // If the simulated JavaScript source code contains an error, confirm the user still wants to continue
    if (!success) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      })
      const q1answer = await rl.questionAsync(
        "There was an error when running the JavaScript source code for the request.\nContinue? (y) Yes / (n) No\n"
      )
      rl.close()
      if (q1answer.toLowerCase() !== "y" && q1answer.toLowerCase() !== "yes") {
        return
      }
    }

    // Fetch the DON public key from on-chain
    const DONPublicKey = await oracle.getDONPublicKey()
    // Remove the preceding 0x from the DON public key
    requestConfig.DONPublicKey = DONPublicKey.slice(2)
    // Build the parameters to make a request from the client contract
    const request = await buildRequest(requestConfig)

    fs.writeFileSync(taskArgs.output ?? "Functions-request.json", JSON.stringify(request))
    console.log(`Wrote request to ${taskArgs.output ?? "Functions-request.json"}`)
  })

const verifyOffchainSecrets = async (secretsURLs, nodeAddresses) => {
  const offchainSecretsResponses = []
  for (const url of secretsURLs) {
    try {
      const response = await axios.request({
        url,
        timeout: 3000,
        responseType: "json",
        maxContentLength: 1000000,
      })
      offchainSecretsResponses.push({
        url,
        secrets: response.data,
      })
    } catch (error) {
      throw Error(`Failed to fetch off-chain secrets from ${url}\n${error}`)
    }
  }

  for (const { secrets, url } of offchainSecretsResponses) {
    if (JSON.stringify(secrets) !== JSON.stringify(offchainSecretsResponses[0].secrets)) {
      throw Error(
        `Off-chain secrets URLs ${url} and ${offchainSecretsResponses[0].url} do not contain the same JSON object.  All secrets URLs must have an identical JSON object.`
      )
    }

    for (const nodeAddress of nodeAddresses) {
      if (!secrets[nodeAddress.toLowerCase()]) {
        if (!secrets["0x0"]) {
          throw Error(`No secrets specified for node ${nodeAddress.toLowerCase()} and no default secrets found.`)
        }
        console.log(
          `WARNING: No secrets found for node ${nodeAddress.toLowerCase()}.  That node will use default secrets specified by the "0x0" entry.`
        )
      }
    }
  }
}

exports.verifyOffchainSecrets = verifyOffchainSecrets
