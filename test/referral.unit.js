'use strict';

/*jshint expr: true*/

const chai = require('chai');
const expect = chai.expect;
const chaiDate = require('chai-datetime');
const mongoose = require('mongoose');
const {
  PROMO_CODE,
  PROMO_EXPIRES,
  PROMO_AMOUNT,
  REFERRAL_TYPES,
  CREDIT_TYPES
} = require('../lib/constants');

chai.use(chaiDate);
require('mongoose-types').loadTypes(mongoose);

const ReferralSchema = require('../lib/models/referral');
const MarketingSchema = require('../lib/models/marketing');
const CreditSchema = require('../lib/models/credit');

var Referral;
var Marketing;
var Credit;
var connection;

before(function(done) {
  connection = mongoose.createConnection(
    'mongodb://127.0.0.1:27017/__storj-bridge-test',
    function() {
      Referral = ReferralSchema(connection);
      Marketing =  MarketingSchema(connection);
      Credit = CreditSchema(connection);
      done();
    }
  );
});

after(function(done) {
  Referral.remove({}, function() {
    Marketing.remove({}, function() {
      Credit.remove({}, function() {
        connection.close(done);
      });
    });
  });
});

const d = new Date();
const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());

describe('Storage/models/referral', function() {

  describe('#create', function() {

    it('should create a new referral with default props', function(done) {
      Marketing.create('sender@domain.tld', function(err, marketing) {
        Referral.create(marketing, 'recipient@a.com', 'email')
          .then((referral) => {
            expect(referral.sender.id).to.equal(marketing._id);
            expect(referral.sender.amount_to_credit)
              .to.equal(PROMO_AMOUNT.REFERRAL_SENDER);
            expect(referral.recipient.email).to.equal('recipient@a.com');
            expect(referral.recipient.amount_to_credit)
              .to.equal(PROMO_AMOUNT.REFERRAL_RECIPIENT);
            expect(referral.recipient.min_billed_requirement)
              .to.equal(PROMO_AMOUNT.MIN_BILLED_REQUIREMENT_DEFAULT);
            expect(referral.created).to.equalDate(date);
            expect(referral.converted.recipient_signup).to.be.undefined;
            expect(referral.converted.recipient_billed).to.be.undfined;
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

    it('should fail with wrong referral type', function(done) {
      Marketing.create('sender5@domain.tld', function(err, marketing) {
        Referral.create(marketing, 'recipient@a.com', 'something')
          .catch((err) => {
            expect(err).to.be.an.instanceOf(Error);
            expect(err.message).to.equal('Referral validation failed');
            done();
          });
      });
    });

    it('should reject invalid email', function(done) {
      Marketing.create('sender6@domain.tld', function(err, marketing) {
        Referral.create(marketing, 'wrongemail.com', 'email')
          .catch((err) => {
            expect(err).to.be.an.instanceOf(Error);
            expect(err.message).to.equal('Invalid email');
            done();
          });
      });
    });

  });

  describe('#convert_receipient_signup', function() {

    it('should set convert.recipient_signup to today', function(done) {
      Marketing.create('sender3@domain.tld', function(err, marketing) {
        const newCredit = new Credit({
          user: 'recipient@a.com',
          type: CREDIT_TYPES.AUTO,
          promo_amount: PROMO_AMOUNT.REFERRAL_RECIPIENT,
          promo_expires: PROMO_EXPIRES.REFERRAL_RECIPIENT,
          promo_code: PROMO_CODE.REFERRAL_RECIPIENT
        });

        newCredit.save().then((credit) => {
          Referral.create(marketing, 'recipient@a.com', 'email')
            .then((referral) => referral.convert_recipient_signup(credit))
            .then((referral) => {
              expect(referral.converted.recipient_signup)
                .to.equalDate(credit.created);
              done();
            });
        });
      });
    });

    it('should set recipient.referral.credit to credit._id', function(done) {
      Marketing.create('sender4@domain.tld', function(err, marketing) {
        const newCredit = new Credit({
          user: 'recipient2@a.com',
          type: CREDIT_TYPES.AUTO,
          promo_amount: PROMO_AMOUNT.REFERRAL_RECIPIENT,
          promo_expires: PROMO_EXPIRES.REFERRAL_RECIPIENT,
          promo_code: PROMO_CODE.REFERRAL_RECIPIENT
        });

        newCredit.save().then((credit) => {
          Referral.create(marketing, 'recipient2@a.com', 'email')
            .then((referral) => referral.convert_recipient_signup(credit))
            .then((referral) => {
              expect(referral.recipient.credit).to.equal(credit._id);
              done();
            });
        });
      });
    });

    it('should reject if no !credit', function(done) {
      Marketing.create('sende54@domain.tld', function(err, marketing) {
        Referral.create(marketing, 'recipient2@a.com', 'email')
          .then((referral) => referral.convert_recipient_signup(null))
          .catch((err) => {
            expect(err).to.be.an.instanceOf(Error);
            expect(err.message).to.equal('Must pass in valid credit');
            done();
          });
      });
    });

  });

});
