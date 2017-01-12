'use strict';

/*jshint expr: true, maxlen: 100*/

const chai = require('chai');
const expect = chai.expect;
const chaiDate = require('chai-datetime');
const mongoose = require('mongoose');

chai.use(chaiDate);
require('mongoose-types').loadTypes(mongoose);

const CreditSchema = require('../lib/models/credit');
const constants = require('../lib/constants');
const CREDIT_TYPES = constants.CREDIT_TYPES;
const PAYMENT_PROCESSORS = constants.PAYMENT_PROCESSORS;
const PROMO_CODES = constants.PROMO_CODES;

var Credit;
var connection;

before(function(done) {
  connection = mongoose.createConnection(
    'mongodb://127.0.0.1:27017__storj-bridge-test',
    function() {
      Credit = CreditSchema(connection);
      done();
    }
  );
});

after(function(done) {
  Credit.remove({}, function() {
    connection.close(done);
  });
});

describe('Storage/models/Credit', function() {

  describe('#create', function() {

    it('should create credit with the default props', function(done) {
      var newCredit = new Credit({
        user: 'user@domain.tld',
        type: CREDIT_TYPES.MANUAL
      });
      var d = new Date();
      var date = new Date(d.getFullYear(), d.getMonth(), d.getDate());

      newCredit.save(function(err, credit) {
        expect(err).to.not.be.instanceOf(Error);
        expect(credit.paid_amount).to.equal(0);
        expect(credit.invoiced_amount).to.equal(0);
        expect(credit.user).to.equal('user@domain.tld');
        expect(credit.promo_code).to.equal(PROMO_CODES.NONE);
        expect(credit.promo_amount).to.equal(0);
        expect(credit.paid).to.be.false;
        expect(credit.created).to.equalDate(date);
        expect(credit.payment_processor).to.equal(PAYMENT_PROCESSORS.DEFAULT);
        expect(credit.type).to.be.oneOf(
            Object.keys(CREDIT_TYPES).map((key) => (CREDIT_TYPES[key]))
        );
        expect(credit.data).to.be.null;
        done();
      });
    });

    it('should convert non-null/non-currency to 0', function(done) {
      var newCredit = new Credit({
        user: 'user@domain.tld',
        type: CREDIT_TYPES.MANUAL,
        paid_amount: 'text',
        invoiced_amount: '',
        promo_amount: undefined
      });

      newCredit.save(function(err, credit) {
        expect(err).to.not.be.instanceOf(Error);
        expect(credit.paid_amount).to.equal(0);
        expect(credit.invoiced_amount).to.equal(0);
        expect(credit.promo_amount).to.equal(0);
        done();
      });
    });

    it('should reject null for currency types', function(done) {
      var newCredit = new Credit({
        user: 'user@domain.tld',
        type: CREDIT_TYPES.MANUAL,
        paid_amount: null
      });

      newCredit.save(function(err) {
        expect(err).to.be.instanceOf(Error);
        done();
      });
    });

    it('should fail if paid_amount > invoiced_amount', function(done) {
      var newCredit = new Credit({
        user: 'user@domain.tld',
        type: CREDIT_TYPES.MANUAL,
        paid_amount: 100,
        invoiced_amount: 50
      });

      newCredit.save(function(err) {
        expect(err).to.be.instanceOf(Error);
        expect(err.message).to.equal(
          `Cannot save credit: paid_amount cannot be greater than invoiced_amount`
        );
        done();
      });
    });

    it('should set paid = true if invoiced_amount=paid_amount', function(done) {
      var newCredit = new Credit({
        user: 'user@domain.tld',
        type: CREDIT_TYPES.MANUAL,
        paid_amount: 100,
        invoiced_amount: 100
      });

      newCredit.save(function(err, credit) {
        expect(err).to.not.be.instanceOf(Error);
        expect(credit.paid_amount).to.equal(credit.invoiced_amount);
        expect(credit.paid).to.be.true;
        done();
      });
    });

    it('should fail if paid = true && paid_amount !== invoiced_amount', function(done) {
      var newCredit = new Credit({
        user: 'user@domain.tld',
        type: CREDIT_TYPES.MANUAL,
        paid: true,
        paid_amount: 70,
        invoiced_amount: 100
      });

      newCredit.save(function(err) {
        expect(err).to.be.instanceOf(Error);
        expect(err.message).to.equal(
          `Cannot save credit: paid cannot be true if paid_amount does not equal invoiced_amount`
        );
        done();
      });
    });

    it('should fail if paid = true and paid_amount and/or invoiced_amount is 0', function(done) {
      var newCredit = new Credit({
        user: 'user@domain.tld',
        type: CREDIT_TYPES.MANUAL,
        paid: true,
        paid_amount: 0,
        invoiced_amount: 100
      });

      newCredit.save(function(err) {
        expect(err).to.be.instanceOf(Error);
        expect(err.message).to.equal(
          `Cannot save credit: paid_amount cannot be 0 if paid is true`
        );
        done();
      });
    });

    it('should reject if paid_amount is negative', function(done) {
      var newCredit = new Credit({
        user: 'user@domain.tld',
        type: CREDIT_TYPES.MANUAL,
        paid_amount: -100
      });

      newCredit.save(function(err) {
        expect(err).to.be.instanceOf(Error);
        expect(err.message).to.equal('Credit validation failed');
        done();
      });
    });

    it('should reject if invoiced_amount is negative', function(done) {
      var newCredit = new Credit({
        user: 'user@domain.tld',
        type: CREDIT_TYPES.MANUAL,
        invoiced_amount: -100
      });

      newCredit.save(function(err) {
        expect(err).to.be.instanceOf(Error);
        done();
      });
    });

    it('should reject if promo_amount is negative', function(done) {
      var newCredit = new Credit({
        user: 'user@domain.tld',
        type: CREDIT_TYPES.MANUAL,
        promo_amount: -100
      });

      newCredit.save(function(err) {
        expect(err).to.be.instanceOf(Error);
        done();
      });
    });

    it('should have "none" promo_code if promo_amount is equal to 0', function(done) {
      var newCredit = new Credit({
        user: 'user@domain.tld',
        type: CREDIT_TYPES.MANUAL,
        promo_code: PROMO_CODES.NONE,
        promo_amount: 0
      });

      newCredit.save(function(err, credit) {
        expect(err).to.not.be.instanceOf(Error);
        expect(credit.promo_code).to.equal(PROMO_CODES.NONE);
        expect(credit.promo_amount).to.equal(0);
        done();
      });
    });

    it('should have other promo_code if promo_amount is greater than 0', function(done) {
      var newCredit = new Credit({
        user: 'user@domain.tld',
        type: CREDIT_TYPES.MANUAL,
        promo_code: 'other',
        promo_amount: 10
      });

      newCredit.save(function(err, credit) {
        expect(err).to.not.be.instanceOf(Error);
        expect(credit.promo_code).to.not.equal(PROMO_CODES.NONE);
        expect(credit.promo_amount).to.be.above(0);
        done();
      });
    });

    it('should allow mixed data types for data field', function(done) {
      var newCredit = new Credit({
        user: 'user@domain.tld',
        type: CREDIT_TYPES.MANUAL,
        data: null
      });

      newCredit.save(function(err, credit) {
        expect(err).to.not.be.instanceOf(Error);
        expect(credit.data).to.be.null;

        Credit.findOneAndUpdate(
          { _id: credit._id },
          { data: 'I am a string' },
          { new: true },
          function(err, modifiedCredit) {
            expect(err).to.not.be.instanceOf(Error);
            expect(modifiedCredit.data).to.be.a('string');

            Credit.findOneAndUpdate(
              { _id: credit._id },
              { data: ['I', 'am', 'an', 'Array'] },
              { new: true },
              function(err, modifiedCredit) {
                expect(err).to.not.be.instanceOf(Error);
                expect(modifiedCredit.data).to.be.an('array');
                done();
              }
            );
          }
        );
      });
    });

  });

});
