'use strict';

// const storj = require('storj-lib');
const expect = require('chai').expect;
const mongoose = require('mongoose');

require('mongoose-types').loadTypes(mongoose);

const UserNonceSchema = require('../lib/models/usernonce');

var UserNonce;
var connection;

before(function(done) {
  connection = mongoose.createConnection(
    'mongodb://127.0.0.1:27017/__storj-bridge-test',
    function() {
      UserNonce = UserNonceSchema(connection);
      done();
    }
  );
});

after(function(done) {
  UserNonce.remove({}, function() {
    connection.close(done);
  });
});

describe('Storage/models/UserNonce', function() {
  describe('#create', function() {

  })
});
