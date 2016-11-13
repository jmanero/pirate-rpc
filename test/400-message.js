'use strict';
const expect = require('chai').expect;

const EventEmitter = require('events').EventEmitter;
const Pirate = require('../lib/pirate');
const Server = require('./resource/server');
const Socket = require('./resource/socket');

describe('Message', function() {
  it('creates a new message', function() {
    const server = new Server();
    const controller = new Pirate(Pirate.Drivers.WS, server);
    const session = new Pirate.Session(controller);
    const message = new Pirate.Message(session, 'test:message', {foo: 'bar'}, {
      synchronous: true,
      timeout: 42,
      to: 'whoever'
    });

    expect(message).to.be.instanceof(Pirate.Message);
    expect(message.id).to.be.a('string');
    expect(message.created).to.be.instanceof(Date);
    expect(message.session).to.eql(session);
    expect(message.type).to.equal('test:message');
    expect(message.payload).to.deep.equal({foo: 'bar'});
    expect(message.synchronous).to.be.true;
    expect(message.timeout).to.equal(42);
    expect(message.to).to.equal('whoever');
  });

  it('creates a typed Message', function() {
    const server = new Server();
    const controller = new Pirate(Pirate.Drivers.WS, server);
    const session = new Pirate.Session(controller);

    const type = controller.message('test:type');

    const message = Pirate.Message.create(session, 'test:type', {foo: 'baz'});

    expect(message).to.be.instanceof(type);
  });

  it('creates a Message if no type was defined', function() {
    const server = new Server();
    const controller = new Pirate(Pirate.Drivers.WS, server);
    const session = new Pirate.Session(controller);

    const message = Pirate.Message.create(session, 'test:type', {foo: 'baz'});

    expect(message).to.be.instanceof(Pirate.Message);
  });

  it('sets the to field', function() {
    const message = new Pirate.Message(null, 'test:request', {pay: 'load'});
    const reply = new Pirate.Message(null, 'test:reply', {pay: 'load'});

    reply.reply(message);

    expect(reply.to).to.equal(message.id);
  });

  it('renders a JSON object', function() {
    const message = new Pirate.Message(null, 'test:json', {pay: 'load'});
    const object = message.toJSON();

    expect(object.type).to.equal(message.type);
    expect(object.payload).to.deep.equal(message.payload);
    expect(object.metadata.id).to.equal(message.id);
    expect(object.metadata.created).to.equal(message.created);
    expect(object.metadata.synchronous).to.be.false;
    expect(object.metadata.timeout).to.be.false;
    expect(object.metadata.to).to.be.undefined;
  });
});
