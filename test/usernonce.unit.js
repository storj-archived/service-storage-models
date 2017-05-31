'use strict';

const expect = require('chai').expect;
const mongoose = require('mongoose');
const crypto = require('crypto');

require('mongoose-types').loadTypes(mongoose);

const UserNonceSchema = require('../lib/models/usernonce');
const UserSchema = require('../lib/models/user');

var UserNonce;
var User;
var connection;

before(function(done) {
  connection = mongoose.createConnection(
    'mongodb://127.0.0.1:27017/__storj-bridge-test',
    function() {
      UserNonce = UserNonceSchema(connection);
      User = UserSchema(connection);
      UserNonce.remove({}, function() {
        User.remove({}, function() {
          done();
        });
      });
    }
  );
});

after(function(done) {
  connection.close(done);
});

function sha256(i) {
  return crypto.createHash('sha256').update(i).digest('hex');
}

describe('Storage/models/UserNonce', function() {
  const n = '9f7c5d7f20f7e002b59361d9f4d267b3b64903121208ef094203759f9f650d0e';

  before(function(done) {
    User.create('usernonce@tld.com', sha256('pass'), function(err) {
      if (err) {
        return done(err);
      }
      done();
    });
  });

  describe('@constructor', function() {
    it('should fail validation', function(done) {
      const nonce = new UserNonce({
        user: 'nobody@',
        nonce: n
      });
      nonce.save((err) => {
        expect(err).to.be.instanceOf(Error);
        expect(err.message).to.match(/^usernonce validation failed.*/i);
        done();
      });
    });
    it('should NOT fail validation', function(done) {
      const nonce = new UserNonce({
        user: 'somebody@somewhere.com',
        nonce: n
      });
      nonce.save(done);
    });
  });

  describe('#create', function() {

    it('should create a user nonce with correct props', function(done) {
      User.findOne({ _id: 'usernonce@tld.com' }, function(err, user) {
        const info = {
          user: user._id,
          nonce: 'i am a nonce'
        };
        const newUserNonce = new UserNonce(info);

        newUserNonce.save(function(err, userNonce) {
          expect(err).to.not.be.an.instanceOf(Error);
          expect(userNonce.user).to.equal(user._id);
          expect(userNonce.nonce).to.be.a('string');
          expect(userNonce.timestamp).to.be.an.instanceOf(Date);
          done();
        });
      });
    });

    it('should fail if a nonce is duplicated', function(done) {
      User.findOne({ _id: 'usernonce@tld.com' }, function(err, user) {
        const info = {
          user: user._id,
          nonce: 'i am a nonce'
        };
        const newUserNonce = new UserNonce(info);

        newUserNonce.save(function(err) {
          expect(err).to.be.an.instanceOf(Error);
          expect(err.code).to.equal(11000);
          done();
        });
      });
    });

  });

  describe('#toObject', function() {

    it('should contain specified properties', function(done) {
      User.findOne({ _id: 'usernonce@tld.com' }, function(err, user) {
        const info = {
          user: user._id,
          nonce: 'i am a new nonce'
        };
        const newUserNonce = new UserNonce(info);

        newUserNonce.save(function(err, userNonce) {
          expect(err).to.not.be.an.instanceOf(Error);
          const keys = Object.keys(userNonce.toObject());
          expect(keys).to.not.contain('__v', '_id');
          done();
        });
      });
    });

  });

});
