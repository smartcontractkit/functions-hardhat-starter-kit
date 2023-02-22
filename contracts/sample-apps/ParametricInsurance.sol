// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "../dev/functions/FunctionsClient.sol";

contract ParametricInsurance is FunctionsClient {
    using Functions for Functions.Request;

    bytes32 public latestRequestId;
    bytes public latestResponse;
    bytes public latestError;
    event OCRResponse(bytes32 indexed requestId, bytes result, bytes err);

    // Number of consecutive days with temperature below threshold
    uint256 public constant COLD_DAYS_THRESHOLD = 3;

    // Number of seconds in a day. 60 for testing, 86400 for Production
    uint256 public constant DAY_IN_SECONDS = 60; 

    address public insurer;

    // address of client is immutable and can only be assigned in constructor
    address public immutable client;
    
    // Check if the contract active or end
    bool public contractActive;
    
    // Check if the contract should pay to client
    bool public shouldPayClient;
    
    // how many days with cold weather in a row
    uint256 public consecutiveColdDays = 0;

    // the temperature below threshold is considered as cold(in Fahrenheit)
    uint256 public coldTemp = 60;
    
    // current temperature for the location
    uint256 public currentTemperature;
    
    //when the last temperature check was performed
    uint256 public currentTempDateChecked;

    constructor(address oracle, address _client) FunctionsClient(oracle) payable {
        insurer = msg.sender;
        client = _client;
        shouldPayClient = false;
        currentTempDateChecked = block.timestamp;
        contractActive = true;
        currentTemperature = 0;
    }

    /**
     * @dev Prevents a data request to be called unless it's been a day since the last call (to avoid spamming and spoofing results)
     */
    modifier callFrequencyOncePerDay() {
        require((block.timestamp- currentTempDateChecked) > DAY_IN_SECONDS,'Can only check temperature once per day');
        _;
    }

    /**
     * @dev Prevents a function being run unless contract is still active
     */
    modifier onContractActive() {
        require(contractActive == true ,'Contract has ended, cant interact with it anymore');
        _;
    }

    /**
     * @notice Send a simple request
     * @param source JavaScript source code
     * @param secrets Encrypted secrets payload
     * @param args List of arguments accessible from within the source code
     * @param subscriptionId Billing ID
     */
    function executeRequest(
        string calldata source,
        bytes calldata secrets,
        Functions.Location secretsLocation,
        string[] calldata args,
        uint64 subscriptionId,
        uint32 gasLimit
    ) public callFrequencyOncePerDay() onContractActive() returns (bytes32) {
        Functions.Request memory req;
        req.initializeRequest(Functions.Location.Inline, Functions.CodeLanguage.JavaScript, source);
        if (secrets.length > 0) {
        if (secretsLocation == Functions.Location.Inline) {
            req.addInlineSecrets(secrets);
        } else {
            req.addRemoteSecrets(secrets);
        }
        }
        if (args.length > 0) req.addArgs(args);

        bytes32 assignedReqID = sendRequest(req, subscriptionId, gasLimit);
        latestRequestId = assignedReqID;
        return assignedReqID;
    }

    /**
     * @notice Callback that is invoked once the DON has resolved the request or hit an error
     *
     * @param requestId The request ID, returned by sendRequest()
     * @param response Aggregated response from the user code
     * @param err Aggregated error from the user code or from the execution pipeline
     * Either response or error parameter will be set, but never both
     */
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
      latestResponse = response;
      latestError = err;
      emit OCRResponse(requestId, response, err);
      // once callback happens, mark the timestamp
      currentTempDateChecked = block.timestamp;
      currentTemperature = uint256(bytes32(response));

      // if current temperature is under temperature which considered as cold, number of cold days inrement
      if (currentTemperature > coldTemp) {
          consecutiveColdDays = 0;
      } else {
          consecutiveColdDays += 1;
      }

      // pay the client and shut down the contract
      if(consecutiveColdDays >= COLD_DAYS_THRESHOLD) {
          payoutContract();
      }
    }

    /**
     * @dev Insurance conditions have been met, do payout of total cover amount to client
     */
    function payoutContract() onContractActive() internal {
      (bool sent, /*bytes memory data*/) = client.call{value: address(this).balance}("");
      contractActive = sent;
      shouldPayClient = !sent;
    }

    /**
     * @dev Receive function so contract can receive ether when required
     */
    receive() external payable {}
}