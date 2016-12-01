'use strict';

// const storj = require('storj-lib');
const expect = require('chai').expect;
const mongoose = require('mongoose');

require('mongoose-types').loadTypes(mongoose);

const ShardSchema = require('../lib/models/shard');

var Shard;
var connection;

before(function(done) {
  connection = mongoose.createConnection(
    'mongodb://127.0.0.1:27017/__storj-bridge-test',
    function() {
      Shard = ShardSchema(connection);
      done();
    }
  );
});

after(function(done) {
  Shard.remove({}, function() {
    connection.close(done);
  });
});

describe('Storage/models/Shard', function() {
  describe('#create', function() {

  })
});
