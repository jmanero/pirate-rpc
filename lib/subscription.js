'use strict';

/**
 * Manage mappings between sessions and event emitters
 * @module subscription
 */

/**
 * Store the emitter, event name, and handler for later removal
 */
class Subscription {
  /**
   * Create and store a new event subscription
   *
   * @param {Session} session The subscription's parent session
   * @param {String}  name    A name for the subscription resource
   * @param {EventEmitter}  emitter The EventEmitter being subscribed to
   * @param {String}  event   The event to listen for on the EventEmitter
   * @param {Function}  handler The callback for the subscribed event
   *
   * @return  {Subscription}
   */
  static create(session, name, emitter, event, handler) {
    const cleanup = () => { session.subscriptions.delete(name); };
    const subscription = new Subscription(emitter, event, handler, cleanup);

    session.subscriptions.set(name, subscription);

    return subscription;
  }

  /**
   * @constructor
   * @param {EventEmitter}  emitter The EventEmitter being subscribed to
   * @param {String}  event   The event to listen for on the EventEmitter
   * @param {Function}  handler The callback for the subscribed event
   * @param {Function}  cleanup An optional cleanup handle. Called after the
   *                            subscription is destroyed
   */
  constructor(emitter, event, handler, cleanup) {
    this.emitter = emitter;
    this.event = event;
    this.handler = handler;

    this._cleanup = cleanup instanceof Function ? cleanup : () => {};
    emitter.on(event, handler);
  }

  /**
   * Remove the underlying listener
   */
  destroy() {
    this.emitter.removeListener(this.event, this.handler);
    this._cleanup();
  }
}
module.exports = Subscription;
