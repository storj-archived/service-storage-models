'use strict';

// const storj = require('storj-lib');
const expect = require('chai').expect;
const mongoose = require('mongoose');
const storj = require('storj-lib');

require('mongoose-types').loadTypes(mongoose);

const MirrorSchema = require('../lib/models/mirror');
const ContactSchema = require('../lib/models/contact');

var Mirror;
var Contact;
var connection;

before(function(done) {
  connection = mongoose.createConnection(
    'mongodb://127.0.0.1:27017/__storj-bridge-test',
    function() {
      Mirror = MirrorSchema(connection);
      Contact = ContactSchema(connection);
      done();
    }
  );
});

after(function(done) {
  Mirror.remove({}, function() {
    Contact.remove({}, function() {
      connection.close(done);
    });
  });
});

describe('Storage/models/Mirror', function() {

  describe('#create', function() {

    it('should fail without contract', function(done) {
      Mirror.create({}, {}, function(err, mirror) {
        expect(err).to.be.an.instanceOf(Error);
        expect(mirror).to.be.undefined;
        done();
      });
    });

    // NB: How to make Contract? No Contract model
    it ('should fail without contact', function(done) {
      Mirror.create({ data_hash: 'data_hash' }, {}, function(err, mirror) {
        expect(err).to.be.an.instanceOf(Error);
        expect(mirror).to.be.undefined;
        done();
      });
    });

    // NB: How to make Contract? No Contract model
    it('should create with default props', function(done) {
      Contact.record({
        address: '127.0.0.1',
        port: 1337,
        nodeID: storj.KeyPair().getNodeID(),
        lastSeen: Date.now()
      }, function(err, contact) {
        Mirror.create({ data_hash: 'data_hash' }, contact, function(err, mirror) {
          expect(err).to.not.be.an.instanceOf(Error);
          // need to check for type of hash?
          expect(mirror.shardHash).to.be.a('string');
          expect(mirror.contact).to.be.a('string');
          expect(mirror.contract).to.be.an('object');
          expect(mirror.isEstablished).to.be.false;
          done();
        });
      });
    });

  });

});
