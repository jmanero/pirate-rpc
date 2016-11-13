'use strict';

/**
 * An exception to indicate that the transaction was canceled
 */
class Canceled extends Error {
  /**
   * Exception name
   * @return {String}
   */
  get name() {
    return 'Canceled';
  }

  /**
   * @constructor
   */
  constructor() {
    super('Transaction was canceled');
  }
}

/**
 * An exception to indicate that the transaction timed out
 */
class Timeout extends Error {
  /**
   * Exception name
   * @return {String}
   */
  get name() {
    return 'Timeout';
  }

  /**
   * @constructor
   */
  constructor() {
    super('Transaction timed out');
  }
}

/**
 * Set up a reply-handler for a synchronous message
 */
class Transaction {
  /**
   * Create and store a new session transaction
   *
   * @param   {Session} session The transaction's parent session
   * @param   {Message} message The request message for this transaction
   * @param   {Function} callback A callback for the transaction
   * @return  {Transaction}
   */
  static create(session, message, callback) {
    const cleanup = () => { session.requests.delete(message.id); };
    const transaction = new Transaction(message, callback, cleanup);

    session.requests.set(message.id, transaction);

    return transaction;
  }

  /**
   * @constructor
   * @param   {Message} message The request message for this transaction
   * @param   {Function} callback A callback for the transaction
   * @param   {Function} cleanup An internal callback to cleanup external state
   */
  constructor(message, callback, cleanup) {
    this.id = message.id;
    this.callback = callback;

    if (message.timeout) { this.setTimeout(message.timeout); }
    this._cleanup = cleanup instanceof Function ? cleanup : () => {};
  }

  /**
   * Cancel the transaction
   */
  cancel() {
    this._cleanup();
    this.clearTimeout();
    this.callback(new Canceled());
  }

  /**
   * Set a timeout on the transaction
   * @param {Number}  timeout  Millisecond timeout interval
   */
  setTimeout(timeout) {
    this._timeout = setTimeout(() => {
      this._cleanup();
      this.callback(new Timeout());
    }, timeout);
  }

  /**
   * Clear the transaction timeout
   */
  clearTimeout() {
    clearTimeout(this._timeout);
    delete this._timeout;
  }

  /**
   * Handle a response to a synchronous message
   * @param {Message} reply The transaction's response message
   */
  complete(reply) {
    this._cleanup();
    this.clearTimeout();
    this.callback(null, reply);
  }
}
module.exports = Transaction;
Transaction.Canceled = Canceled;
Transaction.Timeout = Timeout;
