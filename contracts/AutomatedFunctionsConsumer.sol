// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";

import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";
import {AutomationCompatibleInterface} from "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

/**
 * @title Automated Functions Consumer contract using Chainlink Automations
 * @notice This contract is for demonstration not production use.
 */
contract AutomatedFunctionsConsumer is FunctionsClient, ConfirmedOwner, AutomationCompatibleInterface {
  using FunctionsRequest for FunctionsRequest.Request;

  // State variables for Chainlink Functions
  bytes32 public donId;
  bytes public s_requestCBOR;
  uint64 public s_subscriptionId;
  uint32 public s_fulfillGasLimit;
  bytes32 public s_lastRequestId;
  bytes public s_lastResponse;
  bytes public s_lastError;

  // State variables for Chainlink Automation
  uint256 public s_updateInterval;
  uint256 public s_lastUpkeepTimeStamp;
  uint256 public s_upkeepCounter;
  uint256 public s_requestCounter;
  uint256 public s_responseCounter;

  event OCRResponse(bytes32 indexed requestId, bytes result, bytes err);
  event RequestRevertedWithErrorMsg(string reason);
  event RequestRevertedWithoutErrorMsg(bytes data);

  /**
   * @notice Executes once when a contract is created to initialize state variables
   *
   * @param router The Functions Router contract for the network
   * @param _donId The DON Id for the DON that will execute the Function
   */
  constructor(address router, bytes32 _donId) FunctionsClient(router) ConfirmedOwner(msg.sender) {
    donId = _donId;
    s_lastUpkeepTimeStamp = 0;
  }

  /**
   * @notice Sets the bytes representing the CBOR-encoded FunctionsRequest.Request that is sent when performUpkeep is called

   * @param _subscriptionId The Functions billing subscription ID used to pay for Functions requests
   * @param _fulfillGasLimit Maximum amount of gas used to call the client contract's `handleOracleFulfillment` function
   * @param _updateInterval Time interval at which Chainlink Automation should call performUpkeep
   * @param requestCBOR Bytes representing the CBOR-encoded FunctionsRequest.Request
   */
  function setRequest(
    uint64 _subscriptionId,
    uint32 _fulfillGasLimit,
    uint256 _updateInterval,
    bytes calldata requestCBOR
  ) external onlyOwner {
    s_updateInterval = _updateInterval;
    s_subscriptionId = _subscriptionId;
    s_fulfillGasLimit = _fulfillGasLimit;
    s_requestCBOR = requestCBOR;
  }

  /**
   * @notice Used by Automation to check if performUpkeep should be called.
   *
   * The function's argument is unused in this example, but there is an option to have Automation pass custom data
   * that can be used by the checkUpkeep function.
   *
   * Returns a tuple where the first element is a boolean which determines if upkeep is needed and the
   * second element contains custom bytes data which is passed to performUpkeep when it is called by Automation.
   */
  function checkUpkeep(bytes memory) public view override returns (bool upkeepNeeded, bytes memory) {
    upkeepNeeded = (block.timestamp - s_lastUpkeepTimeStamp) > s_updateInterval;
  }

  /**
   * @notice Called by Automation to trigger a Functions request
   *
   * The function's argument is unused in this example, but there is an option to have Automation pass custom data
   * returned by checkUpkeep (See Chainlink Automation documentation)
   */
  function performUpkeep(bytes calldata) external override {
    (bool upkeepNeeded, ) = checkUpkeep("");
    require(upkeepNeeded, "Time interval not met");
    s_lastUpkeepTimeStamp = block.timestamp;
    s_upkeepCounter = s_upkeepCounter + 1;

    try
      i_router.sendRequest(
        s_subscriptionId,
        s_requestCBOR,
        FunctionsRequest.REQUEST_DATA_VERSION,
        s_fulfillGasLimit,
        donId
      )
    returns (bytes32 requestId) {
      s_requestCounter = s_requestCounter + 1;
      s_lastRequestId = requestId;
      emit RequestSent(requestId);
    } catch Error(string memory reason) {
      emit RequestRevertedWithErrorMsg(reason);
    } catch (bytes memory data) {
      emit RequestRevertedWithoutErrorMsg(data);
    }
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
    s_lastResponse = response;
    s_lastError = err;
    s_responseCounter = s_responseCounter + 1;
    emit OCRResponse(requestId, response, err);
  }

  /**
   * @notice Set the DON ID
   * @param newDonId New DON ID
   */
  function setDonId(bytes32 newDonId) external onlyOwner {
    donId = newDonId;
  }
}
