'use strict';

function Socket(server,stateHandler,messageHandler,errorHandler) {

  let ws = null;
  let tries = 0;
  let closed = false;

  let ERROR = (e) => {
    if (errorHandler && typeof errorHandler === 'function') {
      errorHandler(e);
    }
    console.error(e);
  };

  const stateChange = function(state) {
    if (stateHandler && typeof stateHandler === 'function') {
      stateHandler(state);
    }
  };

  const onopen = function(e) {
    stateChange('connected');
    closed = false;
    tries = 0;
  };

  const connect = function() {
    if (!ws || ws.readyState !== 1) {
      if (server) {
        ws = new WebSocket(server);
        ws.onopen = onopen;
        ws.onmessage = onmessage;
        ws.onclose = onclose;
        ws.onerror = onerror;
      } else {
        ERROR('No Server Provided.');
      }
    } else {
      ERROR('Already Connected.');
    }
  };

  const onclose = function(e) {
    stateChange('disconnected');
    if (!closed) {
      ERROR('disconnected.');
      if (tries < 3) {
        tries++;
        stateChange('reconnecting');
        setTimeout(connect,3000);
      } else {
        stateChange('disconnected');
        ERROR('Failed to reconnect 3 times.');
        closed = true;
      }
    }
  };

  const onmessage = function(msg) {
    if (messageHandler && typeof messageHandler === 'function') {
      try {
        msg = JSON.parse(msg.data);
        messageHandler(msg);
      } catch(e) {}
    }
  };

  const onerror = function(err) {
    if (errorHandler && typeof errorHandler === 'function') {
      errorHandler(err);
    }
  };

  let socket = {};

  socket.getState = function() {
    if (!ws || ws.readyState !== 1) {
      return false;
    } else {
      return true;
    }
  }

  socket.connect = socket.open = connect;

  socket.send = (message)=>{
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify(message),err=>{
        if (err) {
          ERROR(err.toString());
        } else {
          console.log('Message Sent');
        }
      });
    } else {
      ERROR('Not Connected');
    }
  };

  socket.close = function() {
    closed = true;
    if (ws && ws.readyState === 1) {
      ws.close();
    } else {
      ERROR('Not Connected');
    }
  };

  socket.onMessage = (handler)=>{
    if (handler && typeof handler === 'function') {
      messageHandler = handler;
    }
  };

  socket.onState = (handler)=>{
    if (handler && typeof handler === 'function') {
      stateHandler = handler;
    }
  };

  socket.onError = (handler)=>{
    if (handler && typeof handler === 'function') {
      errorHandler = handler;
    }
  };

  socket.setServer = (newserver)=>{
    server = newserver;
  };

  return socket;

}
