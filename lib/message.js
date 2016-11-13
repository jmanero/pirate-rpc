'use strict';
const UUID = require('node-libuuid');

/**
 * A structured RPC message
 */
class Message {
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
   * @param {String}  metadata.synchronous This message expects a reply
   * @param {String}  metadata.timeout For synchronous messages, set a reply-timeout
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
   * @param {String}  type  Reply message's type
   * @param {Object}  payload Message payload
   * @return  {Message}
   */
  reply(message) {
    this.to = message.id;

    return this;
  }

  /**
   * Send this message from its bound session
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
