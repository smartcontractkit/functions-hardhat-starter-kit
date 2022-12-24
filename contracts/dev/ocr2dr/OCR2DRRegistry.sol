// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@chainlink/contracts/src/v0.8/interfaces/LinkTokenInterface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "../interfaces/OCR2DRRegistryInterface.sol";
import "../interfaces/OCR2DROracleInterface.sol";
import "../interfaces/OCR2DRClientInterface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/TypeAndVersionInterface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/ERC677ReceiverInterface.sol";
import "@chainlink/contracts/src/v0.8/ConfirmedOwner.sol";
import "../AuthorizedReceiver.sol";
import "../vendor/openzeppelin-solidity/v.4.8.0/contracts/utils/SafeCast.sol";
import "../vendor/openzeppelin-solidity/v.4.8.0/contracts/security/Pausable.sol";

contract OCR2DRRegistry is
  ConfirmedOwner,
  Pausable,
  OCR2DRRegistryInterface,
  ERC677ReceiverInterface,
  AuthorizedReceiver
{
  LinkTokenInterface public immutable LINK;
  AggregatorV3Interface public immutable LINK_ETH_FEED;

  // We need to maintain a list of consuming addresses.
  // This bound ensures we are able to loop over them as needed.
  // Should a user require more consumers, they can use multiple subscriptions.
  uint16 public constant MAX_CONSUMERS = 100;

  error TimeoutExeeded();
  error TooManyConsumers();
  error InsufficientBalance();
  error InvalidConsumer(uint64 subscriptionId, address consumer);
  error InvalidSubscription();
  error OnlyCallableFromLink();
  error InvalidCalldata();
  error MustBeSubOwner(address owner);
  error PendingRequestExists();
  error MustBeRequestedOwner(address proposedOwner);
  error BalanceInvariantViolated(uint256 internalBalance, uint256 externalBalance); // Should never happen
  event FundsRecovered(address to, uint256 amount);

  struct Subscription {
    // There are only 1e9*1e18 = 1e27 juels in existence, so the balance can fit in uint96 (2^96 ~ 7e28)
    uint96 balance; // Common LINK balance that is controlled by the Registry to be used for all consumer requests.
    uint96 blockedBalance; // LINK balance that is reserved to pay for pending consumer requests.
    uint32 pendingRequestCount; // pendingRequestCount used to prevent a subscription with pending requests from being deleted
  }
  // We use the config for the mgmt APIs
  struct SubscriptionConfig {
    address owner; // Owner can fund/withdraw/cancel the sub.
    address requestedOwner; // For safely transferring sub ownership.
    // Maintains the list of keys in s_consumers.
    // We do this for 2 reasons:
    // 1. To be able to clean up all keys from s_consumers when canceling a subscription.
    // 2. To be able to return the list of all consumers in getSubscription.
    // Note that we need the s_consumers map to be able to directly check if a
    // consumer is valid without reading all the consumers from storage.
    address[] consumers;
  }

  // Use contract-wide nonce instead
  uint256 private s_nonce;

  mapping(uint64 => SubscriptionConfig) /* subscriptionId */ /* subscriptionConfig */
    private s_subscriptionConfigs;
  mapping(uint64 => Subscription) /* subscriptionId */ /* subscription */
    private s_subscriptions;
  mapping(uint64 => mapping(address => bool)) /* subscriptionId */ /* consumer */ /* isAuthorized */
    private s_isAuthorizedConsumer;
  // We make the sub count public so that its possible to
  // get all the current subscriptions via getSubscription.
  uint64 private s_currentsubscriptionId;
  // s_totalBalance tracks the total link sent to/from
  // this contract through onTokenTransfer, cancelSubscription and oracleWithdraw.
  // A discrepancy with this contract's link balance indicates someone
  // sent tokens using transfer and so we may need to use recoverFunds.
  uint96 private s_totalBalance;
  event SubscriptionCreated(uint64 indexed subscriptionId, address owner);
  event SubscriptionFunded(uint64 indexed subscriptionId, uint256 oldBalance, uint256 newBalance);
  event SubscriptionConsumerAdded(uint64 indexed subscriptionId, address consumer);
  event SubscriptionConsumerRemoved(uint64 indexed subscriptionId, address consumer);
  event SubscriptionCanceled(uint64 indexed subscriptionId, address to, uint256 amount);
  event SubscriptionOwnerTransferRequested(uint64 indexed subscriptionId, address from, address to);
  event SubscriptionOwnerTransferred(uint64 indexed subscriptionId, address from, address to);

  error GasLimitTooBig(uint32 have, uint32 want);
  error InvalidLinkWeiPrice(int256 linkWei);
  error IncorrectRequestID();
  error PaymentTooLarge();
  error Reentrant();

  mapping(address => uint96) /* oracle */ /* LINK balance */
    private s_withdrawableTokens;
  // The modified sizes below reduce commitment storage size by 1 slot (2 slots if we remove DON address)
  struct Commitment {
    uint64 subscriptionId;  // 8 bytes
    address client;         // 20 bytes
    uint32 gasLimit;        // 4 bytes 
    uint56 gasPrice;        // 7 bytes (good for >100,000 gwei gas price)
    // Do we need to store the DON address? It appears we don't use it at all.
    // If we remove this, the commitment size goes from 100 bytes to 80, saving a full slot of storage
    // address don;            // 20 bytes?
    uint96 donFee;          // 12 bytes
    uint96 registryFee;     // 12 bytes
    uint96 estimatedCost;   // 12 bytes
    uint40 timestamp;       // 5 bytes (good for >1000 years)
    
  }
  mapping(bytes32 => Commitment) /* requestID */ /* Commitment */
    private s_requestCommitments;
  event BillingStart(bytes32 requestId, Commitment commitment);
  struct ItemizedBill {
    uint96 signerPayment;
    uint96 transmitterPayment;
    uint96 totalCost;
  }
  event BillingEnd(
    uint64 subscriptionId,
    bytes32 indexed requestId,
    uint96 signerPayment,
    uint96 transmitterPayment,
    uint96 totalCost,
    bool success
  );
  event RequestTimedOut(bytes32 indexed requestId);

  struct Config {
    // Maxiumum amount of gas that can be given to a request's client callback
    uint32 maxGasLimit;
    // Reentrancy protection.
    bool reentrancyLock;
    // stalenessSeconds is how long before we consider the feed price to be stale
    // and fallback to fallbackWeiPerUnitLink.
    uint32 stalenessSeconds;
    // Gas to cover transmitter oracle payment after we calculate the payment.
    // We make it configurable in case those operations are repriced.
    uint256 gasAfterPaymentCalculation;
    // Represents the average gas execution cost. Used in estimating cost beforehand.
    uint32 gasOverhead;
    // how many seconds it takes before we consider a request to be timed out
    uint16 requestTimeoutSeconds;
  }
  int256 private s_fallbackWeiPerUnitLink;
  Config private s_config;
  event ConfigSet(
    uint32 maxGasLimit,
    uint32 stalenessSeconds,
    uint256 gasAfterPaymentCalculation,
    int256 fallbackWeiPerUnitLink,
    uint32 gasOverhead
  );

  constructor(address link, address linkEthFeed) ConfirmedOwner(msg.sender) {
    LINK = LinkTokenInterface(link);
    LINK_ETH_FEED = AggregatorV3Interface(linkEthFeed);
  }

  /**
   * @notice Sets the configuration of the OCR2DR registry
   * @param maxGasLimit global max for request gas limit
   * @param stalenessSeconds if the eth/link feed is more stale then this, use the fallback price
   * @param gasAfterPaymentCalculation gas used in doing accounting after completing the gas measurement
   * @param fallbackWeiPerUnitLink fallback eth/link price in the case of a stale feed
   * @param gasOverhead fallback eth/link price in the case of a stale feed
   * @param requestTimeoutSeconds fallback eth/link price in the case of a stale feed
   */
  function setConfig(
    uint32 maxGasLimit,
    uint32 stalenessSeconds,
    uint256 gasAfterPaymentCalculation,
    int256 fallbackWeiPerUnitLink,
    uint32 gasOverhead,
    uint16 requestTimeoutSeconds
  ) external onlyOwner {
    if (fallbackWeiPerUnitLink <= 0) {
      revert InvalidLinkWeiPrice(fallbackWeiPerUnitLink);
    }
    s_config = Config({
      maxGasLimit: maxGasLimit,
      stalenessSeconds: stalenessSeconds,
      gasAfterPaymentCalculation: gasAfterPaymentCalculation,
      reentrancyLock: false,
      gasOverhead: gasOverhead,
      requestTimeoutSeconds: requestTimeoutSeconds
    });
    s_fallbackWeiPerUnitLink = fallbackWeiPerUnitLink;
    emit ConfigSet(maxGasLimit, stalenessSeconds, gasAfterPaymentCalculation, fallbackWeiPerUnitLink, gasOverhead);
  }

  /**
   * @notice Gets the configuration of the OCR2DR registry
   * @return maxGasLimit global max for request gas limit
   * @return stalenessSeconds if the eth/link feed is more stale then this, use the fallback price
   * @return gasAfterPaymentCalculation gas used in doing accounting after completing the gas measurement
   * @return fallbackWeiPerUnitLink fallback eth/link price in the case of a stale feed
   * @return gasOverhead fallback eth/link price in the case of a stale feed
   */
  function getConfig()
    external
    view
    returns (
      uint32 maxGasLimit,
      uint32 stalenessSeconds,
      uint256 gasAfterPaymentCalculation,
      int256 fallbackWeiPerUnitLink,
      uint32 gasOverhead
    )
  {
    return (
      s_config.maxGasLimit,
      s_config.stalenessSeconds,
      s_config.gasAfterPaymentCalculation,
      s_fallbackWeiPerUnitLink,
      s_config.gasOverhead
    );
  }

  function pause() external onlyOwner {
    _pause();
  }

  function unpause() external onlyOwner {
    _unpause();
  }

  function getTotalBalance() external view returns (uint256) {
    return s_totalBalance;
  }

  /**
   * @notice Owner cancel subscription, sends remaining link directly to the subscription owner.
   * @param subscriptionId subscription id
   * @dev notably can be called even if there are pending requests, outstanding ones may fail onchain
   */
  function ownerCancelSubscription(uint64 subscriptionId) external onlyOwner {
    address owner = s_subscriptionConfigs[subscriptionId].owner;
    if (owner == address(0)) {
      revert InvalidSubscription();
    }
    cancelSubscriptionHelper(subscriptionId, owner);
  }

  /**
   * @notice Recover link sent with transfer instead of transferAndCall.
   * @param to address to send link to
   */
  function recoverFunds(address to) external onlyOwner {
    uint256 externalBalance = LINK.balanceOf(address(this));
    uint256 internalBalance = uint256(s_totalBalance);
    if (internalBalance > externalBalance) {
      revert BalanceInvariantViolated(internalBalance, externalBalance);
    }
    if (internalBalance < externalBalance) {
      uint256 amount = externalBalance - internalBalance;
      LINK.transfer(to, amount);
      emit FundsRecovered(to, amount);
    }
    // If the balances are equal, nothing to be done.
  }

  /**
   * @inheritdoc OCR2DRRegistryInterface
   */
  function getRequestConfig() external view override returns (uint32, address[] memory) {
    return (s_config.maxGasLimit, getAuthorizedSenders());
  }

  /**
   * @inheritdoc OCR2DRRegistryInterface
   */
  function getRequiredFee(
    bytes calldata, /* data */
    OCR2DRRegistryInterface.RequestBilling memory /* billing */
  ) public pure override returns (uint96) {
    // NOTE: Optionally, compute additional fee here
    return 0;
  }

  /**
   * @inheritdoc OCR2DRRegistryInterface
   */
  function estimateCost(
    uint32 gasLimit,
    uint56 gasPrice,
    uint96 donFee,
    uint96 registryFee
  ) public view override returns (uint96) {
    int256 weiPerUnitLink;
    weiPerUnitLink = getFeedData();
    if (weiPerUnitLink <= 0) {
      revert InvalidLinkWeiPrice(weiPerUnitLink);
    }
    uint256 executionGas = s_config.gasOverhead + s_config.gasAfterPaymentCalculation + gasLimit;
    // (1e18 juels/link) (wei/gas * gas) / (wei/link) = juels
    uint256 paymentNoFee = (1e18 * uint256(gasPrice) * executionGas) / uint256(weiPerUnitLink);
    uint256 fee = uint256(donFee) + uint256(registryFee);
    if (paymentNoFee > (1e27 - fee)) {
      revert PaymentTooLarge(); // Payment + fee cannot be more than all of the link in existence.
    }
    return uint96(paymentNoFee + fee);
  }

  /**
   * @inheritdoc OCR2DRRegistryInterface
   */
  function startBilling(bytes calldata data, RequestBilling calldata billing)
    external
    override
    validateAuthorizedSender
    nonReentrant
    whenNotPaused
    returns (bytes32)
  {
    SubscriptionConfig memory subscriptionConfig = s_subscriptionConfigs[billing.subscriptionId];

    // Input validation using the subscription storage.
    if (subscriptionConfig.owner == address(0)) {
      revert InvalidSubscription();
    }

    // // It's important to ensure that the consumer is in fact who they say they
    // // are, otherwise they could use someone else's subscription balance.
    // // A nonce of 0 indicates consumer is not allocated to the sub.
    // // uint64 currentNonce = s_consumers[billing.client][billing.subscriptionId];
    // // if (currentNonce == 0) {
    // //   revert InvalidConsumer(billing.subscriptionId, billing.client);
    // // }

    // ??? Is storing the nonce per subscription & consumer really necessary?  It uses an extra slot of storage and doesn't appear to be essential.
    // We can use a single nonce for the entire registry contract instead of per subscription
    // Instead, do this to validate if a consumer is authorized:
    if (!s_isAuthorizedConsumer[billing.subscriptionId][billing.client]) {
      revert InvalidConsumer(billing.subscriptionId, billing.client);
    }

    // No lower bound on the requested gas limit. A user could request 0
    // and they would simply be billed for the gas and computation.
    if (billing.gasLimit > s_config.maxGasLimit) {
      revert GasLimitTooBig(billing.gasLimit, s_config.maxGasLimit);
    }

    // Check that subscription can afford the estimated cost
    uint96 oracleFee = OCR2DROracleInterface(msg.sender).getRequiredFee(data, billing);
    uint96 registryFee = getRequiredFee(data, billing);
    uint96 estimatedCost = estimateCost(billing.gasLimit, billing.gasPrice, oracleFee, registryFee);
    uint96 effectiveBalance = s_subscriptions[billing.subscriptionId].balance -
      s_subscriptions[billing.subscriptionId].blockedBalance;
    if (effectiveBalance < estimatedCost) {
      revert InsufficientBalance();
    }

    // ??? Use contract-wide nonce instead?
    // uint64 nonce = currentNonce + 1;
    bytes32 requestId = computeRequestId(billing.subscriptionId, s_nonce);
    s_subscriptions[billing.subscriptionId].pendingRequestCount++;
    s_nonce++;

    Commitment memory commitment = Commitment(
      billing.subscriptionId,
      billing.client,
      billing.gasLimit,
      billing.gasPrice,
      // msg.sender,
      oracleFee,
      registryFee,
      estimatedCost,
      uint40(block.timestamp)
    );
    s_requestCommitments[requestId] = commitment;
    s_subscriptions[billing.subscriptionId].blockedBalance += estimatedCost;

    // Do we really need to emit this if we are already emitting an oracle request?
    // Is it worth the gas?
    // emit BillingStart(requestId, commitment);
    // s_consumers[billing.client][billing.subscriptionId] = nonce; *This is not needed

    return requestId;
  }

  function computeRequestId(
    uint64 subscriptionId,
    uint256 nonce
  ) private view returns (bytes32) {
    return keccak256(abi.encode(address(this), subscriptionId, nonce));
  }

  /**
   * @dev calls target address with exactly gasAmount gas and data as calldata
   * or reverts if at least gasAmount gas is not available.
   */
  function callWithExactGas(
    uint256 gasAmount,
    address target,
    bytes memory data
  ) private returns (bool success) {
    // solhint-disable-next-line no-inline-assembly
    assembly {
      let g := gas()
      // GAS_FOR_CALL_EXACT_CHECK = 5000
      // Compute g -= GAS_FOR_CALL_EXACT_CHECK and check for underflow
      // The gas actually passed to the callee is min(gasAmount, 63//64*gas available).
      // We want to ensure that we revert if gasAmount >  63//64*gas available
      // as we do not want to provide them with less, however that check itself costs
      // gas.  GAS_FOR_CALL_EXACT_CHECK ensures we have at least enough gas to be able
      // to revert if gasAmount >  63//64*gas available.
      if lt(g, 5000) {
        revert(0, 0)
      }
      g := sub(g, 5000)
      // if g - g//64 <= gasAmount, revert
      // (we subtract g//64 because of EIP-150)
      if iszero(gt(sub(g, div(g, 64)), gasAmount)) {
        revert(0, 0)
      }
      // solidity calls check that a contract actually exists at the destination, so we do the same
      if iszero(extcodesize(target)) {
        revert(0, 0)
      }
      // call and return whether we succeeded. ignore return data
      // call(gas,addr,value,argsOffset,argsLength,retOffset,retLength)
      success := call(gasAmount, target, 0, add(data, 0x20), mload(data), 0, 0)
    }
    return success;
  }

  /**
   * @inheritdoc OCR2DRRegistryInterface
   */
  function fulfillAndBill(
    bytes32 requestId,
    bytes calldata response,
    bytes calldata err,
    address transmitter,
    address[31] memory signers,
    uint8 signerCount,
    uint256 reportValidationGas,
    uint256 initialGas
  ) external override validateAuthorizedSender nonReentrant whenNotPaused returns (bool success) {
    Commitment memory commitment = s_requestCommitments[requestId];
    // We should strictly enforce timeouts to set clear & explicit SLAs with customers
    // confirming if they SHOULD or SHOULD NOT retry initiating a request.  This could be
    // CRUCIAL for how a user might use this product
    // (Example: uApp escrow service: https://youtu.be/Ar4WobMZLy0
    //  If this timeout is not enforced, there could be a "double redeem" when a customer retries and both requests are fulfilled.
    //  I know this could be resolved by the client, but as a dApp dev myself, I perfer enforced explicit timeouts & retry conditions.)
   
    // If a request has timed out, the commitment is deleted and the pending request count for the subscription is decremented
    if (timeoutRequest(requestId)) {
      return true;
    }
    if (commitment.client == address(0)) {
      revert IncorrectRequestID();
    }
    delete s_requestCommitments[requestId];
    s_subscriptions[commitment.subscriptionId].pendingRequestCount--;

    bytes memory callback = abi.encodeWithSelector(
      OCR2DRClientInterface.handleOracleFulfillment.selector,
      requestId,
      response,
      err
    );
    // Call with explicitly the amount of callback gas requested
    // Important to not let them exhaust the gas budget and avoid payment.
    // Do not allow any non-view/non-pure coordinator functions to be called
    // during the consumers callback code via reentrancyLock.
    // NOTE: that callWithExactGas will revert if we do not have sufficient gas
    // to give the callee their requested amount.
    s_config.reentrancyLock = true;
    success = callWithExactGas(commitment.gasLimit, commitment.client, callback);
    s_config.reentrancyLock = false;

    // We want to charge users exactly for how much gas they use in their callback.
    // The gasAfterPaymentCalculation is meant to cover these additional operations where we
    // decrement the subscription balance and increment the oracles withdrawable balance.
    ItemizedBill memory bill = calculatePaymentAmount(
      initialGas,
      s_config.gasAfterPaymentCalculation,
      commitment.donFee,
      signerCount,
      commitment.registryFee,
      reportValidationGas,
      tx.gasprice
    );
    if (s_subscriptions[commitment.subscriptionId].balance < bill.totalCost) {
      revert InsufficientBalance();
    }
    s_subscriptions[commitment.subscriptionId].balance -= bill.totalCost;
    // Pay out signers their portion of the DON fee
    for (uint256 i = 0; i < signerCount; i++) {
      if (signers[i] != transmitter) {
        s_withdrawableTokens[signers[i]] += bill.signerPayment;
      }
    }
    // Pay out the registry fee
    s_withdrawableTokens[owner()] += commitment.registryFee;
    // Reimburse the transmitter for the execution gas cost + pay them their portion of the DON fee
    s_withdrawableTokens[transmitter] += bill.transmitterPayment;
    // Remove blocked balance
    s_subscriptions[commitment.subscriptionId].blockedBalance -= commitment.estimatedCost;
    // Include payment in the event for tracking costs.
    emit BillingEnd(
      commitment.subscriptionId,
      requestId,
      bill.signerPayment,
      bill.transmitterPayment,
      bill.totalCost,
      success
    );
  }

  // Determine the cost breakdown for payment
  function calculatePaymentAmount(
    uint256 startGas,
    uint256 gasAfterPaymentCalculation,
    uint96 donFee,
    uint8 signerCount,
    uint96 registryFee,
    uint256 reportValidationGas,
    uint256 weiPerUnitGas
  ) private view returns (ItemizedBill memory) {
    int256 weiPerUnitLink;
    weiPerUnitLink = getFeedData();
    if (weiPerUnitLink <= 0) {
      revert InvalidLinkWeiPrice(weiPerUnitLink);
    }
    // (1e18 juels/link) (wei/gas * gas) / (wei/link) = juels
    uint256 paymentNoFee = (1e18 *
      weiPerUnitGas *
      (reportValidationGas + gasAfterPaymentCalculation + startGas - gasleft())) / uint256(weiPerUnitLink);
    uint256 fee = uint256(donFee) + uint256(registryFee);
    if (paymentNoFee > (1e27 - fee)) {
      revert PaymentTooLarge(); // Payment + fee cannot be more than all of the link in existence.
    }
    uint96 signerPayment = donFee / uint96(signerCount);
    uint96 transmitterPayment = uint96(paymentNoFee) + signerPayment;
    uint96 totalCost = SafeCast.toUint96(paymentNoFee + fee);
    return ItemizedBill(signerPayment, transmitterPayment, totalCost);
  }

  function getFeedData() private view returns (int256) {
    uint32 stalenessSeconds = s_config.stalenessSeconds;
    bool staleFallback = stalenessSeconds > 0;
    (, int256 weiPerUnitLink, , uint256 timestamp, ) = LINK_ETH_FEED.latestRoundData();
    // solhint-disable-next-line not-rely-on-time
    if (staleFallback && stalenessSeconds < block.timestamp - timestamp) {
      weiPerUnitLink = s_fallbackWeiPerUnitLink;
    }
    return weiPerUnitLink;
  }

  /*
   * @notice Oracle withdraw LINK earned through fulfilling requests
   * @notice If amount is 0 the full balance will be withdrawn
   * @param recipient where to send the funds
   * @param amount amount to withdraw
   */
  function oracleWithdraw(address recipient, uint96 amount) external nonReentrant whenNotPaused {
    if (amount == 0) {
      amount = s_withdrawableTokens[msg.sender];
    }
    if (s_withdrawableTokens[msg.sender] < amount) {
      revert InsufficientBalance();
    }
    s_withdrawableTokens[msg.sender] -= amount;
    s_totalBalance -= amount;
    if (!LINK.transfer(recipient, amount)) {
      revert InsufficientBalance();
    }
  }

  function onTokenTransfer(
    address, /* sender */
    uint256 amount,
    bytes calldata data
  ) external override nonReentrant whenNotPaused {
    if (msg.sender != address(LINK)) {
      revert OnlyCallableFromLink();
    }
    if (data.length != 32) {
      revert InvalidCalldata();
    }
    uint64 subscriptionId = abi.decode(data, (uint64));
    if (s_subscriptionConfigs[subscriptionId].owner == address(0)) {
      revert InvalidSubscription();
    }
    // We do not check that the msg.sender is the subscription owner,
    // anyone can fund a subscription.
    uint256 oldBalance = s_subscriptions[subscriptionId].balance;
    s_subscriptions[subscriptionId].balance += uint96(amount);
    s_totalBalance += uint96(amount);
    emit SubscriptionFunded(subscriptionId, oldBalance, oldBalance + amount);
  }

  function getCurrentsubscriptionId() external view returns (uint64) {
    return s_currentsubscriptionId;
  }

  /**
   * @notice Get details about a subscription.
   * @param subscriptionId - ID of the subscription
   * @return balance - LINK balance of the subscription in juels.
   * @return owner - owner of the subscription.
   * @return consumers - list of consumer address which are able to use this subscription.
   */
  function getSubscription(uint64 subscriptionId)
    external
    view
    returns (
      uint96 balance,
      address owner,
      address[] memory consumers
    )
  {
    if (s_subscriptionConfigs[subscriptionId].owner == address(0)) {
      revert InvalidSubscription();
    }
    return (
      s_subscriptions[subscriptionId].balance,
      s_subscriptionConfigs[subscriptionId].owner,
      s_subscriptionConfigs[subscriptionId].consumers
    );
  }

  /**
   * @notice Create a new subscription.
   * @return subscriptionId - A unique subscription id.
   * @dev You can manage the consumer set dynamically with addConsumer/removeConsumer.
   * @dev Note to fund the subscription, use transferAndCall. For example
   * @dev  LINKTOKEN.transferAndCall(
   * @dev    address(REGISTRY),
   * @dev    amount,
   * @dev    abi.encode(subscriptionId));
   */
  function createSubscription() external nonReentrant whenNotPaused returns (uint64) {
    s_currentsubscriptionId++;
    uint64 currentsubscriptionId = s_currentsubscriptionId;
    address[] memory consumers = new address[](0);
    s_subscriptions[currentsubscriptionId] = Subscription({
      balance: 0,
      blockedBalance: 0,
      pendingRequestCount: 0
    });
    s_subscriptionConfigs[currentsubscriptionId] = SubscriptionConfig({
      owner: msg.sender,
      requestedOwner: address(0),
      consumers: consumers
    });

    emit SubscriptionCreated(currentsubscriptionId, msg.sender);
    return currentsubscriptionId;
  }

  /**
   * @notice Request subscription owner transfer.
   * @param subscriptionId - ID of the subscription
   * @param newOwner - proposed new owner of the subscription
   */
  function requestSubscriptionOwnerTransfer(uint64 subscriptionId, address newOwner)
    external
    onlySubOwner(subscriptionId)
    nonReentrant
    whenNotPaused
  {
    // Proposing to address(0) would never be claimable so don't need to check.
    if (s_subscriptionConfigs[subscriptionId].requestedOwner != newOwner) {
      s_subscriptionConfigs[subscriptionId].requestedOwner = newOwner;
      emit SubscriptionOwnerTransferRequested(subscriptionId, msg.sender, newOwner);
    }
  }

  /**
   * @notice Request subscription owner transfer.
   * @param subscriptionId - ID of the subscription
   * @dev will revert if original owner of subscriptionId has
   * not requested that msg.sender become the new owner.
   */
  function acceptSubscriptionOwnerTransfer(uint64 subscriptionId) external nonReentrant whenNotPaused {
    if (s_subscriptionConfigs[subscriptionId].owner == address(0)) {
      revert InvalidSubscription();
    }
    if (s_subscriptionConfigs[subscriptionId].requestedOwner != msg.sender) {
      revert MustBeRequestedOwner(s_subscriptionConfigs[subscriptionId].requestedOwner);
    }
    address oldOwner = s_subscriptionConfigs[subscriptionId].owner;
    s_subscriptionConfigs[subscriptionId].owner = msg.sender;
    s_subscriptionConfigs[subscriptionId].requestedOwner = address(0);
    emit SubscriptionOwnerTransferred(subscriptionId, oldOwner, msg.sender);
  }

  /**
   * @notice Remove a consumer from a OCR2DR subscription.
   * @param subscriptionId - ID of the subscription
   * @param consumer - Consumer to remove from the subscription
   * @return success - returns true if removal was successful, else returns false
   */
  function removeConsumer(uint64 subscriptionId, address consumer)
    external
    onlySubOwner(subscriptionId)
    nonReentrant
    whenNotPaused
    returns (bool)
  {
    // Note bounded by MAX_CONSUMERS
    if (!s_isAuthorizedConsumer[subscriptionId][consumer]) {
      revert InvalidConsumer(subscriptionId, consumer);
    }
    delete s_isAuthorizedConsumer[subscriptionId][consumer];
    address[] memory consumers = s_subscriptionConfigs[subscriptionId].consumers;
    uint256 lastConsumerIndex = consumers.length - 1;
    for (uint256 i = 0; i < consumers.length; i++) {
      if (consumers[i] == consumer) {
        address last = consumers[lastConsumerIndex];
        // Storage write to preserve last element
        s_subscriptionConfigs[subscriptionId].consumers[i] = last;
        // Storage remove last element
        s_subscriptionConfigs[subscriptionId].consumers.pop();
        emit SubscriptionConsumerRemoved(subscriptionId, consumer);
        return true;
      }
    }
    return false;
  }

  /**
   * @notice Add a consumer to a OCR2DR subscription.
   * @param subscriptionId - ID of the subscription
   * @param consumer - New consumer which can use the subscription
   */
  function addConsumer(uint64 subscriptionId, address consumer)
    external
    onlySubOwner(subscriptionId)
    nonReentrant
    whenNotPaused
  {
    // Already maxed, cannot add any more consumers.
    if (s_subscriptionConfigs[subscriptionId].consumers.length == MAX_CONSUMERS) {
      revert TooManyConsumers();
    }
    s_subscriptionConfigs[subscriptionId].consumers.push(consumer);
    s_isAuthorizedConsumer[subscriptionId][consumer] = true;
    emit SubscriptionConsumerAdded(subscriptionId, consumer);
  }

  /**
   * @notice Cancel a subscription
   * @param subscriptionId - ID of the subscription
   * @param to - Where to send the remaining LINK to
   */
  function cancelSubscription(uint64 subscriptionId, address to)
    external
    onlySubOwner(subscriptionId)
    nonReentrant
    whenNotPaused
  {
    // We CANNOT use this current logic for checking for pending requests as it relies upon iterating through the AuthorizedSenders array.
    // if (pendingRequestExists(subscriptionId)) {
    //   revert PendingRequestExists();
    // }
    // Instead, keep an active count of pending requests
    if (uint256(s_subscriptions[subscriptionId].pendingRequestCount) > 0) {
      revert PendingRequestExists();
    }

    cancelSubscriptionHelper(subscriptionId, to);
  }

  function cancelSubscriptionHelper(uint64 subscriptionId, address to) private nonReentrant {
    uint96 balance = s_subscriptions[subscriptionId].balance;
    address[] memory consumers = s_subscriptionConfigs[subscriptionId].consumers;
    // Note bounded by MAX_CONSUMERS;
    // If no consumers, does nothing.
    for (uint256 i = 0; i < consumers.length; i++) {
      delete s_isAuthorizedConsumer[subscriptionId][consumers[i]];
    }
    delete s_subscriptionConfigs[subscriptionId];
    delete s_subscriptions[subscriptionId];
    s_totalBalance -= balance;
    if (!LINK.transfer(to, uint256(balance))) {
      revert InsufficientBalance();
    }
    emit SubscriptionCanceled(subscriptionId, to, balance);
  }


  // This function CANNOT be used it its current form.  It has O(n^2) gas usage as the
  // authorized consumer array grows

  // My suggestion: we need a mapping to an array of pending requestIds for each subId
  // mapping(bytes32 => uint64[]) pendingRequestIds;

  // /**
  //  * @notice Check to see if there exists a request commitment for all consumers for a given sub.
  //  * @param subscriptionId - ID of the subscription
  //  * @return true if there exists at least one unfulfilled request for the subscription, false
  //  * otherwise.
  //  * @dev Looping is bounded to MAX_CONSUMERS*(number of DONs). (incorrect)
  //  * @dev Used to disable subscription canceling while outstanding request are present.
  //  */

  // function pendingRequestExists(uint64 subscriptionId) public view returns (bool) {
  //   address[] memory consumers = s_subscriptionConfigs[subscriptionId].consumers;
  //   address[] memory authorizedSendersList = getAuthorizedSenders();
  //   for (uint256 i = 0; i < consumers.length; i++) {
  //     for (uint256 j = 0; j < authorizedSendersList.length; j++) {
  //       bytes32 requestId = computeRequestId(
  //         authorizedSendersList[j],
  //         consumers[i],
  //         subscriptionId,
  //         s_consumers[consumers[i]][subscriptionId]
  //       );
  //       if (s_requestCommitments[requestId].subscriptionId == 0) {
  //         return true;
  //       }
  //     }
  //   }
  //   return false;
  // }

  function getPendingRequestCount(uint64 subscriptionId) external view returns (uint32) {
    return s_subscriptions[subscriptionId].pendingRequestCount;
  }

  /**
   * @notice Search for all expired requestIds for a given subscriptionId.
   * Start & end nonce should be specified in case the nonce search space
   * becomes to large & exceeds the virtual gas limit for view functions
   * @param subscriptionId SubscriptionId to search
   * @param startNonce Nonce to start search 
   * @param endNonce Nonce to end search
   * @return timedOutRequestIds requestIds which must be passed to the timeoutRequests() function
   */
  function getRequestsToTimeOut(uint64 subscriptionId, uint256 startNonce, uint256 endNonce)
    external
    view
    returns (bytes32[] memory)
  {
    bytes32[] memory timedOutRequestIds = new bytes32[](s_subscriptions[subscriptionId].pendingRequestCount);
    uint256 i = 0;
    for (; startNonce < endNonce; startNonce++) {
      bytes32 requestId = computeRequestId(subscriptionId, startNonce);
      if (
        s_requestCommitments[requestId].timestamp != uint40(0)
        && block.timestamp >
        (uint256(s_requestCommitments[requestId].timestamp) + s_config.requestTimeoutSeconds)
      ) {
        timedOutRequestIds[i] = requestId;
        i++;
      }
    }
    return timedOutRequestIds;
  }

  /**
   * @notice Time out all provided requests if they are expired:
   * unlocks funds, deletes request commitment, and decrements number of pending requests for the subscription
   * @param requestIdsToTimeout - A list of request IDs to time out
   */

  function timeoutRequests(bytes32[] calldata requestIdsToTimeout) external {
    for (uint256 i = 0; i < requestIdsToTimeout.length; i++) {
      timeoutRequest(requestIdsToTimeout[i]);
    }
  }

  /**
   * @notice Times out a request if it is expired:
   * unlocks funds, deletes request commitment, and decrements number of pending requests for the subscription
   * @param requestIdToTimeout - A list of request IDs to time out
   * @return If the request is not expired, returns false, else returns true
   */
  function timeoutRequest(bytes32 requestIdToTimeout) internal returns(bool) {
    Commitment memory commitment = s_requestCommitments[requestIdToTimeout];

    if (
      (uint256(commitment.timestamp) + uint256(s_config.requestTimeoutSeconds))
      > block.timestamp
    ) {
      // Decrement blocked balance
      s_subscriptions[commitment.subscriptionId].blockedBalance -= commitment.estimatedCost;
      // Delete commitment
      delete s_requestCommitments[requestIdToTimeout];
      s_subscriptions[commitment.subscriptionId].pendingRequestCount--;
      emit RequestTimedOut(requestIdToTimeout);
      return true;
    }
    return false;
  }

  modifier onlySubOwner(uint64 subscriptionId) {
    address owner = s_subscriptionConfigs[subscriptionId].owner;
    if (owner == address(0)) {
      revert InvalidSubscription();
    }
    if (msg.sender != owner) {
      revert MustBeSubOwner(owner);
    }
    _;
  }

  modifier nonReentrant() {
    if (s_config.reentrancyLock) {
      revert Reentrant();
    }
    _;
  }

  function _canSetAuthorizedSenders() internal view override onlyOwner returns (bool) {
    return true;
  }
}
