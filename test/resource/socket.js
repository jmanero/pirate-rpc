'use strict';
const EventEmitter = require('events').EventEmitter;

/**
 * Socket test-bench
 */
class TestSocket extends EventEmitter {
  static connect() {
    const socket = new TestSocket();

    socket.emit('open');
    return socket;
  }

  get _socket() {
    return ({
      remoteAddress: 'localhost',
      remotePort: 1234
    });
  }

  _error(err) {
    this.emit('error', err);
  }


  _message(data) {
    this.emit('message', data);
  }

  close() {
    this.emit('close');
  }

  send(data) {
    this.emit('_send', data);
  }
}
module.exports = TestSocket;
