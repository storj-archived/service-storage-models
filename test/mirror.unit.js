'use strict';

// const storj = require('storj-lib');
const expect = require('chai').expect;
const mongoose = require('mongoose');

require('mongoose-types').loadTypes(mongoose);

const MirrorSchema = require('../lib/models/mirror');

var Mirror;
var connection;

before(function(done) {
  connection = mongoose.createConnection(
    'mongodb://127.0.0.1:27017/__storj-bridge-test',
    function() {
      Mirror = MirrorSchema(connection);
      done();
    }
  );
});

after(function(done) {
  Mirror.remove({}, function() {
    connection.close(done);
  });
});

describe('Storage/models/Mirror', function() {
  describe('#create', function() {

  })
});
