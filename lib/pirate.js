'use strict';
const Message = require('./message');
const Session = require('./session');

/**
 * Putting the "Arrr" in Remote Procedure Calls
 */
class Pirate {
  /**
   * @constructor
   * @param {Object}  driver    An Object with `server` and `client` methods to
   *                            fulfill the driver interface
   * @param {Object}  options
   * @param {Boolean} options.rejectUnhandled Reply to unhandled message types with
   *                                          with a 'pirate:res:unhandled' message
   */
  constructor(driver, options) {
    options = Object.assign({}, options);

    this.rejectUnhandled = !!options.rejectUnhandled;

    this.driver = driver;

    this.sessions = new Map();
    this.handlers = new Map(Pirate.DEFAULT_HANDLERS);
    this.types = new Map();
  }

  /**
   * Initialize the server driver
   *
   * @param {Server}  resource  A server handle on which the Driver should attach
   *                            incoming connections to a session
   * @param {Object}  options   An optional Object of additional parameters for
   *                            the controller and Driver
   * @return {Pirate}
   */
  listen(resource, options) {
    this.driver.server(this, resource, options);

    return this;
  }

  /**
   * Initialize the client driver
   *
   * @param {Server}  resource  An optional client handle on which the Driver
   *                            should handle connections
   * @param {Object}  options   An optional Object of additional parameters for
   *                            the controller and Driver
   * @return {Pirate}
   */
  connect(resource, options) {
    const session = new Session(this);

    this.driver.client(session, resource, options);

    return session;
  }

  /*
   * Driver Interface
   */

  /**
   * Called by the Driver to initiate a new client session
   *
   * @param {Client}  resource  An optional client handle that the Driver
   *                            should bind to a new session
   * @param {Object}  options   An optional Object of additional parameters for
   *                            the Driver
   *
   * @return {Session}
   */
  _accept(resource, options) {
    const session = new Session(this);

    this.sessions.set(session.id, session);
    this.driver.client(session, resource, options);

    return session;
  }

  /*
   * Public Interface
   */

  /**
   * Define a Message type that the RPC controller can send and receive
   *
   * @param {String}  type  The name of the Message type
   *
   * @param {Object}  defaults
   * @param {Boolean} defaults.synchronous This message expects a response from the peer. The
   *                                      session should set up a response hook for it.
   * @param {Number}  defaults.timeout     For `synchronous` methods, set a response timeout.
   *
   *
   * @param {Object}  prototype Methods that should be added to the message-type's
   *                            class' prototype
   *
   * @return  {Message} The generated Message child-class
   */
  message(type, defaults, prototype) {
    defaults = Object.assign({
      synchronous: false
    }, defaults);

    /* eslint-disable require-jsdoc */
    const Type = class extends Message {
      constructor(session, payload, options) {
        super(type, session, payload, Object.assign({}, defaults, options));
      }

      static get type() {
        return type;
      }

      static get synchronous() {
        return defaults.synchronous;
      }

      static get timeout() {
        return defaults.timeout;
      }
    };
    /* eslint-enable require-jsdoc */

    this.types.set(type, Type);
    Object.assign(Type.prototype, prototype);

    return Type;
  }

  /**
   * Define a handler for a received message
   *
   * @param {String}    type    The message type that should be passed to this handler
   * @param {Function}  method  Called when a session receives a message
   *                            matching `type`
   */
  handler(type, method) {
    if (!(method instanceof Function)) {
      throw TypeError('RPC#handler argument `method` must be a Function!');
    }

    this.handlers.set(type, method);
  }
}
module.exports = Pirate;

const NOOP = () => {};

/**
 * A Map of default message handlers that all controllers
 * will be instantiated with
 * @type {Map}
 */
Pirate.DEFAULT_HANDLERS = new Map([
  ['pirate:res:client-error', NOOP],
  ['pirate:res:unhandled', NOOP]
]);

Pirate.Message = Message;
Pirate.Session = Session;
Pirate.Transaction = require('./transaction');
Pirate.Drivers = {
  WS: require('./driver/ws')
};
Pirate.Test = {
  Server: require('../test/resource/server'),
  Socket: require('../test/resource/socket')
};
