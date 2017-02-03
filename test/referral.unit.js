'use strict';

const crypto = require('crypto');
const errors = require('storj-service-error-types');
const expect = require('chai').expect;
const mongoose = require('mongoose');
const ms = require('ms');

require('mongoose-types').loadTypes(mongoose);

const ReferralSchema = require('../lib/models/referral');

var Referral;
var connection;

before(function(done) {
  connection = mongoose.createConnection(
    'mongodb://127.0.0.1:27017/__storj-bridge-test',
    function() {
      Referral = ReferralSchema(connection);
      done();
    }
  );
});

after(function(done) {
  Referral.remove({}, function() {
    connection.close(done);
  });
});

function sha256(i) {
  return crypto.createHash('sha256').update(i).digest('hex');
}

describe('Storage/models/referral', function() {

  describe('#create', function() {

  });

  describe('#issueCredit', function() {

  });

  describe('#_createCredit', function() {

  });

  describe('#_setCredit', function() {

  });

  describe('#convert_signup', function() {

  });

  describe('#convert_billed', function() {

  });

});
