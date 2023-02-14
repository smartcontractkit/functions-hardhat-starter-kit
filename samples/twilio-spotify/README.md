# Sample Twilio-Spotify Sample app


## Use Case Description

This use case creates a `RecordLabel` smart contract. This contract represents an on-chain payment contract between a music artist and the record label.

Chainlink Functions is used to poll the latest monthly streaming numbers for the artist, using Soundcharts' spotify API. 

If the artist has acquired new streams since last measured, the Chainlink Functions code will use the Twilio-Sendgrid email API to send the artist an email informing them that some payments are coming their way.  The Functions code will also send the latest stream count back to the smart contract so it can be recorded immutably on the blockchain. The returned value is passed through [Chainlink's Off Chain Reporting consensus mechanism](https://docs.chain.link/architecture-overview/off-chain-reporting/) - which the nodes in the [Decentralized Oracle Network](https://chain.link/whitepaper) that are returning this streams data achieve a cryptographically verifiable consensus on that returned data!  

The smart contract can then calculate how much LINK to send to the artist. The record label and the artist have an agreed payment rate:  for example, the artist gets 0.01 LINK tokens for every 1000 additional steams.  This rate is part of the smart contract's code and represents a trust-minimized, verifiable, on-chain record of the agreement. 

## Instructions to run this sample

1. Get your Twilio Sendgrid API Keys by following [these docs](https://docs.sendgrid.com/for-developers/sending-email/api-getting-started). <b> You cannot use this sample without completing the Sendgrid setup steps!</b>

2. Ensure you follow the verify process for the email address that you intend to send from. Sendgrid needs to approve it.

3. Take a look at the [soundcharts sandbox api](https://doc.api.soundcharts.com/api/v2/doc). Note that the sandbox's API credentials are public for a very limited data set. It's enough for this sample.

4. Set your Environment Variables in a `.env` file this repo's root directory.  You would need the following additional Environment Variables (please refer to the `.env.example` file):
        
        ARTIST_EMAIL="YOU_CAN_PUT_YOUR_EMAIL_HERE" 
        TWILIO_API_KEY="YOUR TWILIO API KEY"
        SOUNDCHART_APP_ID="soundcharts"
        SOUNDCHART_API_KEY="soundcharts"

5. Study the file `./Twilio-Spotify-Functions-Source-Example.js`. Ensure you fill in the `VERIFIED_SENDER` constant.  

6. Study the `RecordLabel` contract in `../../contracts/sample-apps/RecordLabel.sol` which makes the request and receives the results sent by the Functions source code example.  

7. Copy the value of the variable `requestConfig` in `./twilio-spotify-requestConfig.js` and replace the value of `requestConfig` in `../../Functions-request-config.js`.  Note that this example uses Off Chain Secrets.  Follow the instructions in the Main README on how to use Off Chain Secrets.

8. > :warning: **Update the Functions Consumer Contract in code**:When you're ready to run the CLI scripts described in the main README file, make sure you update the references to the client smart contract correctly. 

    When running the CLI commands (which are Hardhat [tasks](https://hardhat.org/hardhat-runner/docs/guides/tasks-and-scripts)), be sure to find the script that implements the task in `/tasks` directory, and change the Contract name in the line that looks like this `const clientFactory = await ethers.getContractFactory("FunctionsConsumer")`. In the Twilio-spotify sample, the contract in this line will read as `const clientFactory = await ethers.getContractFactory("RecordLabel")`


