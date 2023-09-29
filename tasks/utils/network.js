const BASE_URLS = {
  1: "https://etherscan.io/",
  137: "https://polygonscan.com/",
  43114: "https://snowtrace.io/",
  80001: "https://mumbai.polygonscan.com/",
  11155111: "https://sepolia.etherscan.io/",
  43113: "https://testnet.snowtrace.io/",
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
