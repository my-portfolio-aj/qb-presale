// var help = require('./helpers');

// var BigNumber = web3.BigNumber;

// require('chai')
//   .use(require('chai-bignumber')(BigNumber))
//   .should();

// var QiibeeToken = artifacts.require('./QiibeeToken.sol');
// var Message = artifacts.require('./Message.sol');

// const LOG_EVENTS = true;

// contract('QiibeeToken', function(accounts) {

//   var token;
//   var eventsWatcher;

//   beforeEach(async function() {
//     const rate = 100000000000;
//     const crowdsale = await help.simulateCrowdsale(rate, [40,30,20,10,0], accounts, 1);
//     token = QiibeeToken.at(await crowdsale.token.call());
//     eventsWatcher = token.allEvents();
//     eventsWatcher.watch(function(error, log){
//       if (LOG_EVENTS)
//         console.log('Event:', log.event, ':',log.args);
//     });
//   });

//   afterEach(function(done) {
//     eventsWatcher.stopWatching();
//     done();
//   });

//   it('has name, symbol and decimals', async function() {
//     assert.equal('Líf', await token.NAME.call());
//     assert.equal('LIF', await token.SYMBOL.call());
//     assert.equal(18, await token.DECIMALS.call());
//   });

//   it('should return the correct allowance amount after approval', async function() {
//     await token.approve(accounts[2], help.qbx2sqbx(10),{ from: accounts[1] });
//     let allowance = await token.allowance(accounts[1], accounts[2],{ from: accounts[1]});
//     assert.equal(help.sqbx2qbx(allowance), 10);
//     await help.checkToken(token, accounts, 125, [40,30,20,10,0]);
//   });

//   it('should return correct balances after transfer', async function() {
//     await token.transfer(accounts[4], help.qbx2sqbx(3.55), { from: accounts[1] });
//     await help.checkToken(token, accounts, 125, [36.45,30,20,13.55,0]);
//   });

//   it('should throw an error when trying to transfer more than balance', async function() {
//     try {
//       await token.transfer(accounts[2], help.qbx2sqbx(21));
//       assert(false, 'transfer should have thrown');
//     } catch (error) {
//       if (!help.isInvalidOpcodeEx(error)) throw error;
//     }
//     await help.checkToken(token, accounts, 125, [40,30,20,10,0]);
//   });

//   it('should return correct balances after transfering from another account', async function() {
//     await token.approve(accounts[3], help.qbx2sqbx(5), {from: accounts[1]});
//     await token.transferFrom(accounts[1], accounts[2], help.qbx2sqbx(5), {from: accounts[3]});
//     await help.checkToken(token, accounts, 125, [35,35,20,10,0]);
//   });

//   it('should throw an error when trying to transfer more than allowed', async function() {
//     await token.approve(accounts[3], help.qbx2sqbx(10), {from: accounts[1]});
//     try {
//       await token.transferFrom(accounts[1], accounts[3], help.qbx2sqbx(11), {from: accounts[3]});
//       assert(false, 'transferFrom should have thrown');
//     } catch (error) {
//       if (!help.isInvalidOpcodeEx(error)) throw error;
//     }
//     await help.checkToken(token, accounts, 125, [40,30,20,10,0]);
//   });

//   it('should return correct balances after transferData and show the event on receiver contract', async function() {
//     let message = await Message.new();
//     help.abiDecoder.addABI(Message._json.abi);

//     let data = message.contract.showMessage.getData(web3.toHex(123456), 666, 'Transfer Done');

//     let transaction = await token.transferData(message.contract.address, help.qbx2sqbx(1), data, {from: accounts[1]});
//     let decodedEvents = help.abiDecoder.decodeLogs(transaction.receipt.logs);

//     assert.equal(2, decodedEvents.length);
//     assert.equal(data, decodedEvents[1].events[3].value);

//     assert.equal(help.qbx2sqbx(1), await token.balanceOf(message.contract.address));

//     await help.checkToken(token, accounts, 125, [39,30,20,10,0]);
//   });

//   it('should return correct balances after transferDataFrom and show the event on receiver contract', async function() {
//     let message = await Message.new();
//     help.abiDecoder.addABI(Message._json.abi);

//     let data = message.contract.showMessage.getData(web3.toHex(123456), 666, 'Transfer Done');

//     await token.approve(accounts[2], help.qbx2sqbx(2), {from: accounts[1]});

//     let transaction = await token.transferDataFrom(accounts[1], message.contract.address, help.qbx2sqbx(1), data, {from: accounts[2]});
//     let decodedEvents = help.abiDecoder.decodeLogs(transaction.receipt.logs);

//     assert.equal(2, decodedEvents.length);
//     assert.equal(data, decodedEvents[1].events[3].value);
//     assert.equal('0x1e24000000000000000000000000000000000000000000000000000000000000', decodedEvents[0].events[0].value);
//     assert.equal(666, decodedEvents[0].events[1].value);
//     assert.equal('Transfer Done', decodedEvents[0].events[2].value);
//     assert.equal(help.qbx2sqbx(1), await token.balanceOf(message.contract.address));

//     await help.checkToken(token, accounts, 125, [39,30,20,10,0]);
//   });

//   it('should return correct balances after approve and show the event on receiver contract', async function() {
//     let message = await Message.new();
//     help.abiDecoder.addABI(Message._json.abi);

