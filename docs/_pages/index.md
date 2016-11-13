---
layout: default
title: Home

permalink: /
icon: home
order: 1
---

# {{ site.name }}

Pirate RPC is a framework for implementing session-oriented remote procedure APIs. It is very well suited for building service-to-service WebSocket interfaces, but really doesn't care that much. Pirate uses a [Driver interface](pages/drivers.html) to abstract protocol-specific interfaces out of its internals.

![They be more like guidelines]({{ site.baseurl }}/images/guidelines.gif)

Pirate provides a flexible interface for

* Defining extensible message types
* Request/response message synchronization
* Pub/sub subscription management and cleanup
* Testing

## Getting Started

```bash
$ npm install --save pirate-rpc
```

### Create a new controller

```javascript
const Pirate = require('pirate-rpc');
const WS = require('ws');
// ...

const ws = new WS.Server({port: 8080})
const rpc = new Pirate(Pirate.Driver.WS).listen(ws);

rpc.handle('app:foo', function(message, session) {
  session.message('app:bar').reply(message).send();
});
```

### Connect to a server

```javascript
const Pirate = require('pirate-rpc');
const WS = require('ws');

const ws = new WS('http://server:8080');
const rpc = new Pirate(Pirate.Driver.WS);

const session = rpc.connect(ws);

session.send('app:foo', {}, {synchronous: true}, function(err, reply) {
  // ...
});

```

:tada:

[GitHub Releases]: https://github.com/rapid7/turnstile/releases
[node-libuuid]: https://www.npmjs.com/package/node-libuuid
