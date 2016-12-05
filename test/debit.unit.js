/*
type should fail if not enum
fail if storage and bandwidth are not integers
amount fails if not Currency
user should be an email regex
should be instanceOf(reference of User model)
*/

'use strict';

// const storj = require('storj-lib');
const expect = require('chai').expect;
const mongoose = require('mongoose');

require('mongoose-types').loadTypes(mongoose);

const DebitSchema = require('../lib/models/debit');

var Debit;
var connection;

before(function(done) {
  connection = mongoose.createConnection(
    'mongodb://127.0.0.1:27017/__storj-bridge-test',
    function() {
      Debit = DebitSchema(connection);
      done();
    }
  );
});

after(function(done) {
  Debit.remove({}, function() {
    connection.close(done);
  });
});

describe('Storage/models/Debit', function() {
  describe('#create', function() {

  })
});
