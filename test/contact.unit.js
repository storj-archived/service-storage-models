'use strict';

const sinon = require('sinon');
const async = require('async');
const expect = require('chai').expect;
const errors = require('storj-service-error-types');
const mongoose = require('mongoose');
const storj = require('storj-lib');

/*jshint maxstatements: 100 */

require('mongoose-types').loadTypes(mongoose);

const ContactSchema = require('../lib/models/contact');

var Contact;
var connection;

before(function(done) {
  connection = mongoose.createConnection(
    'mongodb://127.0.0.1:27017/__storj-bridge-test',
    function() {
      Contact = ContactSchema(connection);
      Contact.remove({}, function() {
        done();
      });
    }
  );
});

after(function(done) {
  connection.close(done);
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
          lastSeen: Date.now(),
          spaceAvailable: true
        }, next);
      }, function(err) {
        if (err) {
          return done(err);
        }
        Contact.count({}, function(err, count) {
          expect(count).to.equal(3);

          Contact.findOne({_id: nodes[0]}, (err, contact) => {
            if (err) {
              return done(err);
            }
            expect(contact.spaceAvailable).to.equal(true);
            expect(contact.responseTime).to.equal(undefined);
            done();
          });
        });
      });
    });

    it('should not record with empty address', function(done) {
      Contact.record({
        port: 1337,
        nodeID: storj.KeyPair().getNodeID(),
        lastSeen: Date.now(),
        spaceAvailable: true
      }, function(err) {
        expect(err);
        expect(err).to.be.instanceOf(errors.BadRequestError);
        expect(err.message).to.equal('Address is expected for contact');
        done();
      });
    });

    it('should record with a responseTime', function(done) {
      const nodeID = storj.KeyPair().getNodeID();
      Contact.record({
        address: '127.0.0.1',
        port: 1337,
        nodeID: nodeID,
        lastSeen: Date.now(),
        responseTime: 10000,
        spaceAvailable: true
      }, (err) => {
        if (err) {
          return done(err);
        }
        Contact.findOne({_id: nodeID}, (err, contact) => {
          if (err) {
            return done(err);
          }
          expect(contact.responseTime).to.equal(10000);
          done();
        });
      });
    });

    it('it should not give validation error', function(done) {
      const data = {
        nodeID: '082305b1b4119cf393a8ad392e45cb2b8abd8e43',
        protocol: '0.7.0',
        address: '154.220.116.201',
        port: 18078,
        lastSeen: 1465599426699
      };
      Contact.record(data, function(err, contact) {
        if (err) {
          return done(err);
        }
        contact.save((err) => {
          if (err) {
            return done(err);
          }
          done();
        });
      });
    });

    it('can be called twice', function(done) {
      const data = {
        nodeID: 'bd0ce272eb2dd2e2927b7b0956ecbce32ff65d38',
        protocol: '0.7.0',
        address: '154.220.116.201',
        port: 18078,
        lastSeen: 1465599426699
      };
      Contact.record(data, (err, contact1) => {
        if (err) {
          return done(err);
        }

        Contact.record(data, (err, contact2) => {
          expect(contact2.toObject()).to.eql(contact1.toObject());
          done();
        });

      });
    });

  });

  describe('#recordPoints', function() {
    const sandbox = sinon.sandbox.create();
    afterEach(() => sandbox.restore());

    it('it should not go above maximum', function() {
      const contact = new Contact({
        lastSeen: Date.now(),
        reputation: 4900
      });
      contact.recordPoints(1000);
      expect(contact.reputation).to.equal(5000);
    });
    it('it should not go below minimum', function() {
      const contact = new Contact({
        lastSeen: Date.now(),
        reputation: 10
      });
      contact.recordPoints(-100);
      expect(contact.reputation).to.equal(0);
    });
    it('should increment points', function() {
      const contact = new Contact({
        lastSeen: Date.now(),
        reputation: 1000
      });
      contact.recordPoints(10);
      expect(contact.reputation).to.equal(1010);
    });
    it('should decrement points', function() {
      const contact = new Contact({
        lastSeen: Date.now(),
        reputation: 1000
      });
      contact.recordPoints(-10);
      expect(contact.reputation).to.equal(990);
    });
  });

  describe('#recordTimeoutFailure', function() {
    const sandbox = sinon.sandbox.create();
    afterEach(() => sandbox.restore());

    it('will set last timeout', function() {
      const contact = new Contact({});
      contact.recordTimeoutFailure();

      expect(contact.lastTimeout).to.be.above(Date.now() - 5000);
      expect(contact.lastTimeout).to.be.below(Date.now() + 5000);

    });

    it('will set timeout rate on repeat timeout failures', function() {
      const clock = sandbox.useFakeTimers();
      const contact = new Contact({
        lastSeen: Date.now()
      });

      clock.tick(600000); // 10 min
      contact.recordTimeoutFailure();

      clock.tick(600000); // 10 min
      contact.recordTimeoutFailure();

      expect(contact.timeoutRate.toFixed(4)).to.equal('0.0069');
    });

    it('0.5 after 12 hours of failure', function() {
      const clock = sandbox.useFakeTimers();
      const contact = new Contact({
        lastSeen: Date.now()
      });

      clock.tick(600000); // 10 min
      contact.recordTimeoutFailure();

      // 12 repeated failures, each over an hour
      for (var i = 0; i < 12; i++) {
        clock.tick(3600000); // 1 hour
        contact.recordTimeoutFailure();
      }

      expect(contact.timeoutRate.toFixed(4)).to.equal('0.5000');
    });

    it('1 after 24 hours of failure', function() {
      const clock = sandbox.useFakeTimers();
      const contact = new Contact({
        lastSeen: Date.now()
      });

      clock.tick(600000); // 10 min
      contact.recordTimeoutFailure();

      clock.tick(600000); // 10 min
      contact.recordTimeoutFailure();

      // 24 repeated failures, each over an hour
      for (var i = 0; i < 24; i++) {
        clock.tick(3600000); // 1 hour
        contact.recordTimeoutFailure();
      }

      expect(contact.timeoutRate.toFixed(4)).to.equal('1.0000');
    });

    it('0.45 after 12 hours of failure (w/ sparce success)', function() {
      const clock = sandbox.useFakeTimers();
      const contact = new Contact({
        lastSeen: Date.now()
      });

      // 10 minutes passed by before there was the first timeout failure
      clock.tick(600000);
      contact.recordTimeoutFailure();

      // And then 6 repeated failures
      for (let i = 0; i < 6; i++) {
        clock.tick(3600000); // 1 hour
        contact.recordTimeoutFailure();
      }

      // 10 minutes passed and there was a successful query
      clock.tick(600000);
      contact.lastSeen = Date.now();

      // And then again, followed by 6 repeated failures
      for (let i = 0; i < 6; i++) {
        clock.tick(3600000);
        contact.recordTimeoutFailure();
      }

      expect(contact.timeoutRate.toFixed(2)).to.equal('0.45');
    });

    it('will reset after 24 hours', function() {
      const clock = sandbox.useFakeTimers();
      const contact = new Contact({
        lastSeen: Date.now()
      });

      // 10 minutes passed by before there was the first timeout failure
      clock.tick(600000);
      contact.recordTimeoutFailure();

      // And then 6 repeated failures
      for (let i = 0; i < 6; i++) {
        clock.tick(3600000); // 1 hour
        contact.recordTimeoutFailure();
      }

      expect(contact.timeoutRate.toFixed(2)).to.equal('0.25');

      // 24 hours passed with successful queries
      for (let i = 0; i < 24; i++) {
        clock.tick(3600000); // 1 hour
        contact.lastSeen = Date.now();
      }

      // And then again, followed by 2 repeated failures
      for (let i = 0; i < 2; i++) {
        clock.tick(3600000);
        contact.recordTimeoutFailure();
      }

      expect(contact.timeoutRate.toFixed(2)).to.equal('0.04');
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

  describe('#updateLastContractSent', function() {
    const sandbox = sinon.sandbox.create();
    afterEach(() => sandbox.restore());

    it('will update the last contract sent time', function(done) {
      let clock = sandbox.useFakeTimers();
      let nodeID = storj.KeyPair().getNodeID();
      let now = Date.now();

      Contact.record({
        address: '127.0.0.12',
        port: 3943,
        nodeID: nodeID,
        lastSeen: now
      }, (err, contact) => {
        if (err) {
          return done(err);
        }

        expect(contact.lastContractSent).to.equal(undefined);
        clock.tick(1000);

        Contact.updateLastContractSent(contact._id, (err) => {
          if (err) {
            return done(err);
          }

          Contact.findOne({_id: contact._id}, (err, _contact) => {
            if (err) {
              return done(err);
            }
            expect(_contact.lastContractSent).to.equal(1000);
            expect(_contact.address).to.equal('127.0.0.12');
            expect(_contact.port).to.equal(3943);
            expect(_contact.nodeID).to.equal(nodeID);
            expect(_contact.lastSeen.getTime()).to.equal(0);
            done();
          });
        });
      });
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

  describe('#toObject', function() {

    it('should contain specified properties + virtuals', function(done) {
      const contact = new Contact({
        _id: storj.KeyPair().getNodeID(),
        address: '127.0.0.1',
        port: 1337,
        lastSeen: Date.now(),
        spaceAvailable: true
      });
      const contactKeys = Object.keys(contact.toObject());
      expect(contactKeys).to.contain('nodeID');
      expect(contactKeys).to.not.contain('__v', '_id', 'id');
      done();
    });

  });

});
