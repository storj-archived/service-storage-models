'use strict';

const Mongoose = require('mongoose');
const Schema = Mongoose.Schema;
const storj = require('storj-lib');

const FullAudit = new Schema({
  farmer_id:  {
    type: String,
    required: true
  },
  data_hash: {
    type: String,
    required: true
  },
  root: {
    type: String,
    required: true
  },
  depth: {
    type: String,
    required: true
  },
  challenge: {
    type: String,
    required: true
  },
  ts: {
    type: Date,
    required: true,
    index: true
  },
  processing: {
    type: Boolean
  },
  passed: {
    type: Boolean
  }
});

FullAudit.set('toObject', {
  transform: function(doc, ret) {
    ret = {
      farmer_id: doc.farmer_id,
      data_hash: doc.data_hash,
      ts: doc.ts,
      passed: doc.passed
    };
  }
});

FullAudit.statics.scheduleFullAuditsFromShard = function(
  shardModel,
  hashes,
  callback
) {
  shardModel.find({hash: {$in: hashes}}, (err, shards) => {
    let auditJobs = [];
    let auditDict  = {};
    let squish = (elem) =>  {
      let elemKeys = Object.keys(elem);
      elemKeys.forEach((key) => {
        if(key !== elem.nodeID) {
          auditDict[elem.nodeID][key] = elem[key];
        }
      });
    };

    shards.forEach((shard) => {
      shard.contracts.forEach(squish);
      shard.challenges.forEach(squish);
      shard.trees.forEach(squish);
    });

    for(let node in auditDict) {
      let auditData = storj.AuditStream.fromRecords(
        node.challenges,
        node.tree
      );

      auditData = auditData.getPrivateRecord();

      let job = {
          start: node.contract.store_begin,
          end: node.contract.store_end,
          farmer_id: node.contract.farmer_id,
          data_hash: node.contract.data_hash,
          root: auditData.root,
          depth: auditData.depth,
          challenges: auditData.challenges
      };

      auditJobs.push(job);
    }

    return FullAudit.scheduleFullAudits(auditJobs, null, callback);
  });
};

FullAudit.statics.scheduleFullAudits = function(
  opts,
  scheduleTransformFn,
  callback
) {
  let auditJobs = [];
  let optsArr = [];

  if(opts instanceof Array === false) {
    optsArr.push(opts);
  } else {
    optsArr = opts;
  }

  scheduleTransformFn = scheduleTransformFn || this.defaultScheduleTransform;
  optsArr.forEach((shard) => {
    shard.challenges.forEach((challenge, ind) => {
      let auditJob = {
        farmer_id: shard.farmer_id,
        data_hash: shard.data_hash,
        root: shard.root,
        depth: shard.depth,
        challenge: challenge,
        ts: scheduleTransformFn(shard, ind)
      };

      auditJobs.push(auditJob);
    });
  });

  return this.insertMany(auditJobs, callback);
};

FullAudit.statics.defaultScheduleTransform = function(opts, ind) {
  var auditOutgoingTime;
  var duration = opts.end - opts.start;
  var increment = duration / opts.challenges.length;

  auditOutgoingTime = Math.round(opts.start + (increment * (ind+1)));
  return auditOutgoingTime;
};

FullAudit.statics.popReadyAudits = function(callback) {
  var updateQuery = {
    ts: {
      $lte: Date.now()
    },
    processing: {
      $exists: false
    },
    passed: {
      $exists: false
    }
  };

  var updateOperation = {
    $set: {
      processing: true,
      qReturned: false
    }
  };

  var updateOptions = {
    multi: true
  };

  this.update(updateQuery, updateOperation, updateOptions, () => {
    var findQuery = {
      processing: true,
      passed: {
        $exists: false
      }
    };

    //Do not use toObject here, use lean: ~3X speed without mongoose docs.
    var findProjection =  {
      processing: false,
      passed: false
    };

    return callback(this.find(
      findQuery,
      findProjection
    ).lean().cursor());

  });
};

FullAudit.statics.handleAuditResult = function(auditId, result, callback) {
  var updateQuery = {
    _id: auditId
  };

  var updateOperation = {
    $set: {
      passed: result
    },
    $unset: {
      processing: ''
    }
  };

  return this.update(updateQuery, updateOperation, callback);
};

FullAudit.statics.removeFullAuditByHash = function(hashes, callback) {
  this.remove({
    data_hash: {
      $in: hashes
    },
    processing: false,
    passed: {
      $exists: false
    }}, callback);
};


module.exports = function(connection) {
  return connection.model('FullAudit', FullAudit);
};
