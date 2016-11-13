'use strict';
const expect = require('chai').expect;

const EventEmitter = require('events').EventEmitter;
const Pirate = require('../lib/pirate');
const Server = require('./resource/server');
const Socket = require('./resource/socket');

describe('Session', function() {
  it('creates a new session', function() {
    const controller = new Pirate(Pirate.Drivers.WS).listen(new Server());
    const session = new Pirate.Session(controller);

    expect(session).to.be.instanceof(Pirate.Session);
    expect(session.id).to.be.a('string');
    expect(session.controller).to.eql(controller);
    expect(session.handlers).to.eql(controller.handlers);
    expect(session.types).to.eql(controller.types);

    expect(session.subscriptions).to.be.instanceof(Map);
    expect(session.requests).to.be.instanceof(Map);
  });

  it('raises errors if abstract methods aren\'t overridden', function() {
    const controller = new Pirate(Pirate.Drivers.WS).listen(new Server());
    const session = new Pirate.Session(controller);

    expect(() => session._send()).to.throw(Error);
    expect(() => session._end()).to.throw(Error);
  });

  it('creates a Message instance', function() {
    const controller = new Pirate(Pirate.Drivers.WS).listen(new Server());
    const session = new Pirate.Session(controller);

    const message = session.message('test:foo', {data: 'hello'});

    expect(message.session).to.eql(session);
    expect(message.type).to.equal('test:foo');
    expect(message.payload).to.deep.equal({data: 'hello'});
  });

  it('sends a message using the driver', function(done) {
    const controller = new Pirate(Pirate.Drivers.WS).listen(new Server());
    const socket = new Socket();
    const session = controller._accept(socket);

    socket.on('_send', (data) => {
      expect(data).to.be.instanceof(Buffer);
      done();
    });

    session.message('test:message', {hello: 'world'}).send();
  });

  it('sends a synchronous message and receives a reply', function(done) {
    const controller = new Pirate(Pirate.Drivers.WS).listen(new Server());
    const socket = new Socket();
    const session = controller._accept(socket);

    socket.on('_send', (data) => {
      expect(data).to.be.instanceof(Buffer);
      const message = JSON.parse(data.toString('utf8'));

      expect(message.metadata.synchronous).to.be.true;

      socket._message(
        Buffer.from(JSON.stringify({
          type: 'test:reply',
          metadata: {
            to: message.metadata.id
          }
        }), 'utf8')
      );
    });

    const message = session.message('test:request', {hello: 'world'}, {synchronous: true});

    message.send((err, reply) => {
      expect(reply.to).to.equal(message.id);
      done();
    });
  });

  it('receives a message with a type-handler', function(done) {
    const controller = new Pirate(Pirate.Drivers.WS).listen(new Server());
    const socket = new Socket();
    const session = controller._accept(socket);

    controller.handler('test:handler', function(message, _session) {
      expect(_session).to.eql(session);
      expect(message.id).to.equal('test-id');

      done();
    });

    socket._message(
      Buffer.from(JSON.stringify({
        type: 'test:handler',
        metadata: {
          id: 'test-id'
        }
      }))
    );
  });

  it('rejects unhandled messages when rejectUnhandled is set', function(done) {
    const controller = new Pirate(Pirate.Drivers.WS, {rejectUnhandled: true}).listen(new Server());
    const socket = new Socket();
    const session = controller._accept(socket);

    socket.on('_send', function(data) {
      expect(data).to.be.instanceof(Buffer);
      const message = JSON.parse(data.toString('utf8'));

      expect(message.type).to.equal('pirate:res:unhandled');

      done();
    });

    socket._message(
      Buffer.from(JSON.stringify({
        type: 'test:reject',
        metadata: {
          id: 'test-id'
        }
      }))
    );
  });

  it('emits an event for unhandled messages', function(done) {
    const controller = new Pirate(Pirate.Drivers.WS).listen(new Server());
    const socket = new Socket();
    const session = controller._accept(socket);

    session.on('message:test:emit', () => done());

    socket._message(
      Buffer.from(JSON.stringify({
        type: 'test:emit',
        metadata: {
          id: 'test-id'
        }
      }))
    );
  });

  it('creates and stores a subscription object', function() {
    const controller = new Pirate(Pirate.Drivers.WS).listen(new Server());
    const session = new Pirate.Session(controller);

    const emitter = new EventEmitter();
    const handler = () => {};
    const subscription = session.subscribe('test:subscription', emitter, 'test-event', handler);

    expect(() => session.subscribe('test:subscription')).to.throw(ReferenceError);

    expect(subscription.emitter).to.eql(emitter);
    expect(subscription.event).to.equal('test-event');
    expect(subscription.handler).to.eql(handler);
  });

  it('cleans up subscription references when they are destroyed', function() {
    const controller = new Pirate(Pirate.Drivers.WS).listen(new Server());
    const session = new Pirate.Session(controller);

    const emitter = new EventEmitter();
    const handler = () => {};
    const subscription = session.subscribe('test:subscription', emitter, 'test-event', handler);

    expect(session.subscriptions.size).to.equal(1);

    // Does nothing
    session.unsubscribe('foo:bar:baz');

    session.unsubscribe('test:subscription');
    expect(session.subscriptions.size).to.equal(0);
  });

  it('cleans up subscriptions and transactions when closed', function() {
    const controller = new Pirate(Pirate.Drivers.WS).listen(new Server());
    const socket = new Socket();
    const session = controller._accept(socket);

    const emitter = new EventEmitter();
    const handler = () => {};
    session.subscribe('test:subscription', emitter, 'test-event', handler);
    session.subscribe('test:subscription2', emitter, 'test-event2', handler);

    session.message('test:transaction11', {}, {synchronous: true}).send(() => {});
    session.message('test:transaction12', {}, {synchronous: true}).send(() => {});

    expect(session.subscriptions.size).to.equal(2);
    expect(session.requests.size).to.equal(2);

    session._close();

    expect(session.subscriptions.size).to.equal(0);
    expect(session.requests.size).to.equal(0);
  });

  it('emits an error if the session is closed due to an error', function(done) {
    const controller = new Pirate(Pirate.Drivers.WS).listen(new Server());
    const socket = new Socket();
    const session = controller._accept(socket);

    session.on('error', () => done());
    session._close(Error('test'));
  });

  it('closes the underlying driver resource', function(done) {
    const server = new Server();
    const socket = new Socket();
    const controller = new Pirate(Pirate.Drivers.WS, server, {rejectUnhandled: true});
    const session = controller._accept(socket);

    socket.on('close', () => done());
    session.end();
  });

  it('cleans up subscriptions and transactions the transport is closed', function() {
    const controller = new Pirate(Pirate.Drivers.WS).listen(new Server());
    const socket = new Socket();
    const session = controller._accept(socket);

    const emitter = new EventEmitter();
    const handler = () => {};
    session.subscribe('test:subscription', emitter, 'test-event', handler);
    session.subscribe('test:subscription2', emitter, 'test-event2', handler);

    session.message('test:transaction11', {}, {synchronous: true}).send(() => {});
    session.message('test:transaction12', {}, {synchronous: true}).send(() => {});

    expect(controller.sessions.size).to.equal(1);
    expect(session.subscriptions.size).to.equal(2);
    expect(session.requests.size).to.equal(2);

    socket.close();

    expect(controller.sessions.size).to.equal(0);
    expect(session.subscriptions.size).to.equal(0);
    expect(session.requests.size).to.equal(0);
  });

  it('renders a JSON object', function() {
    const controller = new Pirate(Pirate.Drivers.WS).listen(new Server());
    const socket = new Socket();
    const session = controller._accept(socket);

    const object = session.toJSON();

    expect(object.id).to.equal(session.id);
    expect(object.remote).to.deep.equal(session.remote);
    expect(object.subscriptions).to.be.instanceof(Array);
    expect(object.requests).to.be.instanceof(Array);
  });
});
