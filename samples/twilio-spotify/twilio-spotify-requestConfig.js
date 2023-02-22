// Soundchart Artist IDs for sandbox are available from https://doc.api.soundcharts.com/api/v2/doc/sandbox-data
const BILLIE_EILISH = "11e81bcc-9c1c-ce38-b96b-a0369fe50396"
const TONES_AND_I = "ca22091a-3c00-11e9-974f-549f35141000"

// Copy the object below and paste it into Functions-request-config.js file
// to assign it to the requestConfig  constant there.
const requestConfig = {
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
    "https://gist.githubusercontent.com/zeuslawyer/b307549406ad4c72b741efc5b1547332/raw/b977d4a9493faa17e4469cfdb01e260fec9c5df5/ETH.txt",
  ],
  // Default offchain secrets object used by the `functions-build-offchain-secrets` command
  globalOffchainSecrets: {
    // DON level API Keys
    soundchartAppId: process.env.SOUNDCHART_APP_ID,
    soundchartApiKey: process.env.SOUNDCHART_API_KEY,
    twilioApiKey: process.env.TWILIO_API_KEY,
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
