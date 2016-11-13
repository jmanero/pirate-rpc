---
layout: default
title: Testing

icon: check
order: 10
---

# {{ page.title }}

Pirate exports Server and Socket stub interfaces that work with its included WebSocket driver. You can include them in your own test-cases to build and test your Pirate interface without external network dependencies.

```javascript
const Pirate = require('pirate-rpc');

const server = new Pirate.Test.Server();
const controller = new Pirate(Pirate.Driver.WS).listen(server);

controller.handle('test:message', function(message, session) {
  console.log(message.id);
})

// Simulate an incoming connection
const socket = server._connection();

socket._send(Buffer.from(
  JSON.stringify({
    type: 'test:message',
    metadata: {
      id: 'test-message-id'
    }
  })
));
```
