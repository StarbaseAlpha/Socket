'use strict';

const WebSocket = require('ws');

function Socket(server=null, options={}) {

  if (!options || typeof options !== 'object') {
    options = {};
  }

  let config = {
    "server": server
  };

  if (options.path) {
    config.path = options.path;
  }

  const wss = new WebSocket.Server(config);

  let onError;
  let onMessage;
  let onState;
  let onConnect;
  let onClose;

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

  const stateHandler = (client,state,req) => {
    if (onState && typeof onState === 'function') {
      onState(client,state,req);
    }
  };

  const connectHandler = (client, req) => {
    if (onConnect && typeof onConnect === 'function') {
      onConnect(client, req);
    }
  };

  const closeHandler = (client, req) => {
    if (onClose && typeof onClose === 'function') {
      onClose(client, req);
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
  },1000 * parseInt(options.heartbeat||20));

  let ids = 0;

  wss.on('connection',(client,req) => {
    ids++;
    client.id = ids;
    client.reqTokens = 0;
    client.newTokens = 0;
    client.isAlive = true;
    client.pathURL = req.url;

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

    client.path = client.path || ((req.url.split('?'))[0]) || '/';
    if (stateHandler && typeof stateHandler === 'function') {
      if (client) {
        stateHandler(client,'connected', req);
      }
    }

    if (connectHandler && typeof connectHandler === 'function') {
      if (client) {
        connectHandler(client, req);
      }
    }

    client.on('close',(e) => {
      if (stateHandler && typeof stateHandler === 'function') {
        if (client) {  
          stateHandler(client,'disconnected', req);
        }
      }
      if (closeHandler && typeof closeHandler === 'function') {
        if (client) {
          closeHandler(client, req);
        }
      }

    });

    client.on('error',(e) => {
      if (errorHandler && typeof errorHandler === 'function') {
        errorHandler(client,e.toString());
      }
    });

    client.on('message',(message) => {
      if (client.newTokens <= Date.now()) {
        client.newTokens = Date.now() + (1000 * parseInt(options.seconds||30));
        client.reqTokens = parseInt(options.limit||30);
      }
      client.reqTokens--;
      if (client.reqTokens === -1) {
        client.send({"code":429, "error":"Too many requests."});
        return null;
      }
      if (client.reqTokens < -1) {
        client.close();
        return null;
      }        
      if (messageHandler && typeof messageHandler === 'function') {
        try {
          message = JSON.parse(message);
          messageHandler(client,message);
        } catch(e) {
          client.send(JSON.stringify({"code":400,"message":"Invalid Request Body"}));
        }
      }
    });

    client.on('pong',() => {
      if (client && client.readyState === 1) {
        client.isAlive = true;
      }
    });

  });

  wss.onState = (cb) => {
    onState = cb;
  };

  wss.onClose = (cb) => {
    onClose = cb;
  };

  wss.onConnect = (cb) => {
    onConnect = cb;
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
