'use strict'

const fs = require('fs');

class Logger {

  constructor(from, priority) {
    this.from = from;
    this.priority = priority;
  }

  prefix() {
    let prefix = '[' + new Date().toLocaleTimeString('en-US') + ']';
    prefix += ' <' + this.from + '> ';
    return prefix;
  }

  format(msg) {
    return this.prefix() + msg;
  }

  getFilename() {
    return new Date().toLocaleDateString('en-US').replace('/', '-').replace('/', '-') + '.txt';
  }

  log(msg, priority) {
    if (this.priority >= priority) {
      console.log(this.format(msg));
      fs.appendFile(__dirname + '/logs/' + this.getFilename(), this.format(msg) + '\r\n', (err) => {
        if (err) {
          fs.writeFile(__dirname + '/logs/' + this.getFilename(), this.format(msg) + '\r\n', { flag: 'wx' }, (err) => {
            console.log('ERROR: COULD NOT WRITE TO LOG');
          });
        }
      });
    }
  }

  debug(msg) {
    this.log(msg, 2);
  }

  info(msg) {
    this.log(msg, 1);
  }

  error(msg) {
    this.log(msg, 0);
  }

}

exports.Logger = Logger;