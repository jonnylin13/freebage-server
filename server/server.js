'use strict'

const WebSocket = require('ws');
const { GameServer } = require('./game/gameServer');
const { Logger } = require('./logger');
const _ = require('underscore');
const config = require('../config.json');
const protocol = require('../protocol.json');
const { v4: uuidv4 } = require('uuid');
// const http = require('http');


class Server {

  constructor(environment="lan") {

    this.environment = environment;
    this.wss = null;
    // this.server = http.createServer();
    this.clients = {};
    this.gameServer = new GameServer(new Logger('GameServer', 2, ' -- '));
    this.heartbeats = 0;

  }

  /**
   * Starts the WebSocket.Server
   */
  start() {

    this.logger = new Logger('Server', 2);
    this.wss = new WebSocket.Server({port: 3000, host: config.environment[this.environment].host });
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
          this.deleteClient(client);
          return client.terminate();

        }

        client.isAlive = false;
        client.ping();
      });

      let expected = _.pluck(Object.values(this.clients), { isAlive: true }).length;
      this.logger.debug('Received ' + this.heartbeats + ' heartbeats out of ' + expected + ' expected');
      this.heartbeats = 0;

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
    client.on('close', (code, reason) => { this.deleteClient(client) });
    client.on('error', (err) => { this.deleteClient(client) });

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
      case 'play':
        this.playAck(client, data);
        break;
      case 'pause':
        this.pauseAck(client, data);
        break;
    }

  }

  /**
   * Removes the client from the GameServer and the local reference of clients
   * @param {WebSocket} client 
   */
  deleteClient(client) {

    // Create a task that will delete the player after a certain amount of time
    // So they can reconnect
    if ('playerId' in client) {
      delete this.clients[client.playerId];
      if ('lobbyId' in client)
        this.gameServer.deletePlayer(client.lobbyId, client.playerId);
    }

  }

  /**
   * Called when a pong request is received from the client
   * @param {WebSocket} client - The websocket client
   * @param {string} msg - The string message
   */
  heartbeat(client, msg) {
    client.isAlive = true;
    this.heartbeats++;
  }

  /**
   * Called when the server is closed
   */
  close() {

    clearInterval(this.heartbeatTask);
    for (let client of Object.values(this.clients)) {
      this.deleteClient(client);
      client.terminate();
    }
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
   * Validates the fields for an incoming request
   * @param {Object} data 
   * @param {Function} test
   * @param {Boolean} override
   * @return {Boolean} Whether the data was successfully validated
   */
  validateRequest(data, client, fields=[], override=false) {

    let response = {
      type: data.type + '_ack',
      code: protocol.code.generic.validation_error
    };

    if (!override)
      fields = fields.concat(['playerId', 'lobbyId']);

    for (let field of fields) {
      if (!(field in data)) {
        this.send(client, response);
        this.logger.error('Received ' + data.type + ' request with missing fields from: ' + client._socket.remoteAddress);
        return false;
      }
    }
    return true;

  }

  /**
   * Updates the lobby with player information
   * @param {Lobby} lobby 
   */
  updateLobby(lobby) {

    let ps = _.map(Object.values(lobby.players), p => { return { name: p.name, id: p.id, score: p.score } });
    let req = protocol.out.update_lobby;
    req.players = ps;
    
    for (let pid of Object.keys(lobby.players)) {
      let c = this.clients[pid];
      this.send(c, req);
    }
    this.send(this.clients[lobby.controllerId], req);

  }

  /**
   * Handles handshake requests from the client
   * @param {WebSocket} client - The websocket client
   * @param {Object} data - The data in JSON
   */
  handshakeAck(client, data) {

    let response = protocol.out.handshake;

    let playerName = data.name;
    let lobbyId = data.lobbyId;

    if (!('lobbyId' in data) && !('name' in data)) {
      // Create the lobby
      let controllerId = uuidv4();
      lobbyId = this.gameServer.createLobby(controllerId);

      if (lobbyId in this.gameServer.lobbies) {

        // let lobby = this.gameServer.lobbies[lobbyId];
        // let player = this.gameServer.createPlayer(playerName);

        // client.playerId = player.id;
        // client.lobbyId = lobby.id;
        client.playerId = controllerId;
        client.lobbyId = lobbyId;

        // lobby.addPlayer(player);
        // this.clients[player.id] = client;  
        this.clients[controllerId] = client;

        response.code = protocol.code.handshake.create_lobby;
        response.lobbyId = lobbyId;
        response.controllerId = controllerId;
        // response.playerId = player.id;
        // response.name = playerName;

      } else {
        // Lobby could not be added to this.gameServer.lobbies..
        this.logger.error('Lobby instance could not be created');
        response.code = protocol.code.handshake.lobby_creation_error;
      }
      
    } else if (lobbyId in this.gameServer.lobbies) {

      // Join the lobby
      let newPlayer = this.gameServer.createPlayer(playerName);
      let lobby = this.gameServer.lobbies[lobbyId];

      if (!lobby.addPlayer(newPlayer)) {
        response.code = protocol.code.handshake.add_player_error;
        this.send(client, response);
        return;
      }

      client.playerId = newPlayer.id;
      client.lobbyId = lobby.id;
      this.clients[newPlayer.id] = client;

      response.code = protocol.code.handshake.join_lobby;
      response.lobbyId = lobbyId;
      response.playerId = newPlayer.id;

      this.updateLobby(lobby);

    } else {
      // No lobby found
      this.logger.error('Could not find lobby id ' + lobbyId + ' for join request');
      response.code = protocol.code.handshake.lobby_missing_error;
    }

    this.send(client, response);
  }

  /**
   * Handles start requests from the client
   * @param {WebSocket} client 
   * @param {Object} data 
   */
  startAck(client, data) {

    let response = protocol.out.start;
    if (!this.validateRequest(data, client)) return;

    // TODO - handle

    this.send(client, response);
  }

  /**
   * Handles leave requests from the client
   * @param {WebSocket} client 
   * @param {Object} data 
   */
  leaveAck(client, data) {

    let response = protocol.out.leave;
    if (!this.validateRequest(data, client)) return;
    let lobbyId = data.lobbyId;
    let playerId = data.playerId;

    if (lobbyId in this.gameServer.lobbies) {

      let lobby = this.gameServer.lobbies[lobbyId];

      if (playerId in lobby.players) {

        this.gameServer.deletePlayer(lobbyId, playerId);
        this.deleteClient(client);
        response.code = protocol.code.leave.success;
        this.updateLobby(lobby);

      } else {
        if (lobby.controllerId == playerId) {

          for (let player of Object.values(lobby.players)) {
            if (player.id in this.clients) {
              this.send(this.clients[player.id], protocol.out.kick);
              this.deleteClient(this.clients[player.id]);
            }
          }
          this.deleteClient(client);
          response.code = protocol.code.leave.success;

        } else {
          this.logger.error('Could not find player id ' + playerId + ' in lobby id ' + lobbyId + ' for leave request');
          response.code = protocol.code.leave.player_missing_error;
        }
      }
    } else {
      this.logger.error('Could not find lobby id ' + lobbyId + ' for leave request');
      response.code = protocol.code.leave.lobby_missing_error;
    }

    this.send(client, response);
  }

  playAck(client, data) {

    let response = protocol.out.play;
    if (!this.validateRequest(data, client)) return;

    // TODO

    this.send(client, response);
  }

  pauseAck(client, data) {

    let response = protocol.out.pause;
    if (!this.validateRequest(data, client)) return;

    // TODO

    this.send(client, response);

  }
}

exports.Server = Server;