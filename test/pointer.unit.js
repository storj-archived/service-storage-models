'use strict';

// const storj = require('storj-lib');
const expect = require('chai').expect;
const mongoose = require('mongoose');

require('mongoose-types').loadTypes(mongoose);

const PointerSchema = require('../lib/models/pointer');

var Pointer;
var connection;

before(function(done) {
  connection = mongoose.createConnection(
    'mongodb://127.0.0.1:27017/__storj-bridge-test',
    function() {
      Pointer = PointerSchema(connection);
      done();
    }
  );
});

after(function(done) {
  Pointer.remove({}, function() {
    connection.close(done);
  });
});

describe('Storage/models/Pointer', function() {
  describe('#create', function() {

  })
});
