'use strict';

/*jshint expr: true, maxlen: 100*/

const chai = require('chai');
const expect = chai.expect;
const chaiDate = require('chai-datetime');
const mongoose = require('mongoose');

chai.use(chaiDate);
require('mongoose-types').loadTypes(mongoose);

const CreditSchema = require('../lib/models/credit');
const {
  CREDIT_TYPES,
  PAYMENT_PROCESSORS,
  PROMO_CODE,
  PROMO_EXPIRES,
  PROMO_AMOUNT
} = require('../lib/constants');

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

    it('should create credit with default paid/invoice', function(done) {
      const newCredit = new Credit({
        user: 'user@domain.tld',
        type: CREDIT_TYPES.MANUAL
      });
      const d = new Date();
      const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());

      newCredit.save(function(err, credit) {
        expect(err).to.not.be.instanceOf(Error);
        expect(credit.paid_amount).to.equal(0);
        expect(credit.invoiced_amount).to.equal(0);
        expect(credit.user).to.equal('user@domain.tld');
        expect(credit.paid).to.be.true;
        expect(credit.created).to.equalDate(date);
        expect(credit.payment_processor).to.equal(PAYMENT_PROCESSORS.DEFAULT);
        expect(credit.type).to.be.oneOf(
            Object.keys(CREDIT_TYPES).map((key) => (CREDIT_TYPES[key]))
        );
        expect(credit.data).to.be.null;
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
        if (err) {
          return done(err);
        }
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

    it('should reject if paid_amount is negative', function(done) {
      const newCredit = new Credit({
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
      const newCredit = new Credit({
        user: 'user@domain.tld',
        type: CREDIT_TYPES.MANUAL,
        invoiced_amount: -100
      });

      newCredit.save(function(err) {
        expect(err).to.be.instanceOf(Error);
        // NB: This error supercedes 'Credit validation failed' because, at
        // this point, paid_amount is 0 and is > than invoiced_amount, and it
        // returns an error before reaching the 'credit validation failed' for
        // negative amounts
        expect(err.message).to.equal(
          'paid_amount cannot be greater than invoiced_amount'
        );
        done();
      });
    });

  });

  describe('#create - paid_amount and invoiced_amount relations', function() {

    it('should fail if trying to save paid without invoiced', function(done) {
      const newCredit = new Credit({
        user: 'user@domain.tld',
        type: CREDIT_TYPES.MANUAL,
        paid_amount: 10
      });

      newCredit.save(function(err) {
        expect(err).to.be.an.instanceOf(Error);
        expect(err.message).to.equal(
          'paid_amount cannot be greater than invoiced_amount'
        );
        done();
      });
    });

    it('should fail if paid_amount > invoiced_amount', function(done) {
      const newCredit = new Credit({
        user: 'user@domain.tld',
        type: CREDIT_TYPES.MANUAL,
        paid_amount: 20,
        invoiced_amount: 10
      });

      newCredit.save(function(err) {
        expect(err).to.be.an.instanceOf(Error);
        expect(err.message).to.equal(
          'paid_amount cannot be greater than invoiced_amount'
        );
        done();
      });
    });

    it('should set paid=true if paid=invoiced && both > 0', function(done) {
      const newCredit = new Credit({
        user: 'user@domain.tld',
        type: CREDIT_TYPES.MANUAL,
        invoiced_amount: 1,
        paid_amount: 1
      });

      newCredit.save(function(err, credit) {
        if (err) {
          return done(err);
        }
        expect(credit.invoiced_amount).to.equal(credit.paid_amount);
        expect(credit.paid).to.be.true;
        done();
      });
    });

    it('should set paid=false if paid!=invoiced && both > 0', function(done) {
      const newCredit = new Credit({
        user: 'user@domain.tld',
        type: CREDIT_TYPES.MANUAL,
        invoiced_amount: 10,
        paid_amount: 1
      });

      newCredit.save(function(err, credit) {
        if (err) {
          return done(err);
        }
        expect(credit.invoiced_amount).to.be.above(credit.paid_amount);
        expect(credit.paid).to.be.false;
        done();
      });
    });

    it('cannot set paid:true if paid_amount !== invoiced_amount',
      function(done) {
      const newCredit = new Credit({
        user: 'user@domain.tld',
        type: CREDIT_TYPES.MANUAL,
        paid: true,
        paid_amount: 70,
        invoiced_amount: 100
      });

      newCredit.save(function(err, credit) {
        if (err) {
          return done(err);
        }
        expect(credit.paid).to.be.false;
        done();
      });
    });

    it('should have paid:false if paid_amount is 0', function(done) {
      const newCredit = new Credit({
        user: 'user@domain.tld',
        type: CREDIT_TYPES.MANUAL,
        paid_amount: 0,
        invoiced_amount: 100
      });

      newCredit.save(function(err, credit) {
        if (err) {
          return done(err);
        }
        expect(credit.paid).to.be.false;
        done();
      });
    });

  });

  describe('#create - promo vs paid_amount/invoiced_amount', function() {

    it('should fail if trying to save invoiced and promo', function(done) {
      const newCredit = new Credit({
        user: 'user@domain.tld',
        type: CREDIT_TYPES.MANUAL,
        invoiced_amount: 20,
        promo_amount: 10
      });

      newCredit.save(function(err) {
        expect(err).to.be.an.instanceOf(Error);
        expect(err.message).to.equal(
          'promo_amount cannot exist with invoiced_amount and/or paid_amount'
        );
        done();
      });
    });

    it('should fail if trying to save paid_amount and promo', function(done) {
      const newCredit = new Credit({
        user: 'user@domain.tld',
        type: CREDIT_TYPES.MANUAL,
        paid_amount: 20,
        promo_amount: 10
      });

      newCredit.save(function(err) {
        expect(err).to.be.an.instanceOf(Error);
        expect(err.message).to.equal(
          'promo_amount cannot exist with invoiced_amount and/or paid_amount'
        );
        done();
      });
    });

    it('should have no paid/invoice if promo exists', function(done) {
      const newCredit = new Credit({
        user: 'user@domain.tld',
        type: CREDIT_TYPES.MANUAL,
        promo_amount: PROMO_AMOUNT.NEW_SIGNUP,
        promo_code: PROMO_CODE.NEW_SIGNUP,
        promo_expires: PROMO_EXPIRES.NEW_SIGNUP
      });

      newCredit.save(function(err, credit) {
        if (err) {
          return done(err);
        }
        // NB: credit.paid_amount and credit_.invoiced_amount are NaN because
        // their type is Number
        expect(credit.paid_amount).to.be.NaN;
        expect(credit.invoiced_amount).to.be.NaN;
        expect(credit.paid).to.be.false;
        expect(credit.promo_amount).to.equal(PROMO_AMOUNT.NEW_SIGNUP);
        expect(credit.promo_code).to.equal(PROMO_CODE.NEW_SIGNUP);
        expect(credit.promo_expires).to.equal(PROMO_EXPIRES.NEW_SIGNUP);
        done();
      });
    });

    it('should have no promo if paid/invoice exists', function(done) {
      const newCredit = new Credit({
        user: 'user@domain.tld',
        type: CREDIT_TYPES.MANUAL,
        paid_amount: 0,
        invoiced_amount: 10
      });

      newCredit.save(function(err, credit) {
        if (err) {
          return done(err);
        }
        expect(credit.promo_amount).to.be.NaN;
        expect(credit.promo_code).to.be.NaN;
        expect(credit.promo_expires).to.be.undefined;
        done();
      });
    });

  });

  describe('#create - promo validations', function() {

    it('should have promo_code if promo_amount is > 0', function(done) {
      const newCredit = new Credit({
        user: 'user@domain.tld',
        type: CREDIT_TYPES.MANUAL,
        promo_code: PROMO_CODE.NEW_SIGNUP,
        promo_amount: 1,
        promo_expires: PROMO_EXPIRES.NEW_SIGNUP
      });

      newCredit.save(function(err, credit) {
        if (err) {
          return done(err);
        }
        expect(credit.promo_code).to.equal(PROMO_CODE.NEW_SIGNUP);
        expect(credit.promo_amount).to.equal(1);
        done();
      });
    });

    it('should fail if promo_amount > 0 && !promo_code', function(done) {
      const newCredit = new Credit({
        user: 'user@domain.tld',
        type: CREDIT_TYPES.MANUAL,
        promo_amount: 1
      });

      newCredit.save(function(err) {
        expect(err).to.be.instanceOf(Error);
        expect(err.message).to.equal(
          'promo_amount must have valid promo_code'
        );
        done();
      });
    });

    it('should fail if promo_amount>0 && invalid promo_code', function(done) {
      const newCredit = new Credit({
        user: 'user@domain.tld',
        type: CREDIT_TYPES.MANUAL,
        promo_amount: PROMO_CODE.NEW_SIGNUP,
        promo_code: 'whatever-code',
        promo_expires: PROMO_CODE.NEW_SIGNUP
      });

      newCredit.save(function(err) {
        expect(err).to.be.an.instanceOf(Error);
        expect(err.message).to.equal('Credit validation failed');
        done();
      });
    });

    it('should have valid promo_code if promo_amount is > 0', function(done) {
      const newCredit = new Credit({
        user: 'user@domain.tld',
        type: CREDIT_TYPES.MANUAL,
        promo_code: PROMO_CODE.NEW_SIGNUP,
        promo_amount: PROMO_AMOUNT.NEW_SIGNUP,
        promo_expires: PROMO_EXPIRES.NEW_SIGNUP
      });

      newCredit.save(function(err, credit) {
        if (err) {
          return done(err);
        }
        expect(credit.promo_code).to.equal(PROMO_CODE.NEW_SIGNUP);
        expect(credit.promo_amount).to.be.above(0);
        expect(credit.promo_amount).to.equal(PROMO_AMOUNT.NEW_SIGNUP);
        done();
      });
    });

    it('should have promo_expires if promo_amount > 0', function(done) {
      const newCredit = new Credit({
        user: 'user@domain.tld',
        type: CREDIT_TYPES.MANUAL,
        promo_code: PROMO_CODE.NEW_SIGNUP,
        promo_amount: PROMO_AMOUNT.NEW_SIGNUP,
      });

      newCredit.save(function(err) {
        expect(err).to.be.an.instanceOf(Error);
        expect(err.message).to.equal(
          'promo_amount must have accompanying promo_expires date field'
        );
        done();
      });
    });

  });

  describe('#create - referral promo validations', function() {

    it('should have promo_referral_id if promo_code=referral', function(done) {
      const newCredit = new Credit({
        user: 'user@domain.tld',
        type: CREDIT_TYPES.AUTO,
        promo_code: PROMO_CODE.REFERRAL_SENDER,
        promo_amount: PROMO_AMOUNT.REFERRAL_SENDER,
        promo_expires: PROMO_EXPIRES.REFERRAL_SENDER
      });

      newCredit.save(function(err) {
        expect(err).to.be.an.instanceOf(Error);
        expect(err.message).to.equal(
          'promo credit docs require a promo_referral_id'
        );
        done();
      });
    });

  });

  describe('#toObject', function() {

    it('should have specified fields for paid/invoiced', function(done) {
      const newCredit = new Credit({
        user: 'user@domain.tld',
        type: CREDIT_TYPES.MANUAL,
        paid_amount: 0,
        invoiced_amount: 100
      });

      newCredit.save(function(err, credit) {
        expect(err).to.not.be.an.instanceOf(Error);
        const creditKeys = Object.keys(credit.toObject());
        expect(creditKeys).to.not.contain(
          '__v', '_id', 'promo_amount', 'promo_code', 'promo_expires',
          'promo_referral_id'
        );
        expect(creditKeys).to.contain('user', 'paid_amount', 'type',
          'invoiced_amount', 'data', 'payment_processor', 'created', 'paid'
        );
        done();
      });
    });

    it('should have specified fields for promo', function(done) {
      const newCredit = new Credit({
        user: 'user@domain.tld',
        type: CREDIT_TYPES.MANUAL,
        promo_code: PROMO_CODE.NEW_SIGNUP,
        promo_amount: PROMO_AMOUNT.NEW_SIGNUP,
        promo_expires: PROMO_EXPIRES.NEW_SIGNUP
      });

      newCredit.save(function(err, credit) {
        expect(err).to.not.be.an.instanceOf(Error);
        const creditKeys = Object.keys(credit.toObject());
        expect(creditKeys).to.not.contain(
          '__v', '_id', 'paid_amount', 'invoiced_amount'
        );
        expect(creditKeys).to.contain('user', 'promo_amount', 'promo_expires',
          'promo_code', 'created', 'data', 'type'
        );
        done();
      });
    });

  });

});
