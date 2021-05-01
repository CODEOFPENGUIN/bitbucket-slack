"use strict";
const webpack = require('webpack');
const path = require("path");
const fs = require("fs");

class ConfigBase {
  constructor() {
    this.stats = {
      // Configure the console output
      errorDetails: true, //this does show errors
      colors: true,
      modules: true,
      reasons: true
    };

    this.target = "node";

    const files = fs.readdirSync("./src/_lambda-handlers");

    const entries = {};
    files.forEach(function (filename) {
      // Each file in the _lambda-handlers directory is an "entry" point
      // Except for the .spec.js files
      if (!filename.match(/\.spec\.js/i)) {
        entries[filename.split(".")[0]] = "./src/_lambda-handlers/" + filename;
      }
    });

    this.entry = entries;

    this.output = {
      libraryTarget: "commonjs2",
      path: path.resolve(__dirname, "../dist"),
      filename: "[name].js"
    };

    this.resolve = {
      extensions: [".js", ".ts"]
    };

    this.module = {
      rules: [{
        test: /\.ts$/,
        use: "ts-loader"
      },
        // {
        //   test: /\.json$/,
        //   use: "json-loader"
        // }
      ]
    };

    //https://blog.hodory.dev/2019/04/18/knex-with-webpack/
    //https://github.com/knex/knex/issues/1446
    this.externals = {
      knex: 'commonjs knex'
    }
    
    this.plugins = [
      new webpack.NormalModuleReplacementPlugin(/\.\.migrate/, '../util/noop.js'),
      new webpack.NormalModuleReplacementPlugin(/\.\.seed/, '../util/noop.js'),
      new webpack.IgnorePlugin(/mariasql/, /knex/),
      new webpack.IgnorePlugin(/mysql/, /knex/),
      new webpack.IgnorePlugin(/mysql2/, /knex/),
      new webpack.IgnorePlugin(/mssql/, /knex/),
      new webpack.IgnorePlugin(/oracle/, /knex/),
      new webpack.IgnorePlugin(/oracledb/, /knex/),
      new webpack.IgnorePlugin(/postgres/, /knex/),
      new webpack.IgnorePlugin(/redshift/, /knex/),
      new webpack.IgnorePlugin(/pg-query-stream/, /knex/),
      new webpack.IgnorePlugin(/sqlite3/, /knex/),
      new webpack.IgnorePlugin(/strong-oracle/, /knex/),
      new webpack.IgnorePlugin(/pg-native/, /pg/)
    ];

  }
}

module.exports = ConfigBase;