'use strict';
const expect = require('chai').expect;

const Transaction = require('../lib/transaction');

describe('Transaction', function() {
  it('retains Message ID, callback, and cleanup references', function() {
    const callback = (err, message) => {};
    const cleanup = () => {};
    const transaction = new Transaction({id: 'test-id'}, callback, cleanup);

    expect(transaction.id).to.equal('test-id');
    expect(transaction.callback).to.equal(callback);
    expect(transaction._cleanup).to.equal(cleanup);
  });

  it('sets _cleanup to an empty function', function() {
    const callback = (err, message) => {};
    const transaction = new Transaction({id: 'test-id'}, callback);

    expect(transaction._cleanup).to.be.instanceof(Function);
  });

  it('calls the cleanup handler', function(done) {
    const callback = (err, message) => {};
    const cleanup = () => { done(); };
    const transaction = new Transaction({id: 'test-id'}, callback, cleanup);

    transaction.complete();
  });

  it('cancels a pending transaction', function(done) {
    const callback = (err, message) => {
      expect(err).to.be.instanceof(Transaction.Canceled);
      expect(err.name).to.equal('Canceled');
      expect(transaction._timeout).to.be.undefined;

      done();
    };
    const cleanup = () => {};
    const transaction = new Transaction({
      id: 'test-id',
      timeout: 1000
    }, callback, cleanup);

    expect(transaction._timeout).to.not.be.undefined;
    transaction.cancel();
  });

  it('times out when no response is received', function(done) {
    const callback = (err, message) => {
      expect(err).to.be.instanceof(Transaction.Timeout);
      expect(err.name).to.equal('Timeout');
      done();
    };
    const cleanup = () => {};
    const transaction = new Transaction({
      id: 'test-id',
      timeout: 50
    }, callback, cleanup);

    expect(transaction._timeout).to.not.be.undefined;
  });

  it('returns a response message', function(done) {
    const response = {
      id: 'test-response-message'
    };

    const callback = (err, message) => {
      expect(transaction._timeout).to.be.undefined;
      expect(message).to.eql(response);

      done();
    };
    const cleanup = () => {};
    const transaction = new Transaction({
      id: 'test-id',
      timeout: 1000
    }, callback, cleanup);

    expect(transaction._timeout).to.not.be.undefined;
    transaction.complete(response);
  });
});
