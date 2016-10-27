'use strict';

const assert = require('assert');
const mongoose = require('mongoose');
const merge = require('merge');

require('mongoose-currency').loadType(mongoose);
require('mongoose-types').loadTypes(mongoose);

/**
 * MongoDB storage interface
 * @constructor
 * @param {Object} mongoConf
 * @param {Object} options
 */
function Storage(mongoConf, options) {
  if (!(this instanceof Storage)) {
    return new Storage(mongoConf, options);
  }

  assert(typeof options === 'object', 'Invalid storage options supplied');

  var self = this;

  this._options = mongoConf;
  this._log = options ? (options.logger || console) : console;
  this.connection = this._connect();
  this.models = this._createBoundModels();

  this.connection.on('error', function(err) {
    self._log.error('failed to connect to database:', err.message);
  });

  this.connection.on('disconnected', function() {
    self._log.warn('database connection closed, reconnecting...');
    self.connection = self._connect();
  });

  this.connection.on('connected', function() {
    self._log.info('connected to database');
  });
}

Storage.models = require('./lib/models');

/**
 * Connects to the database
 * @returns {mongoose.Connection}
 */
Storage.prototype._connect = function() {
  var self = this;
  var uri;

  var defaultOpts = {
    mongos: false,
    ssl: false
  };

  var opts = merge(defaultOpts, this._options);

  if (Array.isArray(this._options)) {
    uri = this._options.map(function(conf) {
      return self._getConnectionURI(conf);
    }).join(',');
  } else {
    uri = this._getConnectionURI(this._options);
  }

  this._log.info('opening database connection to %s', uri);

  return mongoose.createConnection(uri, opts);
};

/**
 * Build the connection URI from options
 * @param {Object} _options
 * @returns {String}
 */
Storage.prototype._getConnectionURI = function(_options) {
  var proto = 'mongodb://';
  var address = _options.host + ':' + _options.port;
  var dbname = '/' + _options.name;

  return [proto, address, dbname].join('');
};


/**
 * Return a dictionary of models bound to this connection
 * @returns {Object}
 */
Storage.prototype._createBoundModels = function() {
  var bound = {};

  for (let model in Storage.models) {
    bound[model] = Storage.models[model](this.connection);
  }

  return bound;
};

module.exports = Storage;
