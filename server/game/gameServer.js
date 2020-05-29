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
   * @return {String} Lobby HRI ID
   */
  createLobby() {
    let lobby = new Lobby(HRI.random(), new Logger('Lobby', this.logger.priority));
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
   * @param {String} lobbyId - The Lobby's HRI ID
   * @param {String} playerId - The Player's UUIDv4 ID
   * @return {Boolean} True if successful
   */
  deletePlayer(lobbyId, playerId) {
    if (lobbyId in this.lobbies) {
      let lobby = this.lobbies[lobbyId]
      this.logger.info('Player deleted with id: ' + playerId);
      return lobby.removePlayer(playerId);
    } else return false;
  }

}

exports.GameServer = GameServer;