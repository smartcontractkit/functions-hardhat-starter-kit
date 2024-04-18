const BASE_URLS = {
  1: "https://etherscan.io/",
  137: "https://polygonscan.com/",
  43114: "https://snowtrace.io/",
  80001: "https://mumbai.polygonscan.com/",
  80002: "https://api-amoy.polygonscan.com/api",
  11155111: "https://sepolia.etherscan.io/",
  43113: "https://testnet.snowtrace.io/",
  421614: "https://sepolia.arbiscan.io/",
  42161: "https://arbiscan.io/",
  84532: "https://sepolia.basescan.org/",
  11155420: "https://sepolia-optimistic.etherscan.io/",
}

/**
 * Returns the Etherscan API domain for a given chainId.
 *
 * @param chainId Ethereum chain ID
 */
function getEtherscanURL(chainId) {
  const idNotFound = !Object.keys(BASE_URLS).includes(chainId.toString())
  if (idNotFound) {
    throw new Error("Invalid chain Id")
  }
  return BASE_URLS[chainId]
}

module.exports = {
  getEtherscanURL,
}
