// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {FunctionsClient} from "./@chainlink/contracts/src/v0.8/functions/dev/1_0_0/FunctionsClient.sol";
import {ConfirmedOwner} from "./@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import {FunctionsRequest} from "./@chainlink/contracts/src/v0.8/functions/dev/1_0_0/libraries/FunctionsRequest.sol";

/**
 * @title Chainlink Functions example on-demand consumer contract example
 */
contract FunctionsConsumer is FunctionsClient, ConfirmedOwner {
  using FunctionsRequest for FunctionsRequest.Request;

  bytes32 public donId; // DON ID for the Functions DON to which the requests are sent

  string[] public s_args;
  bytes[] public s_bytesArgs;

  bytes32 public s_lastRequestId;
  bytes public s_lastResponse;
  bytes public s_lastError;

  error UnexpectedRequestID(bytes32 requestId);

  constructor(address router, bytes32 _donId) FunctionsClient(router) ConfirmedOwner(msg.sender) {
    donId = _donId;
  }

  /**
   * @notice Set the DON ID
   * @param newDonId New DON ID
   */
  function setDonId(bytes32 newDonId) external onlyOwner {
    donId = newDonId;
  }

  /**
   * @notice Set the arguments that will be passed to the Functions request
   * @param args List of arguments accessible from within the source code
   */
  function setArgs(string[] memory args) external onlyOwner {
    s_args = args;
  }

  /**
   * @notice Set the bytes arguments that will be passed to the Functions request
   * @param bytesArgs List of bytes arguments accessible from within the source code
   */
  function setBytesArgs(bytes[] memory bytesArgs) external onlyOwner {
    s_bytesArgs = bytesArgs;
  }

  /**
   * @notice Triggers a simple on-demand Functions request
   * @param source JavaScript source code
   * @param subscriptionId Subscription ID used to pay for request (FunctionsConsumer contract address must first be added to the subscription)
   * @param callbackGasLimit Maximum amount of gas used to call the client contract's `handleOracleFulfillment` method
   */
  function sendRequest(string calldata source, uint64 subscriptionId, uint32 callbackGasLimit) external onlyOwner {
    FunctionsRequest.Request memory req;
    req.initializeRequestForInlineJavaScript(source);
    if (s_args.length > 0) {
      req.setArgs(s_args);
    }
    if (s_bytesArgs.length > 0) {
      req.setBytesArgs(s_bytesArgs);
    }
    s_lastRequestId = _sendRequest(req.encodeCBOR(), subscriptionId, callbackGasLimit, donId);
  }

  /**
   * @notice Triggers an on-demand Functions request using remote encrypted secrets
   * @param source JavaScript source code
   * @param encryptedSecretsUrls Encrypted JSON-encoded array of URLs pointing to encrypted secrets JSON file
   * @param subscriptionId Subscription ID used to pay for request (FunctionsConsumer contract address must first be added to the subscription)
   * @param callbackGasLimit Maximum amount of gas used to call the client contract's `handleOracleFulfillment` method
   */
  function sendRequestWithRemoteSecrets(
    string calldata source,
    bytes calldata encryptedSecretsUrls,
    uint64 subscriptionId,
    uint32 callbackGasLimit
  ) external onlyOwner {
    FunctionsRequest.Request memory req;
    req.initializeRequestForInlineJavaScript(source);
    req.addSecretsReference(encryptedSecretsUrls);
    if (s_args.length > 0) {
      req.setArgs(s_args);
    }
    if (s_bytesArgs.length > 0) {
      req.setBytesArgs(s_bytesArgs);
    }
    s_lastRequestId = _sendRequest(req.encodeCBOR(), subscriptionId, callbackGasLimit, donId);
  }

  /**
   * @notice Triggers an on-demand Functions request using DON hosted encrypted secrets
   * @param source JavaScript source code
   * @param slotID Slot ID of the DON hosted encrypted secrets which will be used
   * @param version Current version of the secrets stored in the slotId
   * @param subscriptionId Subscription ID used to pay for request (FunctionsConsumer contract address must first be added to the subscription)
   * @param callbackGasLimit Maximum amount of gas used to call the client contract's `handleOracleFulfillment` method
   */
  function sendRequestWithDONHostedSecrets(
    string calldata source,
    uint8 slotID,
    uint64 version,
    uint64 subscriptionId,
    uint32 callbackGasLimit
  ) external onlyOwner {
    FunctionsRequest.Request memory req;
    req.initializeRequestForInlineJavaScript(source);
    req.addDONHostedSecrets(slotID, version);
    if (s_args.length > 0) {
      req.setArgs(s_args);
    }
    if (s_bytesArgs.length > 0) {
      req.setBytesArgs(s_bytesArgs);
    }
    s_lastRequestId = _sendRequest(req.encodeCBOR(), subscriptionId, callbackGasLimit, donId);
  }

  /**
   * @notice Store latest result/error
   * @param requestId The request ID, returned by sendRequest()
   * @param response Aggregated response from the user code
   * @param err Aggregated error from the user code or from the execution pipeline
   * Either response or error parameter will be set, but never both
   */
  function fulfillRequest(bytes32 requestId, bytes memory response, bytes memory err) internal override {
    if (s_lastRequestId != requestId) {
      revert UnexpectedRequestID(requestId);
    }
    s_lastResponse = response;
    s_lastError = err;
  }
}
