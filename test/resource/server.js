'use strict';
const EventEmitter = require('events').EventEmitter;
const TestSocket = require('./socket');

/**
 * Socket Server test-bench
 */
class TestServer extends EventEmitter {
  _connection() {
    const socket = new TestSocket();

    this.emit('connection', socket);
    return socket;
  }
}
module.exports = TestServer;
