'use strict';

const WebSocket = require('ws');

function Socket(server) {

  const wss = new WebSocket.Server({server});

  let onError;
  let onMessage;
  let onState;

  let errorHandler = (client,err) => {
    if (onError && typeof onError === 'function') {
      onError(client,err);
    }
  };

  let messageHandler = (client,message) => {
    if (onMessage && typeof onMessage === 'function') {
      onMessage(client,message);
    }
  };

  let stateHandler = (client,state) => {
    if (onState && typeof onState === 'function') {
      onState(client,state);
    }
  };

  setInterval(()=>{
    wss.clients.forEach(client=>{
      if (!client.isAlive) {
        return null;
      } else {
        client.isAlive = false;
        client.ping();
      }
    });
  },29000);

  wss.broadcast = (msg) => {
    let message = JSON.stringify(msg);
    wss.clients.forEach(sock=>{
      sock.send(message);
    });
  };

  wss.on('connection',(client,req)=>{
    client.isAlive = true;
    client.url = req.url;
    client.path = ((req.url.split('?'))[0]) || '/';
      if (messageHandler && typeof messageHandler === 'function') {
        if (client) {
          stateHandler(client,'connected');
        }
      }

      client.on('close',(e)=>{
        if (stateHandler && typeof stateHandler === 'function') {
          if (client) {  
            stateHandler(client,'disconnected');
          }
        }
      });

      client.on('error',(e)=>{
        if (errorHandler && typeof errorHandler === 'function') {
          errorHandler(client,e.toString());
        }
      });

      client.on('message',(message)=>{
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
          client.oldsend(JSON.stringify(msg),err=>{
            if (err) {
              errorHandler(client,err);
            }
          });
        }
      };

      client.on('pong',()=>{
        if (client) {
          client.isAlive = true;
        }
      });


  });

  wss.onState = function(callback) {
    if (callback && typeof callback === 'function') {
      onState = callback;
    }
  };

  wss.onMessage = function(callback) {
    if (callback && typeof callback === 'function') {
      onMessage = callback;
    }
  };

  wss.onError = function(callback) {
    if (callback && typeof callback === 'function') {
      onError = callback;
    }
  };

  return wss;

}

module.exports = Socket;
