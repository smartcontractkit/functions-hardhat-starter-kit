function numberWithCommas(x) {
  return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",")
}

async function getPriceUSD(address, ethers) {
  const priceFeed = new ethers.Contract(
    address,
    [
      {
        inputs: [],
        name: "decimals",
        outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "latestRoundData",
        outputs: [
          { internalType: "uint80", name: "roundId", type: "uint80" },
          { internalType: "int256", name: "answer", type: "int256" },
          { internalType: "uint256", name: "startedAt", type: "uint256" },
          { internalType: "uint256", name: "updatedAt", type: "uint256" },
          { internalType: "uint80", name: "answeredInRound", type: "uint80" },
        ],
        stateMutability: "view",
        type: "function",
      },
    ],
    ethers.provider
  )
  const decimals = await priceFeed.decimals()
  const latestRound = await priceFeed.latestRoundData()
  return ethers.utils.formatUnits(latestRound.answer, decimals)
}

module.exports = {
  numberWithCommas,
  getPriceUSD,
}
