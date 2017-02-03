'use strict';

const crypto = require('crypto');
const errors = require('storj-service-error-types');
const chai = require('chai');
const expect = chai.expect;
const chaiDate = require('chai-datetime');
const mongoose = require('mongoose');
const {
  REFERRAL_AMOUNTS,
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

  describe('#storeCreditId', function() {
    let marketing;
    let referral;
    let credit;

    beforeEach(function(done) {
      var newCredit = new Credit({
        user: 'user@domain.tld',
        type: CREDIT_TYPES.MANUAL
      });
      Marketing.create('sender2@domain.tld', function(err, marketing1) {
        if (err) {
          return done(err);
        }
        marketing = marketing1;
        Referral.create(marketing._id, 'recipient@a.com', 'email')
          .then((referral1) => {
            referral = referral1;
            newCredit.save(function(err, credit1) {
              if (err) {
                return done(err);
              }
              credit = credit1;
              done();
            }).catch((err) => {
              if (err) {
                return done(err);
              }
            });
          });
      });
    });

    afterEach(function(done) {
      Marketing.remove({}, function() {
        Referral.remove({}, function() {
          Credit.remove({}, function() {
            done();
          });
        });
      });
    });

    it('should store credit id for sender', function(done) {
      referral.storeCreditId('sender', credit._id)
        .then((referral) => {
          expect(referral.sender.credit).to.equal(credit._id);
          expect(referral.recipient.credit).to.be.undefined;
          done();
        }).catch((err) => err);
    });

    it('should store credit id for recipient', function(done) {
      referral.storeCreditId('recipient', credit._id)
        .then((referral) => {
          expect(referral.recipient.credit).to.equal(credit._id);
          expect(referral.sender.credit).to.be.undefined;
          done();
        });
    });

  });

  describe('#convert_signup', function() {

  });

  describe('#convert_billed', function() {

  });

});
