'use strict';

/* jshint expr: true, maxlen: 100 */

const expect = require('chai').expect;
const mongoose = require('mongoose');
const _ = require('lodash');

require('mongoose-types').loadTypes(mongoose);

const ShardSchema = require('../lib/models/shard');

var Shard;
var connection;

before(function(done) {
  connection = mongoose.createConnection(
    'mongodb://127.0.0.1:27017/__storj-bridge-test',
    function() {
      Shard = ShardSchema(connection);
      Shard.remove({}, function() {
        done();
      });
    }
  );
});

after(function(done) {
  connection.close(done);
});

describe('Storage/models/Shard', function() {

  describe('#create', function() {

    it('should create a shard record with the correct hash', function(done) {
      var item = {
        hash: 'fjla93fs9-23892-2sdl@#ds-932049203'
      };
      Shard.create(item, function(err, shard) {
        expect(err).to.not.be.an.instanceOf(Error);
        expect(shard.hash).to.equal(item.hash);
        done();
      });
    });

    it('should create a shard record with modified contracts object', function(done) {
      var item = {
        hash: 'fjla93fs9-23892-2sdl@#ds-932049203',
        contracts: { 0: 'contract1', 1: 'contract2' },
        trees: {},
        challenges: {},
        meta: {}
      };
      Shard.create(item, function(err, shard) {
        expect(err).to.not.be.an.instanceOf(Error);
        expect(shard.contracts).to.be.an('object');
        expect(_.isEqual(item.contracts, shard.contracts)).to.be.true;
        done();
      });
    });

    it('should create a shard record with modified trees object', function(done) {
      var item = {
        hash: 'fjla93fs9-23892-2sdl@#ds-932049203',
        contracts: {},
        trees: { 0: 'leaf1', 1: 'leaf2' },
        challenges: {},
        meta: {}
      };
      Shard.create(item, function(err, shard) {
        expect(err).to.not.be.an.instanceOf(Error);
        expect(shard.trees).to.be.an('object');
        var i = 0;
        _.forEach(shard.trees, (tree, nodeID) => {
          expect(nodeID).to.equal(i.toString());
          expect(tree).to.be.an('array');
          expect(tree[0]).to.equal(item.trees[nodeID]);
          i++;
        });
        done();
      });
    });

    it('should create a shard record with modified challenges object', function(done) {
      var item = {
        hash: 'fjla93fs9-23892-2sdl@#ds-932049203',
        contracts: {},
        trees: {},
        challenges: { 0: 'challenge1', 1: 'challenge2' },
        meta: {}
      };
      Shard.create(item, function(err, shard) {
        expect(err).to.not.be.an.instanceOf(Error);
        expect(shard.challenges).to.be.an('object');
        expect(_.isEqual(item.challenges, shard.challenges)).to.be.true;
        done();
      });
    });

    it('should create a shard record with modified meta object', function(done) {
      var item = {
        hash: 'fjla93fs9-23892-2sdl@#ds-932049203',
        contracts: {},
        trees: {},
        challenges: {},
        meta: { 0: 'meta1', 1: 'meta2' }
      };
      Shard.create(item, function(err, shard) {
        expect(err).to.not.be.an.instanceOf(Error);
        expect(shard.meta).to.be.an('object');
        expect(_.isEqual(item.meta, shard.meta)).to.be.true;
        done();
      });
    });

  });

  describe('#toObject', function() {

    it('should contain specified properties', function(done) {
      const item = {
        hash: 'fjla93fs9-23892-2sdl@#ds-932049203',
        contracts: {},
        trees: {},
        challenges: {},
        meta: { 0: 'meta1', 1: 'meta2' }
      };
      Shard.create(item, function(err, shard) {
        expect(err).to.not.be.an.instanceOf(Error);
        const keys = Object.keys(shard);
        expect(keys).to.not.contain('__v', '_id');
        expect(keys).to.contain(
          'contracts', 'trees', 'challenges', 'meta', 'hash'
        );
        done();
      });
    });

  });

  describe('Indexes', function() {
    before(function(done) {
      const item = {
        hash: '74f20b9ab3f2a1d6970269dde29f494d8a5895f6',
        contracts: {
          '2d2d9991ac279857dc72edca1d8ace90b1fce76d': {
            store_end: 1489085649893
          }
        },
        trees: {},
        challenges: {},
        meta: { 0: 'meta1', 1: 'meta2' }
      };
      Shard.create(item, done);
    });

    it('should have an index for nodeID on contracts', function(done) {
      const query = {
        'contracts.nodeID': '2d2d9991ac279857dc72edca1d8ace90b1fce76d',
      };
      const cursor = Shard.collection.find(query);
      cursor.explain((err, result) => {
        expect(result.queryPlanner.winningPlan.inputStage.indexBounds)
          .to.eql({
            'contracts.nodeID': [
              '["2d2d9991ac279857dc72edca1d8ace90b1fce76d", ' +
                '"2d2d9991ac279857dc72edca1d8ace90b1fce76d"]'
            ]
          });
        done();
      });
    });

    it('should have an index for store_end on contracts', function(done) {
      const query = {
        'contracts.contract.store_end': 1489085649893,
      };
      const cursor = Shard.collection.find(query);
      cursor.explain((err, result) => {
        expect(result.queryPlanner.winningPlan.inputStage.indexBounds)
          .to.eql({
            'contracts.contract.store_end': [
              '[1489085649893.0, 1489085649893.0]'
            ]
          });
        done();
      });
    });

  });

});
