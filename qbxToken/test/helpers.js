var BigNumber = web3.BigNumber;

var QiibeeToken = artifacts.require('./QiibeeToken.sol');
var QiibeeCrowdsale = artifacts.require('./QiibeeCrowdsale.sol');
var abiDecoder = require('abi-decoder');
abiDecoder.addABI(QiibeeToken._json.abi);
abiDecoder.addABI(QiibeeCrowdsale._json.abi);

var latestTime = require('./helpers/latestTime');
var {increaseTimeTestRPC, increaseTimeTestRPCTo} = require('./helpers/increaseTime');

const DEBUG_MODE = (process.env.WT_DEBUG == 'true') || false;

let gasPriceFromEnv = parseInt(process.env.GAS_PRICE);
let gasPrice;
if (isNaN(gasPriceFromEnv))
  gasPrice = 21000000000;
else
  gasPrice = gasPriceFromEnv;

module.exports = {

  zeroAddress: '0x0000000000000000000000000000000000000000',

  abiDecoder: abiDecoder,

  gasPrice: new BigNumber(gasPrice),

  hexEncode: function(str){
    var hex, i;
    var result = '';
    for (i=0; i < str.length; i++) {
      hex = str.charCodeAt(i).toString(16);
      result += ('000'+hex).slice(-4);
    }
    return result;
  },

  hexDecode: function(str){
    var j;
    var hexes = str.match(/.{1,4}/g) || [];
    var back = '';
    for(j = 0; j<hexes.length; j++) {
      back += String.fromCharCode(parseInt(hexes[j], 16));
    }
    return back;
  },

  sqbx2qbx: function(value){
    return web3.fromWei(value, 'ether');
  },

  qbx2sqbx: function(value){
    return web3.toWei(value, 'ether');
  },

  isInvalidOpcodeEx: function(e) {
    return e.message.search('invalid opcode') >= 0;
  },

  waitBlocks: function(toWait, accounts){
    return this.waitToBlock(parseInt(web3.eth.blockNumber) + toWait, accounts);
  },

  simulateCrowdsale: async function(rate, balances, accounts, weiPerUSD) {
    await increaseTimeTestRPC(1);
    var startTime = latestTime() + 5;
    var endTime = startTime + 20;
    var crowdsale = await LifCrowdsale.new(
      startTime+3, startTime+15, endTime,
      rate, rate+10, rate+20, 1,
      accounts[0]
    );
    await increaseTimeTestRPCTo(latestTime()+1);
    await crowdsale.setWeiPerUSDinTGE(weiPerUSD);
    await increaseTimeTestRPCTo(startTime+3);
    for(let i = 0; i < 5; i++) {
      if (balances[i] > 0)
        await crowdsale.sendTransaction({ value: web3.toWei(balances[i]/rate, 'ether'), from: accounts[i + 1]});
    }
    await increaseTimeTestRPCTo(endTime+1);
    await crowdsale.finalize();
    return crowdsale;
  },

  debug: DEBUG_MODE ? console.log : function() {},

  checkToken: async function(token, accounts, totalSupply, balances) {
    let debug = this.debug;
    let [
      tokenTotalSupply,
      tokenAccountBalances,
    ] = await Promise.all([
      token.totalSupply(),
      Promise.all([
        token.balanceOf(accounts[1]),
        token.balanceOf(accounts[2]),
        token.balanceOf(accounts[3]),
        token.balanceOf(accounts[4]),
        token.balanceOf(accounts[5])
      ])
    ]);

    debug('Total Supply:', this.sqbx2qbx(parseFloat(tokenTotalSupply)));
    for(let i = 0; i < 5; i++) {
      debug(
        'Account[' + (i + 1) + ']',
        accounts[i + 1],
        ', Balance:', this.sqbx2qbx(tokenAccountBalances[i])
      );
    }

    if (totalSupply)
      assert.equal(this.sqbx2qbx(parseFloat(tokenTotalSupply)), totalSupply);
    if (balances){
      assert.equal(this.sqbx2qbx(tokenAccountBalances[0]), balances[0]);
      assert.equal(this.sqbx2qbx(tokenAccountBalances[1]), balances[1]);
      assert.equal(this.sqbx2qbx(tokenAccountBalances[2]), balances[2]);
      assert.equal(this.sqbx2qbx(tokenAccountBalances[3]), balances[3]);
      assert.equal(this.sqbx2qbx(tokenAccountBalances[4]), balances[4]);
    }
  },

  //TODO: get rate for presale?
  getCrowdsaleExpectedRate: function(state, sender) {
    let { initialRate, preferentialRate, goal } = state.crowdsaleData,
        { tokensSold, buyerRate, whitelist } = state;
    // some early buyers are offered a different rate rather than the preferential rate
    if (buyerRate.length > 0 && buyerRate[sender] != 0) { //TODO: check if that of the .length has to be in the contract
        return buyerRate[sender];
    }

    // whitelisted buyers can purchase at preferential price during pre-ico event
    if (whitelist[sender] == true) {
        return preferentialRate;
    }

    // what about rate < initialRate
    if (tokensSold > goal) { //TODO: add this condition as well || (tokensSold + weiAmount.mul(initialRate)) > goal
        return initialRate / (tokensSold / goal);
    }
    return initialRate;
  },

  getPresalePaymentMaxTokens: function(minCap, maxTokens, presaleBonusRate, presaleAmountEth) {
    let minTokenPrice = minCap / maxTokens;
    return (presaleAmountEth / minTokenPrice) * (presaleBonusRate + 100) / 100;
  }
};
