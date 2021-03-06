'use strict'

const { Player } = require('./player');
const { Lobby } = require('./lobby');
const { Logger } = require('../logger');
const HRI = require('human-readable-ids').hri;
const { v4: uuidv4 } = require('uuid');

class GameServer {

  constructor(logger) {
    this.lobbies = {};
    this.logger = logger;
  }

  /**
   * Instantiates a new Lobby and adds a reference to GameServer
   * @param {String} controllerId - The controller UUIDv4 id
   * @return {String} Lobby HRI ID
   */
  createLobby(controllerId) {
    let lobby = new Lobby(HRI.random(), new Logger('Lobby', this.logger.priority, ' ---- '), controllerId);
    this.lobbies[lobby.id] = lobby;
    this.logger.info('Lobby created with id: ' + lobby.id);
    return lobby.id;
  }

  /**
   * Removes the GameServer's reference to a Lobby
   * @param {String} lobbyId 
   * @return {Boolean} True if successful
   */
  deleteLobby(lobbyId) {
    if (lobbyId in this.lobbies) {
      delete this.lobbies[lobbyId];
      this.logger.info('Lobby deleted with id: ' + lobbyId);
      return true;
    } else return false;
  }

  /**
   * Instantiates a new Player object
   * @param {String} name 
   * @return {Player} New Player object
   */
  createPlayer(name) {
    let player = new Player(name, uuidv4());
    this.logger.info('Player created with id: ' + player.id);
    return player;
  }

  /**
   * Removes the player from the given Lobby
   * @param {String} lobbyId - Lobby HRI ID
   * @param {String} playerId - The Player's UUIDv4 ID
   * @return {Boolean} True if successful
   */
  deletePlayer(lobbyId, playerId) {
    if (lobbyId in this.lobbies) {
      let lobby = this.lobbies[lobbyId]
      let result = lobby.removePlayer(playerId);
      this.logger.info('Player deleted with id: ' + playerId);
      if (lobby.getPlayerCount() == 0 && !('controllerId' in lobby))
        this.deleteLobby(lobby.id);
      return result;
    } else return false;
  }

  /**
   * Starts the game
   * @param {String} lobbyId - Lobby HRI ID
   * @param {Map<String, WebSocket>} clients - Map of WebSocket clients in Lobby
   */
  startLobby(lobbyId, clients) {
    // TODO
  }

  /**
   * Stops the game
   * @param {String} lobbyId - Lobby HRI ID
   */
  stopLobby(lobbyId) {
    // TODO
  }

  /**
   * Unpauses the game
   * @param {String} lobbyId - Lobby HRI ID
   */
  playLobby(lobbyId) {
    // TODO
  }

  /**
   * Pauses the game
   * @param {String} lobbyId 
   */
  pauseLobby(lobbyId) {
    // TODO
  }

}

exports.GameServer = GameServer;