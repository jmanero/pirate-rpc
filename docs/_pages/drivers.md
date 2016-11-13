---
layout: default
title: Drivers

icon: plug
order: 2
---

# {{ page.title }}

Drivers allow Pirate to interoperate with most stream-oriented transports available in NodeJS. If it can send and receive data, you can probably write a Pirate driver for it.

## Interface

Driver modules **must** export two methods:

**server(controller, resource, options)**

The `server` method is called by the `Pirate` constructor. It receives the new instance of the `Pirate` controller, and two optional arguments. Generally, the `resource` argument should be an instance of some stream server (e.g. [WS.Server] or [Net.Server]) that emits `connection`-like events when a client has connected. The `options` argument, if implemented, should be an Object of additional parameters for the server interface.

The `server` method should listen for these `connection`-like events and call the `_accept(...)` method on the controller with some client resource associated with the new connection.

**client(session, resource, options)**

The `client` method is called by the `Pirate#_accept(...)` or `Pirate.connect(...)` methods. It binds a connection to a new `Pirate.Session` instance. It receives a `Session` instance and, like `server`, two optional parameters for a resource and options.

The `resource` argument should be a connection stream that emits data and can be written to. The `client` method should bind to `data`-type events and call the `_receive(data)` method on the session. `end` and `error`-type events should also be bound to the `_close([err])` method of the session.

In addition to events, the `client` method **must** attach `_send(data)` and `_end()` methods to the `Pirate.Session` instance. These methods should call the corresponding methods on the client resource to send messages to the client and instruct the client resource to close gracefully.

The `client` method may set a `remote` property on the session instance. This is informational only. It _should_ be an Object with keys `address` and `port`.

The [WS Driver] has functional examples of the required client methods and events.

## Sessions and Framing

The `WS` Web Socket driver is a good example of how little is necessary to adapt Pirate to existing session-oriented transports with build-in message framing. Pirate, with additional driver-complexity, can be adapted to transports without framing, or even without sessions.

### Example: TCP

Transport Control Protocol (TCP) is inherently session-oriented. Clients must initiate connections to servers, which must accept the connection and synchronize state. TCP does not, however, implement any message framing. Operating systems attempt to send the largest packets possible within delivery timeout windows. This means that several small messages may be buffered and delivered as a single packet.

A TCP driver needs to implement its own framing. This could be accomplished by prepending outgoing messages with a fixed-width length header, then reading the headers of incoming messages and slicing the message bodies out of the data stream. This method requires that some additional state be initiated inside of the `client` method to buffer incoming data from the underlying socket and read over it message-by-message as more packets are received and appended to the buffer. An (untested) example of this follows:

_TODO: Write a reference TCP driver_

```javascript
function server(controller, resource) {
  // `resource` is an instance of Net.Server
  resource.on('connection', function(socket) {
    controller._accept(socket)
  });
}

// the `_accept` call, above, calls this after creating a new Session instance
function client(session, socket) {
  const reader = new Reader(socket);

  socket.on('end', () => session._close());
  socket.on('error', (err) => session._close(err));
  reader.on('frame', (data) => session._receive(data));

  // Prepend a length header outgoing messages
  session._send = (data) => {
    const header = Buffer.alloc(4);

    header.writeUInt32BE(data.length, 0);
    socket.write(Buffer.concat([header, data]));
  };
  session._end = () => { socket.end(); };
}

/**
 * Buffer data chunks received from a socket and slice out frames
 */
class Reader extends EventEmitter {
  constructor(socket) {
    super();

    this.socket = socket;
    this.buffer = Buffer.alloc(0);

    socket.on('data', (data) => {
      this.buffer = Buffer.concat([this.buffer, data]);
      this.read();
    });
  }

  /**
   * Try to read frames out of the receive buffer.
   *
   * The leading bytes of the buffer should always be a length header, because
   * the `read` method will leave a Buffer containing the trailing partial frame
   * (and it's header) behind in anticipation of additional chunks from the socket
   * being appended later.
   */
  read() {
    // Not enough to read a length header
    if (this.buffer.length < 4) return;
    const length = this.buffer.readUInt32BE(0);

    // The next frame hasn't been fully received yet
    if (this.buffer.length - 4 < length) return;

    // Pop the leading frame off of the receive buffer
    const data = this.buffer.slice(4, length + 4);
    this.buffer = this.buffer.slice(length + 4);

    try {
      const frame = JSON.parse(data);

      // Emit the frame to something else
      this.emit('frame', frame);
    } catch (e) {
      // Log malformed frame
    }

    // Try to keep reading frames
    this.read();
  }
}
```

