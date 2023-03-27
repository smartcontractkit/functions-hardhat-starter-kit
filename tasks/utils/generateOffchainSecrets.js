const { encryptWithSignature } = require('../../FunctionsSandboxLibrary/encryptSecrets')

const generateOffchainSecrets = async (requestConfig, privateKey, DONPublicKey, nodeAddresses, perNodePublicKeys) => {
  validateRequestConfig(requestConfig)

  if (
    requestConfig.perNodeOffchainSecrets &&
    requestConfig.perNodeOffchainSecrets.length !== nodeAddresses.length &&
    requestConfig.perNodeOffchainSecrets.length !== 0
  ) {
    throw Error(
      `The number of per-node secrets must match the number of nodes.  Length of perNodeOffchainSecrets: ${requestConfig.perNodeOffchainSecrets.length} Number of nodes: ${nodeAddresses.length}`
    )
  }

  const offchainSecrets = {}

  if (requestConfig.perNodeOffchainSecrets && Object.keys(requestConfig.perNodeOffchainSecrets).length > 0) {
    for (let i = 0; i < nodeAddresses.length; i++) {
      offchainSecrets[nodeAddresses[i].toLowerCase()] = Buffer.from(
        await encryptWithSignature(
          process.env.PRIVATE_KEY,
          perNodePublicKeys[i].slice(2),
          JSON.stringify(requestConfig.perNodeOffchainSecrets[i])
        ),
        "hex"
      ).toString("base64")
    }
  }

  // if globalOffchainSecrets is specified in the config, use those as the default secrets under the 0x0 entry
  if (requestConfig.globalOffchainSecrets && Object.keys(requestConfig.globalOffchainSecrets).length > 0) {
    offchainSecrets["0x0"] = Buffer.from(
      await encryptWithSignature(
        privateKey,
        DONPublicKey.slice(2),
        JSON.stringify(requestConfig.globalOffchainSecrets)
      ),
      "hex"
    ).toString("base64")
  }

  return offchainSecrets
}

const validateRequestConfig = (requestConfig) => {
  // Verify that perNodeOffchainSecrets and/or secrets is correctly specified in the config
  if (requestConfig.perNodeOffchainSecrets && !Array.isArray(requestConfig.perNodeOffchainSecrets)) {
    throw Error("perNodeOffchainSecrets is not correctly specified in config file.  It must be an array of objects.")
  }

  if (requestConfig.globalOffchainSecrets && typeof requestConfig.globalOffchainSecrets !== "object") {
    throw Error("globalOffchainSecrets object is not correctly specified in config file.  It must be an object.")
  }

  if (
    (!requestConfig.perNodeOffchainSecrets || requestConfig.perNodeOffchainSecrets.length === 0) &&
    (!requestConfig.globalOffchainSecrets || Object.keys(requestConfig.globalOffchainSecrets).length === 0)
  ) {
    throw Error("Neither perNodeOffchainSecrets nor globalSecrets is specified")
  }

  const globalOffchainSecretsObjectValues = Object.values(requestConfig.globalOffchainSecrets)

  if (
    !globalOffchainSecretsObjectValues.every((s) => {
      return typeof s === "string"
    })
  ) {
    throw Error("Only string values are supported in secrets objects.")
  }

  const globalOffchainSecretsObjectKeys = requestConfig.globalOffchainSecrets
    ? Object.keys(requestConfig.globalOffchainSecrets).sort()
    : undefined

  if (!requestConfig.globalOffchainSecrets || globalOffchainSecretsObjectKeys.length === 0) {
    console.log(
      "\nWARNING: No global secrets provided.  If DON membership changes, the new node will not be able to process requests.\n"
    )
  }

  if (requestConfig.perNodeOffchainSecrets && requestConfig.perNodeOffchainSecrets.length > 0) {
    const firstperNodeOffchainSecretsKeys = Object.keys(requestConfig.perNodeOffchainSecrets[0]).sort()

    for (const assignedSecrets of requestConfig.perNodeOffchainSecrets) {
      if (typeof assignedSecrets !== "object") {
        throw Error(
          "perNodeOffchainSecrets is not correctly specified in config file.  It must be an array of objects."
        )
      }

      if (
        !Object.values(assignedSecrets).every((s) => {
          return typeof s === "string"
        })
      ) {
        throw Error("Only string values are supported in secrets objects.")
      }

      if (Object.keys(assignedSecrets).length === 0) {
        throw Error("In the config file, perNodeOffchainSecrets contains an empty object.")
      }

      const secretsObjectKeys = Object.keys(assignedSecrets).sort()

      if (
        requestConfig.globalOffchainSecrets &&
        globalOffchainSecretsObjectKeys.length > 0 &&
        JSON.stringify(globalOffchainSecretsObjectKeys) !== JSON.stringify(secretsObjectKeys)
      ) {
        throw Error(
          "In the config file, not all objects in `perNodeOffchainSecrets` have the same object keys as `globalSecrets`. (The values can be different, but the keys should be the same between all objects.)"
        )
      }

      if (JSON.stringify(firstperNodeOffchainSecretsKeys) !== JSON.stringify(secretsObjectKeys)) {
        throw Error(
          "In the config file, not all objects in `perNodeOffchainSecrets` have the same object keys. (The values can be different, but the keys should be the same between all objects.)"
        )
      }
    }
  }
}

module.exports = { generateOffchainSecrets }