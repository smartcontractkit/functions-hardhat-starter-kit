const { encryptWithSignature } = require("../../FunctionsSandboxLibrary/encryptSecrets")

const generateOffchainSecrets = async (requestConfig, privateKey, DONPublicKey, nodeAddresses, perNodePublicKeys) => {
  validateRequestConfig(requestConfig)

  if (
    requestConfig.perNodeSecrets &&
    requestConfig.perNodeSecrets.length !== nodeAddresses.length &&
    requestConfig.perNodeSecrets.length !== 0
  ) {
    throw Error(
      `The number of per-node secrets must match the number of nodes.  Length of perNodeSecrets: ${requestConfig.perNodeSecrets.length} Number of nodes: ${nodeAddresses.length}`
    )
  }

  const offchainSecrets = {}

  if (requestConfig.perNodeSecrets && Object.keys(requestConfig.perNodeSecrets).length > 0) {
    for (let i = 0; i < nodeAddresses.length; i++) {
      offchainSecrets[nodeAddresses[i].toLowerCase()] = Buffer.from(
        await encryptWithSignature(
          process.env.PRIVATE_KEY,
          perNodePublicKeys[i].slice(2),
          JSON.stringify(requestConfig.perNodeSecrets[i])
        ),
        "hex"
      ).toString("base64")
    }
  }

  // if secrets is specified in the config, use those as the default secrets under the 0x0 entry
  if (requestConfig.secrets && Object.keys(requestConfig.secrets).length > 0) {
    offchainSecrets["0x0"] = Buffer.from(
      await encryptWithSignature(privateKey, DONPublicKey.slice(2), JSON.stringify(requestConfig.secrets)),
      "hex"
    ).toString("base64")
  }

  return offchainSecrets
}

const validateRequestConfig = (requestConfig) => {
  // Verify that perNodeSecrets and/or secrets is correctly specified in the config
  if (requestConfig.perNodeSecrets && !Array.isArray(requestConfig.perNodeSecrets)) {
    throw Error("perNodeSecrets is not correctly specified in config file.  It must be an array of objects.")
  }

  if (requestConfig.secrets && typeof requestConfig.secrets !== "object") {
    throw Error("secrets object is not correctly specified in config file.  It must be an object.")
  }

  if (
    (!requestConfig.perNodeSecrets || requestConfig.perNodeSecrets.length === 0) &&
    (!requestConfig.secrets || Object.keys(requestConfig.secrets).length === 0)
  ) {
    throw Error("Neither perNodeSecrets nor secrets is specified")
  }

  const secretsObjectValues = Object.values(requestConfig.secrets)

  if (
    !secretsObjectValues.every((s) => {
      return typeof s === "string"
    })
  ) {
    throw Error("Only string values are supported in secrets objects.")
  }

  const globalSecretsObjectKeys = requestConfig.secrets ? Object.keys(requestConfig.secrets).sort() : undefined

  if (!requestConfig.secrets || globalSecretsObjectKeys.length === 0) {
    console.log(
      "\nWARNING: No global secrets provided.  If DON membership changes, the new node will not be able to process requests.\n"
    )
  }

  if (requestConfig.perNodeSecrets && requestConfig.perNodeSecrets.length > 0) {
    const firstperNodeSecretsKeys = Object.keys(requestConfig.perNodeSecrets[0]).sort()

    for (const assignedSecrets of requestConfig.perNodeSecrets) {
      if (typeof assignedSecrets !== "object") {
        throw Error("perNodeSecrets is not correctly specified in config file.  It must be an array of objects.")
      }

      if (
        !Object.values(assignedSecrets).every((s) => {
          return typeof s === "string"
        })
      ) {
        throw Error("Only string values are supported in secrets objects.")
      }

      if (Object.keys(assignedSecrets).length === 0) {
        throw Error("In the config file, perNodeSecrets contains an empty object.")
      }

      const assignedSecretsObjectKeys = Object.keys(assignedSecrets).sort()

      if (
        requestConfig.secrets &&
        globalSecretsObjectKeys.length > 0 &&
        JSON.stringify(globalSecretsObjectKeys) !== JSON.stringify(assignedSecretsObjectKeys)
      ) {
        throw Error(
          "In the config file, not all objects in `perNodeSecrets` have the same object keys as `globalSecrets`. (The values can be different, but the keys should be the same between all objects.)"
        )
      }

      if (JSON.stringify(firstperNodeSecretsKeys) !== JSON.stringify(assignedSecretsObjectKeys)) {
        throw Error(
          "In the config file, not all objects in `perNodeSecrets` have the same object keys. (The values can be different, but the keys should be the same between all objects.)"
        )
      }
    }
  }
}

module.exports = { generateOffchainSecrets }
