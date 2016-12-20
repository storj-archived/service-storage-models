'use strict';

const expect = require('chai').expect;
const mongoose = require('mongoose');

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
      done();
    }
  );
});

after(function(done) {
  UserNonce.remove({}, function() {
    User.remove({}, function() {
      connection.close(done);
    })
  });
});

describe('Storage/models/UserNonce', function() {

  describe('#create', function() {

    it('should create a user nonce with correct props', function(done) {
      User.findOne({ _id: 'user@domain.tld' }, function(err, user) {
        var info = {
          user: user._id,
          nonce: 'i am a nonce'
        };
        var newUserNonce = new UserNonce(info);

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
      User.findOne({ _id: 'user@domain.tld' }, function(err, user) {
        var info = {
          user: user._id,
          nonce: 'i am a nonce'
        };
        var newUserNonce = new UserNonce(info);

        newUserNonce.save(function(err, userNonce) {
          expect(err).to.be.an.instanceOf(Error);
          expect(err.code).to.equal(11000);
          done();
        });
      });
    });

  });

});
