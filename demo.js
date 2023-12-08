const ethers = await import("npm:ethers")

const userAddress = args[0]
const nftContractAddress = args[1]
const nftID = args[2]
const abi = ["function ownerOf(uint256 tokenId) view returns (address)"]

// Custom JsonRpcProvider class which using the fetch API
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
const ethNftOwner = await nftContract.ownerOf(addressToCheck)

if (ethNftOwner !== userAddress) {
  throw new Error("User does not own NFT")
}
// Return to indicate success
return new Uint8Array([1])