//     let data = message.contract.showMessage.getData(web3.toHex(123456), 666, 'Transfer Done');

//     let transaction = await token.approveData(message.contract.address, help.qbx2sqbx(1000), data, {from: accounts[1]});
//     let decodedEvents = help.abiDecoder.decodeLogs(transaction.receipt.logs);

//     assert.equal(2, decodedEvents.length);
//     assert.equal(data, decodedEvents[1].events[3].value);

//     new BigNumber(help.qbx2sqbx(1000)).should.be.bignumber.equal(await token.allowance(accounts[1], message.contract.address));

//     await help.checkToken(token, accounts, 125, [40,30,20,10,0]);
//   });

//   it('should fail inside approveData and not trigger ApproveData event', async function() {
//     let message = await Message.new();
//     help.abiDecoder.addABI(Message._json.abi);

//     let data = message.contract.fail.getData();

//     let transaction = await token.approveData(
//       message.contract.address, help.qbx2sqbx(10), data,
//       {from: accounts[1]}
//     );

//     let decodedEvents = help.abiDecoder.decodeLogs(transaction.receipt.logs);
//     assert.equal(0, decodedEvents.length);

//     new BigNumber(help.qbx2sqbx(10)).should.be.bignumber
//       .equal(await token.allowance(accounts[1], message.contract.address));

//     await help.checkToken(token, accounts, 125, [40,30,20,10,0]);
//   });

//   it('should fail inside transferData and not trigger TransferData event', async function() {
//     let message = await Message.new();
//     help.abiDecoder.addABI(Message._json.abi);

//     let data = message.contract.fail.getData();

//     let transaction = await token.transferData(
//       message.contract.address, help.qbx2sqbx(10), data,
//       {from: accounts[1]}
//     );

//     let decodedEvents = help.abiDecoder.decodeLogs(transaction.receipt.logs);
//     assert.equal(0, decodedEvents.length);

//     new BigNumber(help.qbx2sqbx(10)).should.be.bignumber
//       .equal(await token.balanceOf(message.contract.address));

//     await help.checkToken(token, accounts, 125, [30,30,20,10,0]);
//   });

//   it('should fail inside transferDataFrom and not trigger TransferData event', async function() {
//     let message = await Message.new();
//     help.abiDecoder.addABI(Message._json.abi);

//     let data = message.contract.fail.getData();

//     await token.approve(accounts[1], help.qbx2sqbx(10), {from: accounts[2]});

//     let transaction = await token.transferDataFrom(
//       accounts[2], message.contract.address, help.qbx2sqbx(10), data,
//       {from: accounts[1]}
//     );

//     let decodedEvents = help.abiDecoder.decodeLogs(transaction.receipt.logs);
//     assert.equal(0, decodedEvents.length);

//     new BigNumber(help.qbx2sqbx(10)).should.be.bignumber
//       .equal(await token.balanceOf(message.contract.address));

//     await help.checkToken(token, accounts, 125, [40,20,20,10,0]);
//   });

//   it('should fail transferData when using QiibeeToken contract address as receiver', async function() {

//     try {
//       await token.transferData(token.contract.address, help.qbx2sqbx(1000), web3.toHex(0), {from: accounts[1]});
//       assert(false, 'transferData should have thrown');
//     } catch (error) {
//       if (!help.isInvalidOpcodeEx(error)) throw error;
//     }

//     await help.checkToken(token, accounts, 125, [40,30,20,10,0]);
//   });

//   it('should fail transferDataFrom when using QiibeeToken contract address as receiver', async function() {

//     await token.approve(accounts[1], help.qbx2sqbx(1), {from: accounts[3]});

//     try {
//       await token.transferDataFrom(accounts[3], token.contract.address, help.qbx2sqbx(1), web3.toHex(0), {from: accounts[1]});
//       assert(false, 'transferDataFrom should have thrown');
//     } catch (error) {
//       if (!help.isInvalidOpcodeEx(error)) throw error;
//     }

//     await help.checkToken(token, accounts, 125, [40,30,20,10,0]);
//   });

//   it('can burn tokens', async function() {
//     let totalSupply = await token.totalSupply.call();
//     new BigNumber(0).should.be.bignumber.equal(await token.balanceOf(accounts[5]));

//     let initialBalance = web3.toWei(1);
//     await token.transfer(accounts[5], initialBalance, { from: accounts[1] });
//     initialBalance.should.be.bignumber.equal(await token.balanceOf(accounts[5]));

//     let burned = web3.toWei(0.3);

//     assert.equal(accounts[0], await token.owner());

//     // pause the token
//     await token.pause({from: accounts[0]});

//     try {
//       await token.burn(burned, {from: accounts[5]});
//       assert(false, 'burn should have thrown');
//     } catch (error) {
//       if (!help.isInvalidOpcodeEx(error)) throw error;
//     }
//     await token.unpause({from: accounts[0]});

//     // now burn should work
//     await token.burn(burned, {from: accounts[5]});

//     new BigNumber(initialBalance).minus(burned).
//       should.be.bignumber.equal(await token.balanceOf(accounts[5]));
//     totalSupply.minus(burned).should.be.bignumber.equal(await token.totalSupply.call());
//   });

// });
