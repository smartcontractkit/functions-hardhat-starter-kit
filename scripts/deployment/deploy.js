const { network, run } = require('hardhat')

const { deployOcr2odOracle } = require('./deployOcr2odOracle')

async function main() {
  await run('compile')
  const chainId = network.config.chainId
  await deployOcr2odOracle(chainId)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
