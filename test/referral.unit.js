'use strict';

const crypto = require('crypto');
const errors = require('storj-service-error-types');
const chai = require('chai');
const expect = chai.expect;
const chaiDate = require('chai-datetime');
const mongoose = require('mongoose');
const {
  REFERRAL_AMOUNTS,
  REFERRAL_TYPES
} = require('../lib/constants');

chai.use(chaiDate);
require('mongoose-types').loadTypes(mongoose);

const ReferralSchema = require('../lib/models/referral');
const MarketingSchema = require('../lib/models/marketing');

var Referral;
var Marketing;
var connection;

before(function(done) {
  connection = mongoose.createConnection(
    'mongodb://127.0.0.1:27017/__storj-bridge-test',
    function() {
      Referral = ReferralSchema(connection);
      Marketing =  MarketingSchema(connection);
      done();
    }
  );
});

after(function(done) {
  Referral.remove({}, function() {
    Marketing.remove({}, function() {
      connection.close(done);
    });
  });
});

function sha256(i) {
  return crypto.createHash('sha256').update(i).digest('hex');
}

const d = new Date();
const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());

describe('Storage/models/referral', function() {

  describe('#create', function() {

    it('should create a new referral with default props', function(done) {
      Marketing.create('sender@domain.tld', function(err, marketing) {
        Referral.create(marketing._id, 'recipient@a.com', 'email')
          .then((referral) => {
            expect(referral.sender.id).to.equal(marketing._id);
            expect(referral.sender.amount_to_credit)
              .to.equal(REFERRAL_AMOUNTS.SENDER_DEFAULT);
            expect(referral.recipient.id).to.equal('recipient@a.com');
            expect(referral.recipient.amount_to_credit)
              .to.equal(REFERRAL_AMOUNTS.RECIPIENT_DEFAULT);
            expect(referral.recipient.min_billed_requirement)
              .to.equal(REFERRAL_AMOUNTS.MIN_BILLED_REQUIREMENT_DEFAULT);
            expect(referral.created).to.equalDate(date);
            expect(referral.type).to.equal('email');
            expect(referral.type).to.be.oneOf(
              Object.keys(REFERRAL_TYPES).map((key) => (REFERRAL_TYPES[key]))
            );
            done();
          }).catch((err) => {
            if (err) {
              return done(err);
            }
          });
      });
    });

  });

  describe('#convert_signup', function() {

  });

  describe('#convert_billed', function() {

  });

});
