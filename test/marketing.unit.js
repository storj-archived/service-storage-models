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

var Marketing;
var connection;

before(function(done) {
  connection = mongoose.createConnection(
    'mongodb://127.0.0.1:27017/__storj-bridge-test',
    function() {
      Marketing = MarketingSchema(connection);
      done();
    }
  );
});

after(function(done) {
  Marketing.remove({}, function() {
    connection.close(done);
  });
});

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

  describe('#_verifyNonDupLink', function() {

    it('should return link if link is unique', function(done) {
      const linkIn = Marketing._genLink();
      Marketing._verifyNonDupLink(linkIn, function(err, linkOut) {
        if (err) {
          return done(err);
        }
        expect(linkIn).to.equal(linkOut);
        done();
      });
    });

    it('should fail if link already exists', function(done) {
      Marketing.create('user1@domain.tld', function(err, marketing) {
        if (err) {
          return done(err);
        }
        const dupLink = marketing.link;
        Marketing._verifyNonDupLink(dupLink, function(err) {
          expect(err).to.be.an.instanceOf(Error);
          expect(err.message).to.equal('Duplicate link');
          done();
        });
      });
    });

  });

  describe('#_genAndVerify', function() {

    it('should generate and verify link', function(done) {
      Marketing._genAndVerify(function(err, link) {
        if (err) {
          return done(err);
        }
        expect(link).to.be.a('string');
        Marketing.find({ link }, function(err, docs) {
          if (err) {
            return done(err);
          }
          expect(docs.length).to.equal(0);
          done();
        });
      });
    });

  });

});
