'use strict';

const storj = require('storj-lib');
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
      var date = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

      newCredit.save(function(err, credit) {
        expect(err).to.not.be.instanceOf(Error);
        expect(credit.paid_amount).to.equal(0);
        expect(credit.invoiced_amount).to.equal(0);
        expect(credit.user).to.equal('user@domain.tld');
        expect(credit.promo_code).to.equal(PROMO_CODES.DEFAULT);
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

    it('should convert non-currency paid_amount to 0', function(done) {
      var newCredit = new Credit({
        user: 'user@domain.tld',
        type: CREDIT_TYPES.MANUAL,
        invoiced_amount: 100,
        paid_amount: 'text'
      });

      newCredit.save(function(err, credit) {
        expect(err).to.not.be.instanceOf(Error);
        expect(credit.paid_amount).to.equal(0);
        done();
      });
    });

    it('should fail when paid_amount equals null', function(done) {
      var newCredit = new Credit({
        user: 'user@domain.tld',
        type: CREDIT_TYPES.MANUAL,
        paid_amount: null
      });

      newCredit.save(function(err, credit) {
        expect(err).to.be.instanceOf(Error);
        done();
      });
    });

  });

});

/*
 fail with non-currency paid_amount

 promo code has to be String type
 user always needs to be email (regex)
 paid amount should never be greater than invoiced_amount
 if paid amount = invoiced_amount then paid = true
 make sure data can handle all sorts of types (arrays, objects, strings, numbers)
 created should always be a Date (pass in non-date thing)
 if paid = true, paid amount !== 0 and invoiced_amount !== 0
 */
