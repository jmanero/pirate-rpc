'use strict';
const Session = require('../session');

/**
 * Map WS interface and events to the RPC Controller and Session interfaces
 * @module WS
 */
module.exports = {
  /**
   * Set up server event handling
   *
   * @param {Pirate}    controller  A Pirate controller instance
   * @param {WS.Server} socket      A WebSocket server instance
   */
  server(controller, socket) {
    socket.on('connection', (client) => controller._accept(client));
  },

  /**
   * Set up WS event handling and control
   *
   * @param {Session} session A Pirate Session instance
   * @param {WS}      socket  A WebSocket that should be mapped into the session
   */
  client(session, socket) {
    socket.on('close', () => session._close());
    socket.on('error', (err) => session._close(err));
    socket.on('message', (data) => {
      try {
        // Try to parse JSON into an object
        const frame = JSON.parse(data.toString('utf8'));

        session._receive(frame);
      } catch (e) {
        // Tell the peer that it's sending us garbage
        session.message('pirate:res:client-error', {
          reason: 'Malformed RPC message',
          detail: e.message,
          original: data.toString('utf8')
        }).send();
      }
    });

    session.remote = {
      address: socket._socket.remoteAddress,
      port: socket._socket.remotePort
    };

    session._send = (message) => {
      socket.send(Buffer.from(JSON.stringify(message), 'utf8'));
    };
    session._end = () => { socket.close(); };
  }
};
