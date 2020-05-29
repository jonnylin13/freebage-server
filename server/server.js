'use strict'

const WebSocket = require('ws');
const { GameServer } = require('./game/gameServer');
const { Logger } = require('./logger');
// const http = require('http');

class Server {

  constructor() {
    this.wss = null;
    // this.server = http.createServer();
    this.clients = {};
    this.gameServer = new GameServer(new Logger('GameServer', 2));
  }

  /**
   * Starts the WebSocket.Server
   */
  start() {
    this.logger = new Logger('Server', 2);
    this.wss = new WebSocket.Server({port: 3000, host: 'localhost'});
    this.logger.info('Instantiated websocket server');
    
    this.wss.on('connection', client => this.open(client));
    this.wss.on('close', () => this.close());
    this.wss.on('listening', () => {
      this.logger.info('Listening on ' + this.wss.address().address + ':' + this.wss.address().port);
    });
    this.logger.debug('Started listeners');

    // this.server.listen(8080);
    // this.logger.info('Started HTTP server');

    this.heartbeatTask = setInterval(() => {
      this.wss.clients.forEach((client) => {
        if (!client.isAlive) {
          // Add extra logic here to clean the player up
          return client.terminate();
        }
        client.isAlive = false;
        client.ping();
      });
      this.logger.debug('Sent heartbeat');
    }, 30 * 1000);

    this.logger.debug('Started heartbeat');
  }

  /**
   * Called when a connection is opened
   * @param {WebSocket} client - The websocket client
   */
  open(client) {
    this.logger.info('Client connected from ' + client._socket.remoteAddress);
    client.isAlive = true;
    client.on('pong', (msg) => { this.heartbeat(client, msg) });
    client.on('message', (msg) => { this.message(client, msg) });
    client.on('close', (code, reason) => { this.clientDisconnect(client, code, reason) });
  }

  /**
   * Called when the client sends a request
   * @param {WebSocket} client - The websocket client
   * @param {String} msg - The message payload
   */
  message(client, msg) {

    let data = JSON.parse(msg);
    if (!('type' in data)) {
      this.logger.info('Received an invalid request from client at ' + client._socket.remoteAddress);
      return;
    }

    this.logger.info('Request ' + data.type + ' received from client at ' + client._socket.remoteAddress);

    switch(data.type) {
      case 'handshake':
        this.handshakeAck(client, data);
        break;
      case 'start':
        this.startAck(client, data);
        break;
      case 'leave':
        this.leaveAck(client, data);
        break;
    }

  }

  clientDisconnect(client, code, reason) {
    // TODO
  }

  /**
   * Called when a pong request is received from the client
   */
  heartbeat(client, msg) {
    client.isAlive = true;
    this.logger.debug('Received heartbeat');
  }

  /**
   * Called when the server is closed
   */
  close() {
    clearInterval(this.heartbeatTask);
    this.logger.info('Server terminated');
  }

  /**
   * Formats the data into a JSON string before sending to client
   * @param {WebSocket} client - The websocket client
   * @param {Object} data - The data in JSON
   */
  send(client, data) {
    client.send(JSON.stringify(data));
  }

  /**
   * Handles handshake requests from the client
   * @param {WebSocket} client - The websocket client
   * @param {Object} data - The data in JSON
   */
  handshakeAck(client, data) {
    let response = {
      type: 'handshake_ack'
    };

    if (!('name' in data)) {
      response.code = 0;
      this.send(client, response);
      this.logger.error('Received handshake request with missing fields from: ' + client._socket.remoteAddress);
      return;
    }

    let playerName = data.name;
    let lobbyId = data.lobbyId;

    if (!('lobbyId' in data)) {
      this.logger.info('Attempting to create a lobby');
      // Create the lobby
      lobbyId = this.gameServer.createLobby();
      if (lobbyId in this.gameServer.lobbies) {
        let lobby = this.gameServer.lobbies[lobbyId];
        let player = this.gameServer.createPlayer(playerName);
        lobby.addPlayer(player);
        this.clients[player.id] = client;  
        response.code = 1;
        response.lobbyId = lobbyId;
        response.playerId = player.id;
      } else {
        // Lobby could not be added to this.gameServer.lobbies..
        this.logger.error('Weird error where Lobby instance could not be created');
        response.code = -1;
      }
      
    } else if (lobbyId in this.gameServer.lobbies) {

      // Join the lobby
      let player = this.gameServer.createPlayer(playerName);
      let lobby = this.gameServer.lobbies[lobbyId];
      lobby.addPlayer(player);
      this.clients[player.id] = client;
      response.code = 2;
      response.lobbyId = lobbyId;
      response.playerId = player.id;

    } else {
      // No lobby found
      this.logger.error('Could not find lobby to join: ' + lobbyId);
      response.code = -2;
    }
    this.send(client, response);
  }

  startAck(client, data) {
    let response = {
      type: 'start_ack'
    };

    if (!('playerId' in data) || !('lobbyId' in data)) {
      response.code = 0;
      this.send(client, response);
      this.logger.error('Received start request with missing fields from: ' + client._socket.remoteAddress);
      return;
    }

    // TODO - handle

    this.send(client, response);
  }

  leaveAck(client, data) {
    let response = {
      type: 'leave_ack'
    };

    if (!('playerId' in data) || !('lobbyId' in data)) {
      response.code = 0;
      this.send(client, response);
      this.logger.error('Received leave request with missing fields from: ' + client._socket.remoteAddress);
      return;
    }

    let lobbyId = data.lobbyId;
    let playerId = data.playerId;

    if (lobbyId in this.gameServer.lobbies) {
      let lobby = this.gameServer.lobbies[lobbyId];
      if (playerId in lobby.players) {
        this.gameServer.deletePlayer(lobbyId, playerId);
        response.code = 1;
      } else {
        // TODO
        response.code = -1;
      }
    } else {
      // TODO
      response.code = -2;
    }

    this.send(client, response);
  }
}

exports.Server = Server;