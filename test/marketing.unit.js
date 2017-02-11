'use strict';

const chai = require('chai');
const expect = chai.expect;
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
        expect(marketing.referralLink).to.be.a('string');
        expect(marketing.created).to.equalDate(date);
        done();
      });
    });

  });

  describe('#_genReferralLink', function() {

    it('should generate a referral link', function(done) {
      const link = Marketing._genReferralLink();
      expect(link).to.be.a('string');
      done();
    });

  });

  describe('#_verifyReferralLink', function() {

    it('should return link if link is unique', function(done) {
      const linkIn = Marketing._genReferralLink();
      Marketing._verifyReferralLink(linkIn, function(err, linkOut) {
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
        const dupLink = marketing.referralLink;
        Marketing._verifyReferralLink(dupLink, function(err) {
          expect(err).to.be.an.instanceOf(Error);
          expect(err.message).to.equal('Duplicate referral link');
          done();
        });
      });
    });

  });

  describe('#_genAndVerify', function() {

    it('should generate and verify referralLink', function(done) {
      Marketing._genAndVerify(function(err, referralLink) {
        if (err) {
          return done(err);
        }
        expect(referralLink).to.be.a('string');
        Marketing.find({ referralLink }, function(err, docs) {
          if (err) {
            return done(err);
          }
          expect(docs.length).to.equal(0);
          done();
        });
      });
    });

  });

  describe('#isValidReferralLink', function() {

    it('should return referral link if valid', function(done) {
      Marketing.create('user2@hai.tld', function(err, marketing) {
        if (err) {
          return done(err);
        }
        Marketing.isValidReferralLink(marketing.referralLink)
          .then((result) => {
            expect(result).to.equal(marketing.referralLink);
            done();
          });
      });
    });

    it('should fail if referral link is invalid', function(done) {
      Marketing.isValidReferralLink('invalid-link-123')
        .catch((err) => {
          expect(err).to.be.an.instanceOf(Error);
          expect(err.message).to.equal('Invalid referral link');
          done();
        });
    });

  });

});
