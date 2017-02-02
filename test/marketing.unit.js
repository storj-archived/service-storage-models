'use strict';

const crypto = require('crypto');
const errors = require('storj-service-error-types');
const expect = require('chai').expect;
const mongoose = require('mongoose');
const ms = require('ms');

require('mongoose-types').loadTypes(mongoose);

const MarketingSchema = require('../lib/models/marketing');
const ReferralSchema = require('../lib/models/referral');

var Marketing;
var Referral;
var connection;

before(function(done) {
  connection = mongoose.createConnection(
    'mongodb://127.0.0.1:27017/__storj-bridge-test',
    function() {
      Marketing = MarketingSchema(connection);
      Referral = ReferralSchema(connection);
      done();
    }
  );
});

after(function(done) {
  Marketing.remove({}, function() {
    Referral.remove({}, function() {
      connection.close(done);
    });
  });
});

function sha256(i) {
  return crypto.createHash('sha256').update(i).digest('hex');
}

describe('/Storage/models/marketing', function() {

  describe('#_genLink', function() {

    it('should generate a referral link', function(done) {

    });

    it('should create a new link if not unique', function(done) {

    });

  });

  describe('#create', function() {

    it('should create a new marketing doc with default props', function(done) {

    });

  });

  describe('#linkReferralToUser', function() {

    it('should link referral to the correct user', function(done) {

    });

    it('should create a new referral if one does not exist', function(done) {

    });

    it('should issue recipient credit', function(done) {

    });

  });

});
