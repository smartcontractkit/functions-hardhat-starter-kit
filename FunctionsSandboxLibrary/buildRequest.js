"use strict"
Object.defineProperty(exports, "__esModule", { value: true })
exports.buildRequest = void 0
const getRequestConfig_1 = require("./getRequestConfig")
const encryptSecrets_1 = require("./encryptSecrets")
const buildRequest = async (unvalidatedConfig) => {
  const config = (0, getRequestConfig_1.getRequestConfig)(unvalidatedConfig)
  const request = { source: config.source }
  if (
    (config.secrets && Object.keys(config.secrets).length > 0) ||
    (config.secretsURLs && config.secretsURLs.length > 0)
  ) {
    if (!config.DONPublicKey) {
      throw Error(`DONPublicKey not in config`)
    }
    if (config.secretsLocation === getRequestConfig_1.Location_.Inline) {
      if (typeof config.secrets !== "object") {
        throw Error("Unsupported inline secrets format.  Inline secrets must be an object")
      }
      // If the secrets object is empty, do nothing, else encrypt secrets
      if (Object.keys(config.secrets).length !== 0) {
        request.secrets =
          "0x" +
          (await (0, encryptSecrets_1.encryptWithSignature)(
            config.walletPrivateKey,
            config.DONPublicKey,
            JSON.stringify(config.secrets)
          ))
      }
    }
    if (config.secretsLocation === getRequestConfig_1.Location_.Remote) {
      if (!Array.isArray(config.secretsURLs)) {
        throw Error("Unsupported remote secrets format.  Remote secrets must be an array.")
      }
      // If the secrets URLs is empty, do nothing, else encrypt secrets URLs
      if (config.secretsURLs.length > 0) {
        request.secrets =
          "0x" + (await (0, encryptSecrets_1.encrypt)(config.DONPublicKey, config.secretsURLs.join(" ")))
      }
    }
  }
  if (config.args) {
    request.args = config.args
  }
  return request
}
exports.buildRequest = buildRequest
