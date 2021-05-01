"use strict";
let ConfigBase = require("./webpack.config.base");

class Config extends ConfigBase {
  constructor() {
    super();
    this.mode = "production";
  }
}

module.exports = new Config();