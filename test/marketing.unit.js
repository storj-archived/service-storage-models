'use strict';

const crypto = require('crypto');
const errors = require('storj-service-error-types');
const chai = require('chai');
const expect = require('chai').expect;
const chaiDate = require('chai-datetime');
const mongoose = require('mongoose');

chai.use(chaiDate);
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

  describe('#create', function() {

    it('should create a new marketing doc with default props', function(done) {
      var d = new Date();
      var date = new Date(d.getFullYear(), d.getMonth(), d.getDate());

      Marketing.create('user@domain.tld', function(err, marketing) {
        if (err) {
          return done(err);
        }
        expect(marketing.user).to.equal('user@domain.tld');
        expect(marketing.link).to.be.a('string');
        expect(marketing.created).to.equalDate(date);
        done();
      });
    });

  });

  describe('#_genLink', function() {

    it('should generate a referral link', function(done) {
      const link = Marketing._genLink();
      expect(link).to.be.a('string');
      done();
    });

  });

  // describe('#linkReferralToUser', function() {

  //   it('should link referral to the correct user', function(done) {

  //   });

  //   it('should create a new referral if one does not exist', function(done) {

  //   });

  //   it('should issue recipient credit', function(done) {

  //   });

  // });

});
