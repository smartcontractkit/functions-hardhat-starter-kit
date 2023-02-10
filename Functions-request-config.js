const fs = require("fs")

// Loads environment variables from .env file (if it exists)
require("dotenv").config()

const Location = {
  Inline: 0,
  Remote: 1,
}

const CodeLanguage = {
  JavaScript: 0,
}

const ReturnType = {
  uint: "uint256",
  uint256: "uint256",
  int: "int256",
  int256: "int256",
  string: "string",
  bytes: "Buffer",
  Buffer: "Buffer",
}

// Configure the request by setting the fields below
const requestConfig = { // TODO @zubin reinstate
  // location of source code (only Inline is currently supported)
  codeLocation: Location.Inline,
  // location of secrets (Inline or Remote)
  secretsLocation: Location.Remote,
  // code language (only JavaScript is currently supported)
  codeLanguage: CodeLanguage.JavaScript,
  // string containing the source code to be executed. Relative path used.
  source: fs.readFileSync("samples/twilio-spotify/Twilio-Spotify-Functions-Source-Example.js").toString(),
  // secrets can be accessed within the source code with `secrets.varName` (ie: secrets.apiKey)
  secrets: {},
  // ETH wallet key used to sign secrets so they cannot be accessed by a 3rd party
  walletPrivateKey: process.env["PRIVATE_KEY"],
  // args (string only array) can be accessed within the source code with `args[index]` (ie: args[0]).
  // artistID is the externally supplied Arg. Artist details are stored on contract.
  // args in sequence are: ArtistID, artistname,  lastListenerCount, artist email
  args: ["ca22091a-3c00-11e9-974f-549f35141000", "Tones&I", "123456", process.env.ARTIST_EMAIL], // TONES_AND_I
  // expected type of the returned value
  expectedReturnType: ReturnType.uint256,
  // Redundant URLs which point to encrypted off-chain secrets
  secretsURLs: [
    "https://gist.githubusercontent.com/zeuslawyer/b307549406ad4c72b741efc5b1547332/raw/18a6507a05bd56826e94fcc8cb5c69997647d122/gistfile1.txt",
  ],
  // Default offchain secrets object used by the `functions-build-offchain-secrets` command
  globalOffchainSecrets: {
    // DON level API Keys
    soundchartAppId: process.env.SOUNDCHART_APP_ID,
    soundchartApiKey: process.env.SOUNDCHART_API_KEY,
    twilioApiKey: "",
  },
  // Per-node offchain secrets objects used by the `functions-build-offchain-secrets` command
  perNodeOffchainSecrets: [
    {
      soundchartAppId: process.env.SOUNDCHART_APP_ID,
      soundchartApiKey: process.env.SOUNDCHART_API_KEY,
      twilioApiKey: process.env.TWILIO_API_KEY,
    },
    // Node level API Keys
    {
      soundchartAppId: process.env.SOUNDCHART_APP_ID,
      soundchartApiKey: process.env.SOUNDCHART_API_KEY,
      twilioApiKey: "",
    },
    {
      soundchartAppId: process.env.SOUNDCHART_APP_ID,
      soundchartApiKey: process.env.SOUNDCHART_API_KEY,
      twilioApiKey: "",
    },
    {
      soundchartAppId: process.env.SOUNDCHART_APP_ID,
      soundchartApiKey: process.env.SOUNDCHART_API_KEY,
      twilioApiKey: "",
    },
  ],
}

// {
//   // location of source code (only Inline is currently supported)
//   codeLocation: Location.Inline,
//   // location of secrets (Inline or Remote)
//   secretsLocation: Location.Inline,
//   // code language (only JavaScript is currently supported)
//   codeLanguage: CodeLanguage.JavaScript,
//   // string containing the source code to be executed
//   source: fs.readFileSync("./Functions-request-source-calculation-example.js").toString(),
//   //source: fs.readFileSync('./Functions-request-source-API-example.js').toString(),
//   // secrets can be accessed within the source code with `secrets.varName` (ie: secrets.apiKey)
//   secrets: { apiKey: process.env.COINMARKETCAP_API_KEY },
//   // ETH wallet key used to sign secrets so they cannot be accessed by a 3rd party
//   walletPrivateKey: process.env["PRIVATE_KEY"],
//   // args (string only array) can be accessed within the source code with `args[index]` (ie: args[0]).
//   args: ["1", "bitcoin", "btc-bitcoin", "btc", "1000000", "450"],
//   // expected type of the returned value
//   expectedReturnType: ReturnType.uint256,
//   // Redundant URLs which point to encrypted off-chain secrets
//   secretsURLs: [],
//   // Default offchain secrets object used by the `functions-build-offchain-secrets` command
//   globalOffchainSecrets: {},
//   // Per-node offchain secrets objects used by the `functions-build-offchain-secrets` command
//   perNodeOffchainSecrets: [],
// }

module.exports = requestConfig
