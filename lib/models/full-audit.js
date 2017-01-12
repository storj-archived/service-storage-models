'use strict';

const Mongoose = require('mongoose');
const Schema = Mongoose.Schema;

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

FullAudit.statics.scheduleFullAudits = function(
  opts,
  scheduleTransformFn,
  callback
) {
  var auditJobs = [];
  scheduleTransformFn = scheduleTransformFn || this.defaultScheduleTransform;
  opts.challenges.forEach((challenge, ind) => {
    let auditJob = {
      farmer_id: opts.farmer_id,
      data_hash: opts.data_hash,
      root: opts.root,
      depth: opts.depth,
      challenge: challenge,
      ts: scheduleTransformFn(opts, ind)
    };

    auditJobs.push(auditJob);
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

module.exports = function(connection) {
  return connection.model('FullAudit', FullAudit);
};
