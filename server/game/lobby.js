'use strict'

const MAX_PLAYERS = 8;
const POINT_VALUES = [
  {
    lie: 500,
    truth: 1000,
    funny: 1125
  },
  {
    lie: 1000,
    truth: 1250,
    funny: 1750
  },
  {
    lie: 1500,
    truth: 1750,
    funny: 2500
  }
];

class Lobby {
  constructor(id, logger) {
    this.id = id;
    this.logger = logger;
    this.gameStarted = false;
    this.players = {};
    this.currentRound = 1;
  }

  /**
   * Adds a reference to the Player to the Lobby
   * @param {Player} player 
   * @return {Boolean} True if successful
   */
  addPlayer(player) {
    if (Object.keys(this.players).length == MAX_PLAYERS) {
      // Force start the game?
      return false;
    }
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

  pause() {
    
  }

}

exports.Lobby = Lobby;