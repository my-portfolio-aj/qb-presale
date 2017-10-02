pragma solidity ^0.4.11;

import "./RefundableOnTokenCrowdsale.sol";
import "zeppelin-solidity/contracts/crowdsale/Crowdsale.sol";
import "./WhitelistedPreCrowdsale.sol";
import "./QiibeeToken.sol";

/**
   @title Crowdsale for the QBX Token Generation Event

   Implementation of the QBX Token Generation Event (TGE): A 4-week, fixed token supply with a
   fixed rate until the goal (soft cap) is reached and then a dynamic rate linked to the amount of
   tokens sold is applied. TGE has a cap on the amount of token (hard cap).

   Tokens bought in the private presale will be added before the pre-TGE starts.

   There is pre-TGE for whitelisted investors with global a preferential rate. They can also
   have a special rate (different for each whiteslisted investor) that will apply only if they buy
   a determined amount of ETH (if not, they just get the global preferential rate).

   In case of the goal not being reached by purchases made during the 4-week period the token will
   not start operating and all funds sent during that period will be made available to be claimed
   by the originating addresses.
 */

contract QiibeeCrowdsale is WhitelistedPreCrowdsale, RefundableOnTokenCrowdsale {

    using SafeMath for uint256;

    uint256 public constant TOTAL_SUPPLY = 10000000000000000000000000000; //in sqbx
    uint256 public constant FOUNDATION_SUPPLY = 7600000000000000000000000000; //in sqbx
    uint256 public constant CROWDSALE_SUPPLY = 2400000000000000000000000000; //in sqbx

    // initial rate of ether to QBX
    uint256 public initialRate;

    // maximum amount of qbx (in sqbx) that can be minted
    uint256 public cap;


     /**
     * event for change wallet logging
     * @param wallet new wallet address
     */
    event WalletChange(address wallet);

    /**
     * event for adding tokens from the private sale
     * @param purchaser who paid for the tokens
     * @param beneficiary who got the tokens
     * @param value weis paid for purchase
     * @param amount amount of tokens purchased
     */
    event PrivatePresalePurchase(address indexed purchaser,
      address indexed beneficiary,
      uint256 rate,
      uint256 value,
      uint256 amount);

    function QiibeeCrowdsale(
        uint256 _startPreTime,
        uint256 _endPreTime,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _initialRate,
        uint256 _preferentialRate,
        uint256 _goal,
        uint256 _cap,
        address _wallet
    )
        WhitelistedPreCrowdsale(_preferentialRate, _startPreTime, _endPreTime)
        RefundableOnTokenCrowdsale(_goal)
        Crowdsale(_startTime, _endTime, _initialRate, _wallet)
    {
        require(_initialRate > 0);
        require(_cap > 0);
        require(_goal <= _cap);
        require(_endPreTime < _startTime);

        initialRate = _initialRate;
        cap = _cap;

        QiibeeToken(token).pause();
    }

    function createTokenContract() internal returns(MintableToken) {
        return new QiibeeToken();
    }

    function getRate() public constant returns(uint256) {
        // preiod of the pre TGE
        bool withinPeriod = now >= startPreTime && now <= endPreTime;

        // whitelisted buyers can purchase at preferential price during pre-ico event
        if (isWhitelisted(msg.sender) && withinPeriod) {
            // some early buyers are offered a different rate rather than the preferential rate but they
            // are required to buy at least a minimum already negotiated
            if (buyerRate[msg.sender] != 0 && msg.value >= buyerMinimum[msg.sender]) {
                return buyerRate[msg.sender];
            }
            return preferentialRate;
        }

        if (tokensSold >= goal) {
            return initialRate.mul(1000).div(tokensSold.mul(1000).div(goal));
        }
        return initialRate;
    }

    // low level token purchase function
    function buyTokens(address beneficiary) payable {
        require(beneficiary != address(0));
        require(validPurchase());

        uint256 rate = getRate();
        uint256 tokens = msg.value.mul(rate);
        uint256 newTokenAmount = tokensSold.add(tokens);
        assert(newTokenAmount <= cap);

        // update state
        weiRaised = weiRaised.add(msg.value);
        tokensSold = newTokenAmount;

        token.mint(beneficiary, tokens);

        TokenPurchase(msg.sender, beneficiary, msg.value, tokens);

        forwardFunds();
    }

    /**
        @dev Directly mint tokens (used for non ETH investments).Can only be called by the owner.

        @param beneficiary Address to which qbx will be sent
    */
    function mintTokens(address beneficiary, uint256 tokens) onlyOwner returns (bool) { //does it need payable?
        require(beneficiary != address(0));
        require(validPurchase());

        uint256 rate = getRate();
        uint256 weiAmount = tokens.mul(rate);
        uint256 newTokenAmount = tokensSold.add(tokens);
        assert(newTokenAmount <= cap);

        //update state
        weiRaised = weiRaised.add(weiAmount);
        tokensSold = newTokenAmount;

        token.mint(beneficiary, tokens);

        TokenPurchase(msg.sender, beneficiary, weiAmount, tokens);

        toVault(weiAmount, beneficiary); //TODO: check this call
    }

    /**
        @dev Allows to add the address and the amount of wei sent by a contributor
        in the private presale. Can only be called by the owner before the beginning
        of TGE

        @param beneficiary Address to which qbx will be sent
        @param tokens Amount of tokens sold
        @param rate Rate of the tokens sold
    */
    function addPrivatePresaleTokens(address beneficiary, uint256 tokens, uint256 rate) onlyOwner {
        require(now < startPreTime);
        require(beneficiary != address(0));
        require(tokens > 0);
        require(rate > 0);

        uint256 tokensAmount = tokens * (1 wei); //converts qbx to sqbx
        uint256 weiAmount = tokensAmount.mul(rate);

        //update state
        weiRaised = weiRaised.add(weiAmount);
        tokensSold = tokensSold.add(tokensAmount);

        token.mint(beneficiary, tokensAmount);

        PrivatePresalePurchase(msg.sender, beneficiary, rate, weiAmount, tokensAmount);

        //TODO: forwardFunds?
        // toVault(weiAmount, beneficiary);
    }

    function setWallet(address _wallet) onlyOwner public {
        require(_wallet != 0x0);
        wallet = _wallet;
        WalletChange(_wallet);
    }

    function unpauseToken() onlyOwner {
        require(isFinalized);
        QiibeeToken(token).unpause();
    }

    function pauseToken() onlyOwner {
        require(isFinalized);
        QiibeeToken(token).pause();
    }

    function finalization() internal {
        uint256 crowdsaleSupply = token.totalSupply();
        uint256 restSupply = CROWDSALE_SUPPLY.sub(crowdsaleSupply);
        //TODO: do the restSupply go to the foundation? If they go, just simplify the calculation with TOTAL_SUPPLY.sub(crowdsaleSupply).
        uint256 foundationSupply = FOUNDATION_SUPPLY.add(restSupply);
        token.mint(wallet, foundationSupply);

        super.finalization();
    }

    function finalize() onlyOwner { //make it public? redistribute tokens to other pools?
        require(!isFinalized);
        require(hasEnded());

        finalization();
        Finalized();

        isFinalized = true;

        unpauseToken();

        // transfer the ownership of the token to the foundation
        token.transferOwnership(owner);
    }

    // overrides Crowdsale#hasEnded to add cap logic
    function hasEnded() public constant returns (bool) {
        bool capReached = tokensSold >= cap;
        return super.hasEnded() || capReached;
    }

}