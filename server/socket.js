'use strict';

const WebSocket = require('ws');

function Socket(server=null, options={}) {

  if (!options || typeof options !== 'object') {
    options = {};
  }

  const wss = new WebSocket.Server({server});

  let onError;
  let onMessage;
  let onState;

  const errorHandler = (client,err) => {
    if (onError && typeof onError === 'function') {
      onError(client,err);
    }
  };

  const messageHandler = (client,message) => {
    if (onMessage && typeof onMessage === 'function') {
      onMessage(client,message);
    }
  };

  const stateHandler = (client,state) => {
    if (onState && typeof onState === 'function') {
      onState(client,state);
    }
  };

  let heartbeat = setInterval(() => {
    wss.clients.forEach(client=>{
      if (!client.isAlive) {
        return null;
      } else {
        client.isAlive = false;
        client.ping();
      }
    });
  },29000);

  wss.on('connection',(client,req) => {
    client.isAlive = true;
    client.url = req.url;
    client.path = client.path || ((req.url.split('?'))[0]) || '/';
      if (messageHandler && typeof messageHandler === 'function') {
        if (client) {
          stateHandler(client,'connected', req);
        }
      }

      client.on('close',(e) => {
        if (stateHandler && typeof stateHandler === 'function') {
          if (client) {  
            stateHandler(client,'disconnected');
          }
        }
      });

      client.on('error',(e) => {
        if (errorHandler && typeof errorHandler === 'function') {
          errorHandler(client,e.toString());
        }
      });

      client.on('message',(message) => {
        if (messageHandler && typeof messageHandler === 'function') {
          try {
            message = JSON.parse(message);
            messageHandler(client,message);
          } catch(e) {
            client.send(JSON.stringify({"code":400,"message":"Invalid Request Body"}));
          }
        }
      });

      client.oldsend = client.send;
      client.send = (msg) => {
        if (client.readyState === 1) {
          client.oldsend(JSON.stringify(msg),err => {
            if (err) {
              errorHandler(client,err);
            }
          });
        }
      };

      client.on('pong',() => {
        if (client && client.readyState === 1) {
          client.isAlive = true;
        }
      });

  });

  wss.onState = (cb) => {
    onState = cb;
  };

  wss.onMessage = (cb) => {
    onMessage = cb;
  };

  wss.onError = (cb) => {
    onError = cb;
  };

  return wss;

}

module.exports = Socket;
