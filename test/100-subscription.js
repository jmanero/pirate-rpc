'use strict';
const expect = require('chai').expect;

const EventEmitter = require('events').EventEmitter;
const Subscription = require('../lib/subscription');

describe('Subscription', function() {
  it('retains EventEmitter, event, handler, and cleanup references', function() {
    const emitter = new EventEmitter();
    const handler = () => {};
    const cleanup = () => {};
    const subscription = new Subscription(emitter, 'test-event', handler, cleanup);

    expect(subscription.emitter).to.eql(emitter);
    expect(subscription.event).to.equal('test-event');
    expect(subscription.handler).to.eql(handler);
    expect(subscription._cleanup).to.eql(cleanup);
  });

  it('sets _cleanup to an empty function', function() {
    const emitter = new EventEmitter();
    const handler = () => {};
    const subscription = new Subscription(emitter, 'test-event', handler);

    expect(subscription._cleanup).to.be.instanceof(Function);
  });

  it('subscribes to an event on the EventEmitter', function(done) {
    const emitter = new EventEmitter();
    const handler = () => { done(); };
    const cleanup = () => {};
    const subscription = new Subscription(emitter, 'test-event', handler, cleanup);

    expect(emitter.listeners('test-event').length).to.equal(1);
    emitter.emit('test-event');
  });

  it('unsubscribes from the EventEmitter and calls the cleanup handler when destroyed', function(done) {
    const emitter = new EventEmitter();
    const handler = () => {};
    const cleanup = () => { done(); };
    const subscription = new Subscription(emitter, 'test-event', handler, cleanup);

    expect(emitter.listeners('test-event').length).to.equal(1);

    subscription.destroy();
    expect(emitter.listeners('test-event').length).to.equal(0);
  });
});
