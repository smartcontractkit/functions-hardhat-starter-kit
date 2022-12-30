const { VERIFICATION_BLOCK_CONFIRMATIONS, contractAddresses } = require('../../network-config')

const Action = {
  Add: 0,
  Remove: 1,
}

async function addOrRemove(action, taskArgs) {
  if (network.name === 'hardhat') {
    throw Error('This command cannot be used on a local development chain.  Specify a valid network.')
  }

  const oracleFactory = await ethers.getContractFactory('OCR2DROracle')
  const oracle = oracleFactory.attach(contractAddresses[network.name]['ocr2drOracle'])

  const addresses = taskArgs.addresses.split(',')
  console.log(addresses)

  if (action == Action.Add) {
    console.log(`Adding addresses ${addresses} to oracle ${contractAddresses[network.name]['ocr2drOracle']}`)
    tx = await oracle.addAuthorizedSenders(addresses)
  } else {
    console.log(`Removing addresses ${addresses} from oracle ${contractAddresses[network.name]['ocr2drOracle']}`)
    tx = await oracle.removeAuthorizedSenders(addresses)
  }

  console.log(`Waiting ${VERIFICATION_BLOCK_CONFIRMATIONS} blocks for transaction ${tx.hash} to be confirmed...`)
  await tx.wait(VERIFICATION_BLOCK_CONFIRMATIONS)

  console.log(`Allowlist updated for oracle ${oracle.address} on ${contractAddresses[network.name].name}`)
}

task('on-demand-add-senders', 'Add wallets to allowlist in the Oracle contract')
  .addParam('addresses', 'Comma-separated list of addresses')
  .setAction(async (taskArgs) => {
    await addOrRemove(Action.Add, taskArgs)
  })

task('on-demand-remove-senders', 'Remove wallets from allowlist in the Oracle contract')
  .addParam('addresses', 'Comma-separated list of addresses')
  .setAction(async (taskArgs) => {
    await addOrRemove(Action.Remove, taskArgs)
  })
