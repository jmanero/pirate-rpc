'use strict';
const expect = require('chai').expect;

const Pirate = require('../lib/pirate');
const Server = require('./resource/server');
const Socket = require('./resource/socket');

describe('Controller', function() {
  it('creates a controller and binds to a Server with the provided driver', function() {
    const server = new Server();
    const controller = new Pirate(Pirate.Drivers.WS).listen(server);

    expect(controller.rejectUnhandled).to.be.false;
    expect(controller.driver).to.eql(Pirate.Drivers.WS);
    expect(controller.sessions).to.be.instanceof(Map);
    expect(controller.handlers).to.be.instanceof(Map);
    expect(controller.types).to.be.instanceof(Map);

    expect(server.listeners('connection').length).to.equal(1);
  });

  it('initializes a new client session', function(done) {
    const socket = new Socket();
    const session = new Pirate(Pirate.Drivers.WS).connect(socket);

    expect(session).to.be.instanceof(Pirate.Session);

    session.on('message:*', () => done());
    socket._message(
      Buffer.from(JSON.stringify({
        type: 'test:message'
      }), 'utf8')
    );
  });

  it('initializes a new session when the server emits a connection event', function() {
    const server = new Server();
    const controller = new Pirate(Pirate.Drivers.WS).listen(server);

    expect(controller.sessions.size).to.equal(0);
    server._connection();
    expect(controller.sessions.size).to.equal(1);
  });

  it('creates and stores new Message child classes', function() {
    const server = new Server();
    const controller = new Pirate(Pirate.Drivers.WS).listen(server);

    const type = controller.message('test:message', {
      synchronous: true,
      timeout: 1234
    }, {
      something: () => {}
    });

    expect(controller.types.get('test:message')).to.eql(type);
    expect(type.prototype).to.be.instanceof(Pirate.Message);

    expect(type.type).to.equal('test:message');
    expect(type.synchronous).to.be.true;
    expect(type.timeout).to.equal(1234);

    expect(type.prototype.something).to.be.instanceof(Function);
  });

  it('sets a handler for a message type', function() {
    const controller = new Pirate(Pirate.Drivers.WS).listen(new Server());
    const handler = () => {};

    expect(() => controller.handler('test', false)).to.throw(TypeError);
    controller.handler('test:message', handler);
    expect(controller.handlers.get('test:message')).to.eql(handler);
  });

  it('includes default message-type handlers', function() {
    const controller = new Pirate(Pirate.Drivers.WS).listen(new Server());

    expect(controller.handlers.get('pirate:res:client-error')).to.be.instanceof(Function);
    expect(controller.handlers.get('pirate:res:client-error')).to.be.instanceof(Function);
  });
});
