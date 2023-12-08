const ethers = await import("npm:ethers")

const userAddress = bytesArgs[0]
const nftID = parseInt(bytesArgs[1].slice(2), 16)
const nftAddress = bytesArgs[2]
const abi = ["function ownerOf(uint256 tokenId) view returns (address)"]

// Custom JsonRpcProvider class which using the standard fetch API
class FunctionsJsonRpcProvider extends ethers.JsonRpcProvider {
  constructor(url) {
    super(url)
    this.url = url
  }
  async _send(payload) {
    let resp = await fetch(this.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    return resp.json()
  }
}

const provider = new FunctionsJsonRpcProvider(secrets.RPC_URL)

const nftContract = new ethers.Contract(nftAddress, abi, provider)
const ethNftOwner = await nftContract.ownerOf(nftID)

if (ethNftOwner.toLowerCase() !== userAddress.toLowerCase()) {
  throw new Error("User does not own NFT")
}
// Return to indicate success
return new Uint8Array([])
