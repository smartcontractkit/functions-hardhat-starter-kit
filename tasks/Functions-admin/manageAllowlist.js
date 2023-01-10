const { VERIFICATION_BLOCK_CONFIRMATIONS, networkConfig } = require('../../network-config')

const Action = {
  Add: 0,
  Remove: 1,
}

async function addOrRemove(action, taskArgs) {
  if (network.name === 'hardhat') {
    throw Error('This command cannot be used on a local development chain.  Specify a valid network.')
  }

  let overrides = undefined
  if (network.name === 'goerli') {
    overrides = {
      // be careful, this may drain your balance quickly
      maxPriorityFeePerGas: ethers.utils.parseUnits("50", "gwei"),
      maxFeePerGas: ethers.utils.parseUnits("50", "gwei"),
    }
  }

  const oracleFactory = await ethers.getContractFactory('FunctionsOracle')
  const oracle = oracleFactory.attach(networkConfig[network.name]['functionsOracle'])

  const addresses = taskArgs.addresses.split(',')
  console.log(addresses)

  if (action == Action.Add) {
    console.log(`Adding addresses ${addresses} to oracle ${networkConfig[network.name]['functionsOracle']}`)
    tx = overrides
      ? await oracle.addAuthorizedSenders(addresses, overrides)
      : await oracle.addAuthorizedSenders(addresses)
  } else {
    console.log(`Removing addresses ${addresses} from oracle ${networkConfig[network.name]['functionsOracle']}`)
    tx = overrides
     ? await oracle.removeAuthorizedSenders(addresses, overrides)
     : await oracle.removeAuthorizedSenders(addresses)
  }

  console.log(`Waiting ${VERIFICATION_BLOCK_CONFIRMATIONS} blocks for transaction ${tx.hash} to be confirmed...`)
  await tx.wait(VERIFICATION_BLOCK_CONFIRMATIONS)

  console.log(`Allowlist updated for oracle ${oracle.address} on ${network.name}`)
}

task('functions-add-senders', 'Add wallets to allowlist in the Oracle contract')
  .addParam('addresses', 'Comma-separated list of addresses')
  .setAction(async (taskArgs) => {
    await addOrRemove(Action.Add, taskArgs)
  })

task('functions-remove-senders', 'Remove wallets from allowlist in the Oracle contract')
  .addParam('addresses', 'Comma-separated list of addresses')
  .setAction(async (taskArgs) => {
    await addOrRemove(Action.Remove, taskArgs)
  })
