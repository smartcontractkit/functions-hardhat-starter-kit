# Parametric Insurance Sample app

## Use Case Description
[Parametric Insurance](https://en.wikipedia.org/wiki/Parametric_insurance) offers payouts to clients based upon a trigger event. In the sample, a smart contract will offers payouts based on the temperature in New York City. If the temperature falls below 60 degrees Fahrenheit (you can define the different number) for three consecutive days, the insurance will pay the client with balances. 

There is a smart contract called `ParametricInsurance` created for the use case, and clients can get payout if the predefined conditions are met. 

In the `ParametricInsurance`, anyone can call function `executeRequest`(there is a limit that only one call per day) and send a request to Chainlink Functions. After the request event is detected by off-chain Chainlink node, the node will fetch the data and execute the computing logics defined in `Parametric-insurance-example.js`. 

After results are calculated, the returned data will be passed through [Chainlink Off-Chain Reporting mechanism(Chainlink OCR)](https://docs.chain.link/architecture-overview/off-chain-reporting/) to be aggregated. After the data aggregation, Chainlink functions will call function `fulfillRequest` and the client would be paid if predefined condition(three consecutive cold days in the use case) is met. 

## How to use the sample
1. Add environment variables in `.env` file
Prepend following environment variables in `.env` in the root directory of the repo.
```
OPEN_WEATHER_API_KEY="Open weather API key (Get a free one: https://openweathermap.org/)"
WORLD_WEATHER_ONLINE_API_KEY="World Weather API key (Get a free one: https://www.worldweatheronline.com/weather-api/)"
AMBEE_DATA_API_KEY="ambee data API key (Get a free one: https://api-dashboard.getambee.com/)"
CLIENT_ADDR="CLIENT ADDR"
```
Then get API keys for 3 different data source above
- OpenWeather API key: get a free key from [here](https://openweathermap.org/) (60 free calls per minute).
- WorldWeatherOnline API key: get a free key from [here](https://www.worldweatheronline.com/weather-api/)(500 calls per day).
- Ambeedata API key: get a free key from [here](https://api-dashboard.getambee.com/)(50,000 free calls).

2. Update the `./Function-request-config`
`./Function-request-config` is used to save config information of file `Parametric-insurance-example.js`. In the sample's workflow, Chainlink functions is supposed to execute codes saved in `Parametric-insurance-example.js`, and necessary parameters for the execution codes are saved in its config file. In order to provide config information like API keys, city latitude, longitude, name, you need to replace codes in `./Function-request-config` with `Parametric-insurance-example.js`. 

3. Update the deploy script
Add second parameter for constructor in `ParametricInsurance.sol` in `./task/Function-client/deploy.js`. Because there are 2 parameters for `ParametricInsurance.sol` which is different from `FunctionsConsumer.sol`, you need to add the second one when deploying and verify the contract. In `./task/Function-client/deploy.js`, add codes below.
```
const requestConfig = require("../../Functions-request-config.js")
```
After this line is added, add `requestConfig.secrets.clientAddress` for contract deployment and verification.
```
...
const clientContract = await clientContractFactory.deploy(oracleAddress, requestConfig.secrets.clientAddress)
...
```
and
```
...
await run("verify:verify", {
    address: clientContract.address,
    constructorArguments: [oracleAddress, requestConfig.secrets.clientAddress],
    })
...
```

4. Update "FunctionConsumer" to "ParametricInsurance" in task files
When you execute the tasks defined under `./task/Function-client`, all `"FunctionConsumer"` has to be updated to `"ParametricInsurance"`. For example,
`const clientFactory = await ethers.getContractFactory("FunctionsConsumer")` needs to be updated to `const clientFactory = await ethers.getContractFactory("ParametricInsurance")`.

## Tips
The default gaslimit for callback function is 100,000 and it may be insufficient. use `--gaslimit 300000` when send request like command below:
```
npx hardhat functions-request --network {network name} --contract {your contract addr} --subid {your subid} --gaslimit 300000
```