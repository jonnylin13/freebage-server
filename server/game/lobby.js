'use strict'

const rules = require('../../rules.json');
const protocol = require('../../protocol.json');

class Lobby {

  constructor(id, logger, controllerId) {

    this.id = id;
    this.logger = logger;
    this.players = {};
    this.controllerId = controllerId;
    this.round = 0;
    this.phase = 0;

  }

  /**
   * Returns the Player count of the lobby
   * @return {Number} Player count
   */
  getPlayerCount() {
    return Object.keys(this.players).length;
  }

  /**
   * Adds a reference to the Player to the Lobby
   * @param {Player} player - Player object
   * @return {Boolean} Returns true if successful
   */
  addPlayer(player) {

    if (this.getPlayerCount() == rules.max_players) 
      return false;
    
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
   * @return {Boolean} Returns true if successful
   */
  removePlayer(playerId) {

    if (playerId in this.players) {

      let player = this.players[playerId];
      delete player['lobbyId'];
      delete this.players[playerId]
      this.logger.info('Player ' + player.name + ' removed from lobby ' + this.id);
      return true;

    }

    if (playerId == this.controllerId) {
      delete this.controllerId;
      return true;
    } else return false;

  }

  /**
   * Emits a request to all Players
   * @return {Boolean} Returns true if successful
   */
  emit(data) {

    if (this.clients) {
      for (let client of this.clients) 
        client.sendJSON(data);
      return true;
    } else return false;

  }

  /**
   * Resets the game state
   * @return {Boolean} Returns true if successful
   */
  reset() {
    this.round = 0;
    this.phase = 0;
  }

  /**
   * Starts the round
   * @return {Boolean} Returns true if successful
   */
  startRound() {

    let request = protocol.out.start_round;
    request.round = this.round;
    if (!this.emit(request)) return false;
    return this.startPhase();

  }

  /**
   * Ends the round
   * @return {Boolean} Returns true if successful
   */
  endRound() {

    this.round++;
    if (this.round > rules.rounds.length - 1)
      return this.end();
    let request = protocol.out.end_round;
    return this.emit(request);

  }

  /**
   * Starts the phase
   * @return {Boolean} Returns true if successful
   */
  startPhase() {
    let currentPhase = rules.phases[this.phase];
    let request = protocol.out.start_phase;
    request.phase = currentPhase;

    if (currentPhase.name == 'question') {
      request.question = 'placeholder';
    }

    setTimeout(() => {
      this.endPhase();
    }, currentPhase.time * 1000);

    return this.emit(request);
  }

  /**
   * Ends the phase
   * @return {Boolean} Returns true if successful
   */
  endPhase() {

    this.phase++;
    if (this.phase > rules.phases.length - 1) 
      return this.endRound();
    
    let request = protocol.out.end_phase;
    return this.emit(request);
    
  }

  /**
   * Starts the game
   * @return {Boolean} Returns true if successful
   */
  start(clients) {

    if (this.getPlayerCount() < rules.min_players) 
      return false;

    this.reset();
    this.clients = clients;
    return this.startRound();

  }

  /**
   * Ends the game
   * @return {Boolean} Returns true if successful
   */
  end() {
    delete this.clients;
    // Emit an end game to display score
    // Check if game ended early
  }

  /**
   * Pauses the game
   * @return {Boolean} Returns true if successful
   */
  pause() {
    // TODO
  }

  /**
   * Plays the game
   * @return {Boolean} Returns true if successful
   */
  play() {
    // TODO
  }

}

exports.Lobby = Lobby;