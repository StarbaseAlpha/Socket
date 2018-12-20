'use strict';

function Socket(server) {

  let ws = null;
  let tries = 0;
  let closed = false;

  let stateHandler;
  let messageHandler;
  let errorHandler;

  const ERROR = (e) => {
    if (errorHandler && typeof errorHandler === 'function') {
      errorHandler(e);
    }
    console.error(e);
  };

  const stateChange = (state) => {
    if (stateHandler && typeof stateHandler === 'function') {
      stateHandler(state);
    }
  };

  const onopen = (e) => {
    stateChange('connected');
    closed = false;
  };

  const connect = () => {
    if (!ws || ws.readyState !== 1) {
      if (server) {
        ws = new WebSocket(server);
        ws.onopen = onopen;
        ws.onmessage = onmessage;
        ws.onclose = onclose;
        ws.onerror = onerror;
      } else {
        ERROR('No server provided.');
      }
    } else {
      ERROR('Already connected.');
    }
  };

  const onclose = (e) => {
    stateChange('disconnected');
    if (!closed) {
      ERROR('disconnected.');
    }
  };

  const onmessage = (msg) => {
    if (messageHandler && typeof messageHandler === 'function') {
      try {
        msg = JSON.parse(msg.data);
        messageHandler(msg);
      } catch(e) {}
    }
  };

  const onerror = (err) => {
    if (errorHandler && typeof errorHandler === 'function') {
      errorHandler(err);
    }
  };

  let socket = {};

  socket.getState = () => {
    if (!ws || ws.readyState !== 1) {
      return false;
    } else {
      return true;
    }
  };

  socket.connect = socket.open = connect;

  socket.send = (message) => {
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

  socket.close = () => {
    closed = true;
    if (ws && ws.readyState === 1) {
      ws.close();
    } else {
      ERROR('Not Connected');
    }
  };

  socket.onMessage = (handler)=>{
    messageHandler = handler;
  };

  socket.onState = (cb)=>{
    stateHandler = cb;
  };

  socket.onError = (cb)=>{
    errorHandler = cb;
  };

  socket.setServer = (socketURL)=>{
    server = socketURL;
  };

  return socket;

}
