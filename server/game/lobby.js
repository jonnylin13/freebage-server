'use strict'

class Lobby {
  constructor(id, logger) {
    this.id = id;
    this.logger = logger;
    this.gameStarted = false;
    this.players = {};
  }

  /**
   * Adds a reference to the Player to the Lobby
   * @param {Player} player 
   * @return {Boolean} True if successful
   */
  addPlayer(player) {
    if (!(player.id in this.players) && !('lobbyId' in player)) {
      this.players[player.id] = player;
      player.lobbyId = this.id;
      this.logger.info('Player ' + player.name + ' added to lobby ' + this.id);
      return true;
    } else return false;
  }

  /**
   * Removes the Player reference from the Lobby
   * @param {String} playerId 
   * @return {Boolean} True if successful
   */
  removePlayer(playerId) {
    if (playerId in this.players) {
      let player = this.players[playerId];
      delete player['lobbyId'];
      delete this.players[playerId]
      this.logger.info('Player ' + player.name + ' removed from lobby ' + this.id);
      return true;
    } else return false;
  }

  start() {

  }

  stop() {

  }

}

exports.Lobby = Lobby;