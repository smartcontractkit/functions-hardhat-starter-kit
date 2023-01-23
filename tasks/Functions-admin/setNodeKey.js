const { VERIFICATION_BLOCK_CONFIRMATIONS, networkConfig } = require("../../network-config")

task("functions-set-node-key", "Sets the per-node public key in the Functions oracle contract")
  .addParam("key", "Node-assigned public key")
  .addOptionalParam("node", "Address of the node for which the public key is to be set (defaults to msg.sender)")
  .setAction(async (taskArgs) => {
    if (network.name === "hardhat") {
      throw Error("This command cannot be used on a local development chain.  Specify a valid network.")
    }

    let overrides = undefined
    if (network.name === "goerli") {
      overrides = {
        // be careful, this may drain your balance quickly
        maxPriorityFeePerGas: ethers.utils.parseUnits("50", "gwei"),
        maxFeePerGas: ethers.utils.parseUnits("50", "gwei"),
      }
    }

    const oracleFactory = await ethers.getContractFactory("FunctionsOracle")
    const oracle = oracleFactory.attach(networkConfig[network.name]["functionsOracle"])

    const accounts = await ethers.getSigners()
    const sender = accounts[0]

    const nodeAddress = taskArgs.node ?? sender.address

    console.log(`Setting node public key to ${taskArgs.key} for oracle ${networkConfig[network.name]["functionsOracle"]}`)
    const setTx = overrides
      ? await oracle.setNodePublicKey(nodeAddress, "0x" + taskArgs.key, overrides)
      : await oracle.setNodePublicKey(nodeAddress, "0x" + taskArgs.key)

    console.log(`Waiting ${VERIFICATION_BLOCK_CONFIRMATIONS} blocks for transaction ${setTx.hash} to be confirmed...`)
    await setTx.wait(VERIFICATION_BLOCK_CONFIRMATIONS)

    console.log(`\nNode key set for node ${nodeAddress} for oracle contract ${oracle.address} on ${network.name}`)
  })
