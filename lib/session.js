'use strict';
const EventEmitter = require('events').EventEmitter;
const UUID = require('node-libuuid');

const Message = require('./message');
const Subscription = require('./subscription');
const Transaction = require('./transaction');

/**
 * An RPC Session
 */
class Session extends EventEmitter {
  /**
   * @constructor
   *
   * @param {Pirate}  controller  The parent controller that the session belongs to
   */
  constructor(controller) {
    super();

    this.id = UUID.v4();

    this.controller = controller;
    this.handlers = controller.handlers;
    this.types = controller.types;

    this.subscriptions = new Map();
    this.requests = new Map();
  }

  /*
   * Driver Interface
   */

  /**
   * Called internally by the Session to pass messages to the Driver
   *
   * @abstract
   * @param {Buffer}  data  A serialized message that the Driver should transmit
   *                        via it's underlying transport
   */
  _send() {
    throw Error('Drivers must replace Session\'s abstract `_send(data)` method!');
  }

  /**
   * Called internally by the Session to instruct the Driver to terminate the
   * underlying transport
   *
   * @abstract
   */
  _end() {
    throw Error('Drivers must replace Session\'s abstract `_end()` method!');
  }

  /**
   * Called by the Driver after the transport has closed. Perform cleanup tasks
   * to discard the closed session.
   *
   * @param {Error} err Indicates that the session is shutting down due to an error
   */
  _close(err) {
    this.subscriptions.forEach((subscription) => subscription.destroy());
    this.requests.forEach((transaction) => transaction.cancel());
    this.controller.sessions.delete(this.id);

    // Emit an error
    if (err) { this.emit('error', err); }
  }

  /**
   * Called by Drivers to pass received messages to the Session
   *
   * @param {Buffer}  data  Incoming message payload
   */
  _receive(data) {
    const message = Message.create(this, data.type, data.payload, data.metadata);

    // Check if the incoming message is a response
    if (message.to && this.requests.has(message.to)) {
      return this.requests.get(message.to).complete(message);
    }

    // Call message handler
    if (this.handlers.has(message.type)) {
      return this.handlers.get(message.type)(message, this);
    }

    // Reject unhandled messages if configured
    if (this.controller.rejectUnhandled) {
      return Message.create(this, 'pirate:res:unhandled').reply(message).send();
    }

    // Default behavior is to emit the message as an event
    this.emit('message:*', message);
    this.emit(`message:${message.type}`, message);
  }

  /*
   * Public interface
   */

  /**
   * Create a new message for the session
   *
   * @param {String}  type  Message type
   * @param {Object}  payload Message payload
   * @param {Object}  options Message options
   *
   * @return  {Message}
   */
  message(type, payload, options) {
    return Message.create(this, type, payload, options);
  }

  /**
   * Send a message
   *
   * @param {Message} message     A message instance to send to the session peer
   * @param {Function}  callback  An optional callback for synchronous messages
   */
  send(message, callback) {
    if (message.synchronous && callback instanceof Function) {
      Transaction.create(this, message, callback);
    }

    this._send(message);
  }

  /**
   * Gracefully shutdown a session
   */
  end() {
    this._end();
  }

  /**
   * Subscribe the Session to an external event
   *
   * @param {String}  name  Subscription group name
   * @param {EventEmitter}  emitter External EventEmitter
   * @param {String}  event Event name
   * @param {Function}  handler Event handler
   *
   * @return {Subscription}
   */
  subscribe(name, emitter, event, handler) {
    if (this.subscriptions.has(name)) {
      throw ReferenceError(`Session already has a subscription registered with name ${name}!`);
    }

    return Subscription.create(this, name, emitter, event, handler);
  }

  /**
   * Remove a subscription from the Session
   *
   * @param {String}  name  Subscription group name
   */
  unsubscribe(name) {
    if (this.subscriptions.has(name)) {
      this.subscriptions.get(name).destroy();
    }
  }

  /**
   * Generate an object that can be safely marshaled to JSON
   * @return {Object}
   */
  toJSON() {
    return ({
      id: this.id,
      remote: this.remote,
      subscriptions: Array.from(this.subscriptions.keys()),
      requests: Array.from(this.requests.keys())
    });
  }
}
module.exports = Session;
