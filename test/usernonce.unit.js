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
  before(function(done) {
    User.create('usernonce@tld.com', sha256('pass'), function(err) {
      if (err) {
        return done(err);
      }
      done();
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
