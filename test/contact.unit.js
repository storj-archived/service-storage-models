'use strict';

const async = require('async');
const expect = require('chai').expect;
const mongoose = require('mongoose');
const storj = require('storj-lib');

require('mongoose-types').loadTypes(mongoose);

const ContactSchema = require('../lib/models/contact');

var Contact;
var connection;

before(function(done) {
  connection = mongoose.createConnection(
    'mongodb://127.0.0.1:27017/__storj-bridge-test',
    function() {
      Contact = ContactSchema(connection);
      done();
    }
  );
});

after(function(done) {
  Contact.remove({}, function() {
    connection.close(done);
  });
});

describe('Storage/models/Contact', function() {

  describe('#record', function() {

    it('should record the unique contacts by their nodeID', function(done) {
      var nodes = [
        storj.KeyPair().getNodeID(),
        storj.KeyPair().getNodeID(),
        storj.KeyPair().getNodeID()
      ];
      nodes.push(nodes[0]);
      async.each(nodes, function(nodeID, next) {
        Contact.record({
          address: '127.0.0.1',
          port: 1337,
          nodeID: nodeID,
          lastSeen: Date.now()
        }, next);
      }, function(err) {
        expect(err).to.not.be.instanceOf(Error);
        Contact.count({}, function(err, count) {
          expect(count).to.equal(3);
          done();
        });
      });
    });

  });

  describe('#recordPingFailure', function() {

    it('should record a ping failure for a contact by nodeID', function(done) {

      const nodeID = '56e6fa5b4cc4c8b9ed6ab4352e2bcac8c01bb502';
      const lastSeen = Date.now();
      const address = '127.0.0.1';
      const port = 1337;

      function checkContact(contact) {
        expect(contact.port).to.equal(port);
        expect(contact.address).to.equal(address);
        expect(contact.lastSeen.getTime()).to.equal(lastSeen);
        expect(contact.nodeID).to.equal(nodeID);
      }

      Contact.record({
        address: address,
        port: port,
        nodeID: nodeID,
        lastSeen: lastSeen
      }, function(err, contact) {
        if (err) {
          return done(err);
        }

        checkContact(contact);

        Contact.recordPingFailure(nodeID, function(err, result) {
          if (err) {
            return done(err);
          }
          expect(result.ok).to.equal(1);
          expect(result.nModified).to.equal(1);
          expect(result.n).to.equal(1);

          Contact.findOne({_id: nodeID}, function(err, contact) {
            if (err) {
              return done(err);
            }
            expect(contact.lastPingFailure.getTime())
              .to.be.above(Date.now() - 5000);
            checkContact(contact);
            done();
          });
        });

      });
    });
  });

  describe('#recordResponseTime', function() {

    it('will throw if number is not finite (NaN)', function() {
      const contact = new Contact({});
      expect(function() {
        contact.recordResponseTime(NaN);
      }).to.throw('Assertion');
    });

    it('will throw if number is not finite (Infinity)', function() {
      const contact = new Contact({});
      expect(function() {
        contact.recordResponseTime(Infinity);
      }).to.throw('Assertion');
    });

    it('will throw if number is not finite (string)', function() {
      const contact = new Contact({});
      expect(function() {
        contact.recordResponseTime('2000');
      }).to.throw('Assertion');
    });

    it('will start using 10s with 1000 reqs as period', function() {
      const contact = new Contact({});
      contact.recordResponseTime(400);
      expect(Math.round(contact.responseTime)).to.equal(9981);
    });

    it('will decrease response times with slow response', function() {
      const contact = new Contact({});
      contact.recordResponseTime(15000);
      expect(contact.responseTime).to.be.above(10000);
    });

    it('will improve response times with a fast response', function() {
      const contact = new Contact({});
      contact.recordResponseTime(100);
      expect(contact.responseTime).to.be.below(10000);
    });

    it('will improve response times with many fast responses', function() {
      const contact = new Contact({});
      let c = 0;
      while (c <= 5000) {
        contact.recordResponseTime(100);
        c += 1;
      }
      expect(Math.round(contact.responseTime)).to.equal(100);
    });

    it('will decrease response times with many slow responses', function() {
      const contact = new Contact({});
      let c = 0;
      while (c <= 5000) {
        contact.recordResponseTime(100);
        c += 1;
      }
      expect(Math.round(contact.responseTime)).to.equal(100);
      c = 0;
      while (c <= 5000) {
        contact.recordResponseTime(10000);
        c += 1;
      }
      expect(Math.round(contact.responseTime)).to.equal(10000);
    });
  });

  describe('#recall', function() {

    it('should recall the last N seen contacts', function(done) {
      Contact.recall(2, function(err, contacts) {
        expect(err).to.equal(null);
        expect(contacts).to.have.lengthOf(2);
        done();
      });
    });

  });

});