### Example: UDP

User Datagram Protocol (UDP) is a connectionless transport protocol. Clients and servers do not synchronize any state to form a session. In fact, the distinction between a client and a server is fairly arbitrary: both entities need to `bind` a socket to a port to receive data from their peer.

Server-centric protocols built upon UDP tend to emulate TCP by specifying a known port that the server binds to. Clients bind a socket to a random high-number port to receive datagrams from the server, and use that port number as the source-port for datagrams sent to the server. The server is able use the source port of incoming datagrams to send response datagrams back to clients at the correct destination port.

UDP does not provide any streaming segmentation, unlike TCP, which will split a message into multiple packets and guarantee that they are delivered to the peer in the correct order. One `write` operation results in one sent UDP datagram and IP packet. This constrains the message length to UDP's maximum transmission unit (MTU) of 65,507 bytes, unless the driver implements its own segmentation and reassembly. In reality, the scope of scenarios that this would be better suited that simple using TCP or a higher level protocol are extremely limited.

UDP's MTU of 65,507 bytes is the result of the IPv4 MTU (2^16) less the IPv4 header (20 bytes) and UDP header (4 bytes). In practice, the Layer 2 protocol (e.g. Ethernet) typically imposes a much smaller MTU (1500 bytes for Fast Ethernet), of which 28 bytes are utilized by IPv4 and UDP headers, resulting in an MTU of 1472 bytes unless IP fragmentation is acceptable.

**TL;DR** All of this aside, the general usefulness of a UDP transport for `Pirate` is probably not significant; however, it _could_ be implemented within the Driver framework if necessary.

The driver's `server` method needs to track states, much like a firewall:

```javascript
server(controller, socket, options) {
  const server = new Server(socket, options);

  server.on('connection', (client) => controller._accept(client, options));
}

// Maximum UDP payload in a 1500 byte Ethernet frame
// (1500 - 20 (IPv4 header) - 8 (UDP header))
const MTU = 1472;

client(session, socket, options) {
  socket.on('end', () => session._close());
  socket.on('error', (err) => session._close(err));
  socket.on('frame', (data) => session._receive(data));

  // Prepend a length header outgoing messages
  session._send = (data) => {
    if (data.length > MTU) { // raise an exception }

    socket.write(data);
  };
  session._end = () => { socket.end(); };
}

class Server extends EventEmitter {
  constructor(socket) {
    super();

    this.socket = socket;
    this.connections = new Map();

    socket.on('message', (data, remote) => {
      this.accept(remote.address, remote.port)._receive(data);
    });
  }

  accept(address, port) {
    const identifier = `${address}:${port}`;

    if (this.connections.has(identifier)) {
      return this.connections.get(identifier);
    }

    // Create a new client state
    const client = new Client(this.socket, address, port);

    // Clean up state when the session ends
    client.on('end', () => this.connections.delete(identifier));
    client.on('error', () => this.connections.delete(identifier));

    this.connections.set(identifier, client);
    this.emit('connection', client);

    return client;
  }
}

class Client extends EventEmitter {
  constructor(socket, address, port) {
    this.socket = socket;
    this.address = address;
    this.port = port;
  }

  write(data, callback) {
    this.socket.send(data, 0, data.length, this.port, this.address, callback);
  }

  _receive(data) {
    try {
      const frame = JSON.parse(data.toString('utf8'));
      this.emit('frame', frame);
    } catch (e) {
      // Log malformed frame
    }
  }

  close() {
    this.emit('end');
  }
}

Connection.states = new Map();
```

[WS.Server]: https://github.com/websockets/ws/blob/master/doc/ws.md#class-websocketserver
[Net.Server]: http://nodejs.org/dist/latest-v4.x/docs/api/net.html#net_class_net_server
[WS Driver]: https://github.com/{{ project.owner }}/{{ project.repo }}/blob/master/lib/driver/ws.js
