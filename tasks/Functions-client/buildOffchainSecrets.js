const { getDecodedResultLog } = require("../../FunctionsSandboxLibrary")
const { encrypt, encryptWithSignature } = require('../../FunctionsSandboxLibrary/encryptSecrets')
const { networkConfig } = require('../../network-config')
const fs = require('fs')

task("functions-build-offchain-secrets", "Builds an off-chain secrets object for one or many nodes that can be uploaded and referenced via URL")
  .addOptionalParam("output", "Output file name (defaults to offchain-secrets.json)")
  .setAction(async (taskArgs) => {
    if (network.name === "hardhat") {
      throw Error(
        'This command cannot be used on a local hardhat chain.'
      )
    }

    const requestConfig = require("../../Functions-request-config")

    // Verify that perNodeSecrets and/or secrets is correctly specified in the config
    if (requestConfig.perNodeSecrets && !Array.isArray(requestConfig.perNodeSecrets)) {
      throw Error('perNodeSecrets is not correctly specified in config file.  It must be an array of objects.')
    }

    if (requestConfig.secrets && typeof requestConfig.secrets !== 'object') {
      throw Error('secrets object is not correctly specified in config file.  It must be an object.')
    }

    if (
      (!requestConfig.perNodeSecrets || requestConfig.perNodeSecrets.length === 0)
      && (!requestConfig.secrets || Object.keys(requestConfig.secrets).length === 0)
    ) {
      throw Error('Neither perNodeSecrets nor secrets is specified')
    }

    const defaultSecretsObjectKeys = requestConfig.secrets
      ? JSON.stringify(Object.keys(requestConfig.secrets).sort())
      : undefined

    if (!requestConfig.secrets || defaultSecretsObjectKeys.length === 0) {
      console.log("\nWARNING: No default `secrets` provided.  If DON membership changes, the new node will not be able to process requests.\n")
    }

    if (requestConfig.perNodeSecrets && requestConfig.perNodeSecrets.length > 0) {
      const firstPerNodeSecretsKeys = JSON.stringify(Object.keys(requestConfig.perNodeSecrets[0]).sort())

      for (const assignedSecrets of requestConfig.perNodeSecrets) {
        if (typeof assignedSecrets !== 'object') {
          throw Error('perNodeSecrets is not correctly specified in config file.  It must be an array of objects.')
        }
  
        if (Object.keys(assignedSecrets).length === 0) {
          throw Error('In the config file, perNodeSecrets contains an empty object.')
        }
  
        const secretsObjectKeys = JSON.stringify(Object.keys(assignedSecrets).sort())
  
        if (
          requestConfig.secrets
          && defaultSecretsObjectKeys.length > 0
          && defaultSecretsObjectKeys !== secretsObjectKeys
        ) {
          throw Error('In the config file, not all objects in `perNodeSecrets` have the same object keys as default `secrets`. (The values can be different, but the keys should be the same between all objects.)')
        }

        if (firstPerNodeSecretsKeys !== secretsObjectKeys) {
          throw Error('In the config file, not all objects in `perNodeSecrets` have the same object keys. (The values can be different, but the keys should be the same between all objects.)')
        }
      }
    }

    console.log(`Using public keys from FunctionsOracle contract ${networkConfig[network.name]['functionsOracle']} on network ${network.name}`)
    const OracleFactory = await ethers.getContractFactory("FunctionsOracle")
    const oracleContract = await OracleFactory.attach(networkConfig[network.name]['functionsOracle'])

    const [ nodeAddresses, publicKeys ] = await oracleContract.getAllNodePublicKeys()

    if (
      requestConfig.perNodeSecrets
      && requestConfig.perNodeSecrets.length !== nodeAddresses.length
      && requestConfig.perNodeSecrets.length !== 0
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
            publicKeys[i].slice(2),
            JSON.stringify(requestConfig.perNodeSecrets[i])
          ),
          'hex',
        ).toString('base64')
      }
    }

    // if `secrets` is specified in the config, use those as the default secrets under the 0x0 entry
    if (requestConfig.secrets && Object.keys(requestConfig.secrets).length > 0) {
      const DONPublicKey = await oracleContract.getDONPublicKey()
      offchainSecrets['0x0'] = Buffer.from(
        await encryptWithSignature(
          process.env.PRIVATE_KEY,
          DONPublicKey.slice(2),
          JSON.stringify(requestConfig.secrets)
        ),
        'hex',
      ).toString('base64')
    }

    fs.writeFileSync(taskArgs.output ?? 'offchain-secrets.json', JSON.stringify(offchainSecrets))
    console.log(`\nWrote offchain secrets file to ${taskArgs.output ?? 'offchain-secrets.json'}`)
  })
