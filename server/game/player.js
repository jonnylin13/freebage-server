'use strict'

class Player {
  constructor(name, id) {

    this.name = name;
    this.id = id;
    this.score = 0;
    
  }

  /**
   * Checks if the Player is in a Lobby
   * @return {Boolean} True if the player is in a lobby 
   */
  hasLobby() {
    return 'lobbyId' in this;
  }
}

exports.Player = Player;