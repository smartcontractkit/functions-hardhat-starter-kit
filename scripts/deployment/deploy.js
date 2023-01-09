const { network, run } = require('hardhat')

const { deployOcr2odOracle } = require('./deployOcr2odOracle')

async function main() {
  await run('compile')
  await deployOcr2odOracle()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
