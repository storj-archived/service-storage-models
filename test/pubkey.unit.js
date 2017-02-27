'use strict';

const storj = require('storj-lib');
const expect = require('chai').expect;
const mongoose = require('mongoose');

require('mongoose-types').loadTypes(mongoose);

const PublicKeySchema = require('../lib/models/pubkey');

var PublicKey;
var connection;

before(function(done) {
  connection = mongoose.createConnection(
    'mongodb://127.0.0.1:27017/__storj-bridge-test',
    function() {
      PublicKey = PublicKeySchema(connection);
      PublicKey.remove({}, function() {
        done();
      });
    }
  );
});

after(function(done) {
  connection.close(done);
});

describe('Storage/models/PublicKey', function() {

  var publicKey = storj.KeyPair().getPublicKey();

  it('should create the public key', function(done) {
    PublicKey.create({
      _id: 'user@domain.tld'
    }, publicKey, function(err, pubkey) {
      expect(err).to.not.be.instanceOf(Error);
      expect(pubkey._id).to.equal(publicKey);
      done();
    });
  });

  it('should create the public with spam resistent email', function(done) {

    var publicKey2 = storj.KeyPair().getPublicKey();

    PublicKey.create({
      _id: 'user+nospam@domain.tld'
    }, publicKey2, function(err, pubkey) {
      if (err) {
        return done(err);
      }
      pubkey.save((err) => {
        if (err) {
          return done(err);
        }
        expect(pubkey._id).to.equal(publicKey2);
        done();
      });
    });
  });

  it('should not create duplicate key', function(done) {
    PublicKey.create({
      _id: 'user@domain.tld'
    }, publicKey, function(err) {
      expect(err.message).to.equal(
        'Public key is already registered'
      );
      done();
    });
  });

  it('should reject an invalid ecdsa key', function(done) {
    PublicKey.create({
      _id: 'user@domain.tld'
    }, 'testkey', function(err) {
      expect(err.message).to.equal(
        'Invalid public key supplied: Invalid hex string'
      );
      done();
    });
  });

  it('should reject an non-hex encoded ecdsa key', function(done) {
    PublicKey.create({
      _id: 'user@domain.tld'
    }, 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEVKTbNAB1ViPHwNyTYFPm07YfoDAwNmh3c' +
       'gaEh8UH6I5O5Lqr3_EYNk5ddi4pE4fSeISzgVGAcMsKJN4DCKviLA', function(err) {
      expect(err.message).to.equal(
        'Invalid public key supplied: Invalid public key supplied'
      );
      done();
    });
  });

  it('should reject an invalid hex string', function(done) {
    PublicKey.create(
      {
        _id: 'user@domain.tld'
      },
      '02:3d:9e:3d:b5:e0:b0:1b:be:5d:5a:66:6c:47:d6:87:43:60:8b:2c:ec:70:87:eb:56:37:95:1f:51:e8:61:a7:fd', // jshint ignore:line
    function(err) {
      expect(err.message).to.equal(
        'Invalid public key supplied: Must not contain non-hexidecimal characters like ":"' // jshint ignore:line
      );
      done();
    });
  });

  describe('#toObject', function() {

    it('should contain specified properties + virtuals', function(done) {
      var publicKey = storj.KeyPair().getPublicKey();
      PublicKey.create({
        _id: 'user@domain.tld'
      }, publicKey, function(err, pubkey) {
        expect(err).to.not.be.instanceOf(Error);
        const keys = Object.keys(pubkey.toObject());
        expect(keys).to.not.contain('__v', '_id');
        expect(keys).to.contain('key');
        done();
      });
    });

  });

});
