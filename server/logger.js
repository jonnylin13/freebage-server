'use strict'

const fs = require('fs');
const colors = require('colors');

class Logger {

  constructor(from, priority, pre='') {
    this.from = from;
    this.priority = priority;
    this.pre = pre;
  }

  timestamp() {
    let timestamp = '[' + new Date().toLocaleTimeString('en-US') + '] ';
    return timestamp;
  }

  format(msg) {
    return this.timestamp() + this.pre + '<' + this.from + '> ' + msg;
  }

  getFilename() {
    return new Date().toLocaleDateString('en-US').replace('/', '-').replace('/', '-') + '.txt';
  }

  log(msg, priority) {
    if (this.priority >= priority) {
      let fileMsg = msg.slice(0);
      switch(priority) {
        case 0:
          msg = colors.brightRed(msg);
          break;
        case 1:
          msg = colors.brightCyan(msg);
        case 2:
          msg = colors.brightYellow(msg);
      }
      console.log(this.format(msg));
      fs.appendFile(__dirname + '/logs/' + this.getFilename(), this.format(fileMsg) + '\r\n', (err) => {
        if (err) {
          fs.writeFile(__dirname + '/logs/' + this.getFilename(), this.format(fileMsg) + '\r\n', { flag: 'wx' }, (err) => {
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