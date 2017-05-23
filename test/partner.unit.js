'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiDate = require('chai-datetime');
const mongoose = require('mongoose');

chai.use(chaiDate);
require('mongoose-types').loadTypes(mongoose);

const PartnerSchema = require('../lib/models/partner');

var Partner;
var connection;

before(function(done) {
  connection = mongoose.createConnection(
    'mongodb://127.0.0.1:27017/__storj-bridge-test',
    function() {
      Partner = PartnerSchema(connection);
      Partner.remove({}, function() {
        done();
      });
    }
  );
});

after(function(done) {
  connection.close(done);
});

describe('/Storage/models/Partner', function() {

  describe('@constructor', function() {

    it('should create new partner', function (done) {
      const d = new Date();
      const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const name = 'partner1';
      const revSharePercentage = 0.20;

      const newPartner = new Partner({ name, revSharePercentage });

      newPartner.save(function(err, partner) {
        if (err) {
          return done(err);
        }

        expect(partner.name).to.equal(name);
        expect(partner.revSharePercentage).to.equal(revSharePercentage);
        expect(partner.created).to.equalDate(date);
        expect(partner.modified).to.equalDate(date);
        done();
      });
    });

    it('should fail validation for duplicate name', function (done) {
      const name = 'partner1';
      const revSharePercentage = 0.20;

      const newPartner = new Partner({ name, revSharePercentage });

      newPartner.save(function(err, partner) {
        expect(err).to.be.instanceOf(Error);
        // duplicate code: 11000
        expect(err.code).to.equal(11000);
        done();
      });
    });

    it('should fail validation for out of range percentage', function (done) {
      const name = 'partner1a';
      const revSharePercentage = 100;

      const newPartner = new Partner({ name, revSharePercentage });

      newPartner.save(function(err, partner) {
        expect(err).to.be.instanceOf(Error);
        expect(err.message).to.equal('Partner validation failed: revSharePercentage: Path `revSharePercentage` (100) is more than maximum allowed value (1).');
        done();
      });
    });

  });

  describe('#toObject', function() {

    it('should remove expected fields', function (done) {
      const name = 'partner2';
      const revSharePercentage = 0.20;
      const newPartner = new Partner({ name, revSharePercentage });

      newPartner.save(function(err, partner) {
        if (err) {
          return done(err);
        }

        const partnerKeys = Object.keys(partner.toObject());
        expect(partnerKeys).to.not.contain('__v', '_id');
        done();
      });
    });

  });

  describe('#toJSON', function() {

    it('should remove expected fields', function (done) {
      const name = 'partner3';
      const revSharePercentage = 0.20;
      const newPartner = new Partner({ name, revSharePercentage });

      newPartner.save(function(err, partner) {
        if (err) {
          return done(err);
        }

        const partnerKeys = Object.keys(partner.toJSON());
        expect(partnerKeys).to.not.contain('__v', '_id');
        done();
      });
    });

  });

});
