'use strict';
const UUID = require('node-libuuid');

/**
 * @module message
 */

/**
 * A structured RPC message
 */
class Message {
  /**
   * Try to create a typed-message if a matching type/class mapping has been
   * defined for the parent session/controller
   *
   * @param {Session} session Message's parent session
   * @param {String}  type  Message type
   * @param {Object}  payload Message payload
   *
   * @param {Object}  metadata
   * @param {Boolean} metadata.synchronous This message expects a reply
   * @param {String}  metadata.to The identifier of the message that this message is responding to
   * @param {Number}  metadata.timeout For synchronous messages, set a reply-timeout
   * @param {String|Date}  metadata.created The message's creation timestamp
   * @param {String}  metadata.id The message's identifier
   *
   * @return {Message}
   */
  static create(session, type, payload, metadata) {
    // Try to use a type-specific constructor
    if (session.types.has(type)) {
      return new (session.types.get(type))(session, payload, metadata);
    }

    return new Message(session, type, payload, metadata);
  }

  /**
   * @constructor
   *
   * @param {Session} session Message's parent session
   * @param {String}  type  Message type
   * @param {Object}  payload Message payload
   *
   * @param {Object}  metadata
   * @param {Boolean} metadata.synchronous This message expects a reply
   * @param {String}  metadata.to The identifier of the message that this message is responding to
   * @param {Number}  metadata.timeout For synchronous messages, set a reply-timeout
   * @param {String|Date}  metadata.created The message's creation timestamp
   * @param {String}  metadata.id The message's identifier
   */
  constructor(session, type, payload, metadata) {
    metadata = Object.assign({
      created: Date.now()
    }, metadata);

    this.id = metadata.id || UUID.v4().toLowerCase();
    this.created = new Date(metadata.created);

    this.session = session;
    this.type = type;
    this.payload = Object.assign({}, payload);

    this.synchronous = Boolean(metadata.synchronous);
    this.timeout = Number(metadata.timeout) || false;
    this.to = metadata.to;
  }

  /**
   * Set the messages `to` field to another message's ID field
   *
   * @param {Message} message Set the to field of this message to the argument's ID
   * @return  {Message} Returns itself
   */
  reply(message) {
    this.to = message.id;

    return this;
  }

  /**
   * Send this message from its bound session
   *
   * @param {Function}  callback  An optional callback for a reply to a
   *                              synchronous message
   */
  send(callback) {
    this.session.send(this, callback);
  }

  /**
   * Generate an object that can be marshaled to JSON
   *
   * @return {Object}
   */
  toJSON() {
    return ({
      type: this.type,
      payload: this.payload,

      metadata: {
        id: this.id,
        created: this.created,
        synchronous: this.synchronous,
        timeout: this.timeout,
        to: this.to
      }
    });
  }
}
module.exports = Message;
