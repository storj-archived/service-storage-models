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
      Referral.remove({}, function() {
        Marketing.remove({}, function() {
          Credit.remove({}, function() {
            done();
          });
        });
      });
    }
  );
});

after(function(done) {
  connection.close(done);
});

const d = new Date();
const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());

describe('Storage/models/Referral', function() {

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
            expect(referral.recipient.min_spent_requirement)
              .to.equal(PROMO_AMOUNT.MIN_SPENT_REQUIREMENT);
            expect(referral.created).to.equalDate(date);
            expect(referral.converted.recipient_signup).to.be.undefined;
            expect(referral.converted.recipient_billed).to.be.undfined;
            expect(referral.type).to.equal('email');
            expect(referral.type).to.be.oneOf(
              Object.keys(REFERRAL_TYPES).map((key) => (REFERRAL_TYPES[key]))
            );
            expect(referral.count).to.equal(1);
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
            expect(err.message).to.match(/^referral validation failed.*/i);
          });
        done();
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

    it('should fail with undefined marketing doc', function(done) {
      Referral.create(null, 'user@domain.tld', 'email')
        .catch((err) => {
          expect(err).to.be.an.instanceOf(Error);
          expect(err.message).to.equal('Invalid marketing doc');
          done();
        });
    });

    it('should not create duplicate doc', function(done) {
      Marketing.create('sender11@domain.tld', function(err, marketing) {
        Referral.create(marketing, 'recipient@bob.com', 'email')
          .then((referral) => {
            const first = referral;
            Referral.create(marketing, 'recipient@bob.com', 'email')
              .then((referral) => {
                const second = referral;
                Referral.find({
                  'sender.id': marketing._id,
                  'recipient.email': 'recipient@bob.com'
                }).then((result) => {
                  expect(result.length).to.equal(1);
                  expect(first.id).to.equal(second.id);
                  done();
                });
              });
          });
      });
    });


    it('should increase referral sent count', function(done) {
      Marketing.create('sender12@domain.tld', function(err, marketing) {
        Referral.create(marketing, 'recipient@bob.com', 'email')
          .then(() => Referral.create(marketing, 'recipient@bob.com', 'email'))
          .then(() => {
            Referral.find({
              'sender.id': marketing._id,
              'recipient.email': 'recipient@bob.com'
            }).then((result) => {
              expect(result.length).to.equal(1);
              expect(result[0].count).to.equal(2);
              done();
            });
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
          promo_code: PROMO_CODE.REFERRAL_RECIPIENT,
          promo_referral_id: '58a7364b7577a34a443e05c5'
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
          promo_code: PROMO_CODE.REFERRAL_RECIPIENT,
          promo_referral_id: '58a7364b7577a34a443e05c5'
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

  describe('#toObject', function() {

    it('should contain specified properties', function(done) {
      Marketing.create('sender9@domain.tld', function(err, marketing) {
        Referral.create(marketing, 'recipient@a.com', 'email')
          .then((referral) => {
            const keys = Object.keys(referral.toObject());
            expect(keys).to.not.contain('__v', '_id');
            expect(keys).to.contain('id');
            done();
          }).catch((err) => {
            if (err) {
              return done(err);
            }
          });
      });
    });

  });

  describe('#pre-save', function() {

    it('should fail trying to save sender credit prematurely', function(done) {
      Marketing.create('sender7@domain.tld', function(err, marketing) {
        Referral.create(marketing, 'recipient@b.com', 'email')
          .then((referral) => {
            // just pass in any ObjectId so it passes validation
            referral.sender.credit = marketing._id;
            referral.save()
              .catch((err) => {
                expect(err).to.be.instanceOf(Error);
                expect(err.message).to.equal(
                  'converted.recipient_billed must exist with sender.credit'
                );
                done();
              });
          });
      });
    });

    it('should move on if recipient_billed validation passes', function(done) {
      Marketing.create('sender8@domain.tld', function(err, marketing) {
        Referral.create(marketing, 'recipient@b.com', 'email')
          .then((referral) => {
            const recipientCredit = new Credit({
              user: 'recipient@b.com',
              type: CREDIT_TYPES.AUTO,
              promo_amount: PROMO_AMOUNT.REFERRAL_RECIPIENT,
              promo_expires: PROMO_EXPIRES.REFERRAL_RECIPIENT,
              promo_code: PROMO_CODE.REFERRAL_RECIPIENT,
              promo_referral_id: '58a7364b7577a34a443e05c5'
            });

            const senderCredit = new Credit({
              user: 'sender8@domain.tld',
              type: CREDIT_TYPES.AUTO,
              promo_amount: PROMO_AMOUNT.REFERRAL_SENDER,
              promo_expires: PROMO_EXPIRES.REFERRAL_SENDER,
              promo_code: PROMO_CODE.REFERRAL_SENDER,
              promo_referral_id: '58a75e0f9ed9396269dfae44'
            });

            recipientCredit.save().then((recipientCredit) => {
              senderCredit.save().then((senderCredit) => {

                referral.sender.credit = senderCredit._id;
                referral.recipient.credit = recipientCredit._id;
                referral.converted.recipient_signup = recipientCredit.created;
                referral.converted.recipient_billed = senderCredit.created;

                referral.save().then(() => done());
              });
            });
          });
      });
    });

    it('should fail if recipient_billed validation fails', function(done) {
      Marketing.create('sender19@domain.tld', function(err, marketing) {
        Referral.create(marketing, 'recipient@b.com', 'email')
          .then((referral) => {
            const recipientCredit = new Credit({
              user: 'recipient@b.com',
              type: CREDIT_TYPES.AUTO,
              promo_amount: PROMO_AMOUNT.REFERRAL_RECIPIENT,
              promo_expires: PROMO_EXPIRES.REFERRAL_RECIPIENT,
              promo_code: PROMO_CODE.REFERRAL_RECIPIENT,
              promo_referral_id: '58a75e0f9ed9396269dfae44'
            });

            recipientCredit.save().then((recipientCredit) => {
              referral.recipient.credit = recipientCredit._id;
              referral.converted.recipient_signup = recipientCredit.created;
              referral.converted.recipient_billed = new Date();

              referral.save().catch((err) => {
                expect(err).to.be.instanceOf(Error);
                expect(err.message).to.equal(
                  'Error validating referral doc - converted dates and credits'
                );
                done();
              });
            });
          });
      });
    });

  });

});
