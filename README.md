# Chainlink Functions Workshop

This is a guide for a simple demo of using Chainlink Functions for checking cross-chain NFT ownership. This means, for example, you could allow a user to interact with a smart contract on Polygon if they own a certain NFT on Ethereum.

## Prerequisites

In order to complete this demo, you will need the following:

- An Ethereum Sepolia and a Polygon Mumbai RPC URL. If you do not already have them, you can create an Infura account to get free RPC URLs:
   1. Go to [infura.io](https://www.infura.io/)
   2. Sign in or create an account (check your spam folder for the confirmation email)
   3. Click on your API key (or click `Create New API Key``)
   4. Select `Ethereum Sepolia` and `Polygon Mumbai` networks
   5. Click `Save Changes``
   6. You should now be able to see both your Ethereum Sepolia and Polygon Mumbai RPC URLs.
- A PolygonScan API key. If you do not already have one, you can get a free one from PolygonScan.
  1. Go to [polygonscan.com/login](https://polygonscan.com/login)
  2. Sign in or create an account (check your spam folder for the confirmation email)
  3. Go to [polygonscan.com/myapikey](https://polygonscan.com/myapikey)
  4. Click `Add` and select a name
  5. You should now be able to see your API key

## Guide

1. Clone this GitHub repository. If you do not already have GitHub installed, you can do this by installing GitHub Desktop.
   1. Visit [desktop.github.com](https://desktop.github.com/) and follow the installation instructions
   2. Launch GitHub Desktop
   3. Click `Add` and `Clone Repository`
   4. Click `Clone`
   5. Select the `URL` tab and paste the URL to this repo: ``
   6. Click `Fetch origin` to make sure you pull the latest changes
2. Once the repository is cloned, open it using Visual Studio Code or your preferred IDE
3. Set the following environment variables using the values from the [Prerequisites](#prerequisites) section by opening your terminal and running the following commands.
   1. `export ETHEREUM_SEPOLIA_RPC_URL=<YOUR ETHEREUM SEPOLIA RPC URL>`
   2. `export POLYGON_MUMBAI_RPC_URL=<YOUR POLYGON MUMBAI RPC URL>`
   3. `export `