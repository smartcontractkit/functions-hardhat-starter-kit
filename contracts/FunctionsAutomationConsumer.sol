// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "./dev/functions/FunctionsClient.sol";
// import "@chainlink/contracts/src/v0.8/dev/functions/FunctionsClient.sol"; // Once published
import "@chainlink/contracts/src/v0.8/ConfirmedOwner.sol";
import "@chainlink/contracts/src/v0.8/AutomationCompatible.sol";

/**
 * @title Functions Copns contract
 * @notice This contract is a demonstration of using Functions.
 * @notice NOT FOR PRODUCTION USE
 */
contract FunctionsAutomationConsumer is AutomationCompatibleInterface, FunctionsClient, ConfirmedOwner {
  using Functions for Functions.Request;

  uint256 public interval;
  uint256 public lastTimeStamp;

  string public source;
  bytes public secrets;
  string[] public args;
  uint32 public gasLimit;
  uint64 public subscriptionId;

  struct Request {
    bool exist;
    bool fulfilled;
    bytes response;
    bytes error;
  }

  mapping(bytes32 => Request) requests;
  bytes32[] public pastRequests;
  uint256 public requestsCounter;

  event OCRResponse(bytes32 indexed requestId, bytes result, bytes err);
  error RequestDoesNotExist(bytes32 requestId);
  error IndexOverflow(uint256 providedIndex, uint256 maximumIndex);

  /**
   * @notice Executes once when a contract is created to initialize state variables
   *
   * @param _oracle - The FunctionsOracle contract
   * @param _source - The source code
   * @param _subscriptionId - The subscription id
   * @param _secrets - Encrypted secrets payload
   * @param _args - List of arguments accessible from within the source code
   * @param _gasLimit - Maximum gas to spend when fulfilling a request
   * @param _updateInterval - Number of seconds to wait before sending a request
   */
  constructor(
    address _oracle,
    string memory _source,
    uint64 _subscriptionId,
    bytes memory _secrets,
    string[] memory _args,
    uint32 _gasLimit,
    uint256 _updateInterval
  ) FunctionsClient(_oracle) ConfirmedOwner(msg.sender) {
    source = _source;
    subscriptionId = _subscriptionId;
    secrets = _secrets;
    args = _args;
    gasLimit = _gasLimit;
    interval = _updateInterval;
    lastTimeStamp = block.timestamp;
  }

  /**
   * @notice function called by Chainlink Automation to decide wither to call `performUpkeep` or not
   */
  function checkUpkeep(
    bytes calldata /* checkData */
  ) external view override returns (bool upkeepNeeded, bytes memory performData) {
    upkeepNeeded = (block.timestamp - lastTimeStamp) > interval;
    // We don't use the checkData in this example.
    performData = "";
  }

  function performUpkeep(bytes calldata /* performData */) external override {
    //Revalidate the upkeep in the performUpkeep function
    if ((block.timestamp - lastTimeStamp) > interval) {
      lastTimeStamp = block.timestamp;
      _executeRequest();
    }
  }

  /**
   * @notice Send a simple request
   */
  function _executeRequest() private {
    Functions.Request memory req;
    req.initializeRequest(Functions.Location.Inline, Functions.CodeLanguage.JavaScript, source);
    if (secrets.length > 0) req.addInlineSecrets(secrets);
    if (args.length > 0) req.addArgs(args);

    bytes32 assignedReqID = sendRequest(req, subscriptionId, gasLimit, tx.gasprice);
    requests[assignedReqID] = Request(true, false, "", "");
    pastRequests.push(assignedReqID);
    requestsCounter++;
  }

  /**
   * @notice Callback that is invoked once the DON has resolved the request or hit an error
   *
   * @param requestId The request ID, returned by sendRequest()
   * @param response Aggregated response from the user code
   * @param err Aggregated error from the user code or from the execution pipeline
   * Either response or error parameter will be set, but never both
   */
  function fulfillRequest(bytes32 requestId, bytes memory response, bytes memory err) internal override {
    Request storage req = requests[requestId];
    req.fulfilled = true;
    req.response = response;
    req.error = err;
    emit OCRResponse(requestId, response, err);
  }

  function getRequestDetailsAt(
    uint256 index
  ) public view returns (bool fulfilled, bytes memory response, bytes memory error) {
    if (index >= requestsCounter) revert IndexOverflow(index, requestsCounter - 1);
    return getRequestDetails(pastRequests[index]);
  }

  function getRequestDetails(
    bytes32 requestId
  ) public view returns (bool fulfilled, bytes memory response, bytes memory error) {
    Request memory req = requests[requestId];
    if (!req.exist) revert RequestDoesNotExist(requestId);
    return (req.fulfilled, req.response, req.error);
  }

  /**
   * @notice update sending requests interval
   */
  function updateInterval(uint256 _updateInterval) public onlyOwner {
    interval = _updateInterval;
  }

  function updateOracleAddress(address oracle) public onlyOwner {
    setOracle(oracle);
  }

  function updateSubscriptionId(uint64 _subscriptionId) public onlyOwner {
    subscriptionId = _subscriptionId;
  }

  function updateGasLimit(uint32 _gasLimit) public onlyOwner {
    gasLimit = _gasLimit;
  }

  function updateRequestConfig(string memory _source, bytes memory _secrets, string[] memory _args) public onlyOwner {
    source = _source;
    secrets = _secrets;
    args = _args;
  }
}
