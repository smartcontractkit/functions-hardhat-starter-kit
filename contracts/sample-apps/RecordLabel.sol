// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "../dev/functions/FunctionsClient.sol";
// TODO: import "@chainlink/contracts/src/v0.8/dev/functions/FunctionsClient.sol"; // Once published
import "@chainlink/contracts/src/v0.8/ConfirmedOwner.sol";
import "@chainlink/contracts/src/v0.8/interfaces/LinkTokenInterface.sol";
import "@openzeppelin/contracts/utils/Strings.sol"; // for string utilities

import "hardhat/console.sol"; // NOTE: console.log only works in Hardhat local networks and the local functions simluation, not on testnets or mainnets.

/**
 * @title Functions Copns contract
 * @notice This contract is a demonstration of using Functions.
 * @notice NOT FOR PRODUCTION USE
 */
contract RecordLabel is FunctionsClient, ConfirmedOwner {
  using Functions for Functions.Request;

  bytes32 public latestRequestId;
  bytes public latestResponse;
  bytes public latestError;
  string public latestArtistRequestedId;

  struct Artist {
    string name;
    string email;
    string artistId;
    uint256 lastListenerCount;
    uint256 lastPaidAmount;
    uint256 totalPaid;
    address walletAddress;
  }

  mapping(string => Artist) public artistData; // Mapping that uses the ArtistID as the key.

  event OCRResponse(bytes32 indexed requestId, bytes result, bytes err);

  /**
   * @notice Executes once when a contract is created to initialize state variables
   *
   * @param oracle - The FunctionsOracle contract
   */
  constructor(address oracle) FunctionsClient(oracle) ConfirmedOwner(msg.sender) {}

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
    string[] calldata args, // args in sequence are: ArtistID, artistname,  lastListenerCount, artist email
    uint64 subscriptionId,
    uint32 gasLimit
  ) public onlyOwner returns (bytes32) {

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

    // Update storage variables.
    bytes32 assignedReqID = sendRequest(req, subscriptionId, gasLimit);
    latestRequestId = assignedReqID;
    latestArtistRequestedId = args[0];

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
  function fulfillRequest(bytes32 requestId, bytes memory response, bytes memory err) internal override {
    // revert('test');
    latestResponse = response;
    latestError = err;
    emit OCRResponse(requestId, response, err);

    // Artist contract for payment logic here.
    // Artist gets a fixed rate for every addition 1000 active monthly listeners.
    bool nilErr = (err.length == 0);
    if (nilErr) {
      uint256 latestListenerCount = abi.decode(response, (uint256));
      console.log("\nLatest listener count : %s", latestListenerCount);
      
      // Update Artist Mapping.
      string memory artistId = latestArtistRequestedId;
      artistData[artistId].lastListenerCount = latestListenerCount;

      // Pay the artist at 'artistData[latestArtistRequestedId].walletAddress'.
      // uint256 amountDue = // TODO (increase in listener count / 1000 * Token Awarded Per 1000)

      // artistData[artistId].lastPaidAmount = amountDue // TODO
      // artistData[artistId].totalPaid += amountDue // TODO
    }
  }

  function setArtistData(
    string memory artistId,
    string memory name,
    string memory email,
    uint256 lastListenerCount,
    uint256 lastPaidAmount,
    uint256 totalPaid,
    address walletAddress
  ) public onlyOwner {
    artistData[artistId].artistId = artistId;
    artistData[artistId].name = name;
    artistData[artistId].email = email;
    artistData[artistId].lastListenerCount = lastListenerCount;
    artistData[artistId].lastPaidAmount = lastPaidAmount;
    artistData[artistId].totalPaid = totalPaid;
    artistData[artistId].walletAddress = walletAddress;
  }

  // Utility Functions
  function updateOracleAddress(address oracle) public onlyOwner {
    setOracle(oracle);
  }

  function addSimulatedRequestId(address oracleAddress, bytes32 requestId) public onlyOwner {
    addExternalRequest(oracleAddress, requestId);
  }

  function getContractBalance() public view returns (uint256) {
    return address(this).balance;
  }

  /**
   * @notice Contract Owner can withdraw LINK held in the contract.
   * @param _tokenContract - The LINK token contract for this network.
   */
  function withdrawLinkBalance(address _tokenContract) public payable onlyOwner {
    LinkTokenInterface LinkContract = LinkTokenInterface(_tokenContract);

    bool ok = LinkContract.transfer(msg.sender, LinkContract.balanceOf(address(this)));
    require(ok, "Failed to withdraw Link");
  }
}
