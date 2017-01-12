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
  qProcessing: {
    type: Boolean
  },
  qPassed: {
    type: Boolean
  }
});

FullAudit.set('toObject', {
  transform: function(doc, ret) {
    delete ret.qProcessing;
    delete ret.qPassed;
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
  var udpateQuery = {
    ts: {
      $lte: Date.now()
    },
    qProcessing: {
      $exists: false
    },
    qPassed: {
      $exists: false
    }
  };

  var updateOperation = {
    $set: {
      qProcessing: true,
      qReturned: false
    }
  };

  var updateOptions = {
    multi: true
  };

  this.update(udpateQuery, updateOperation, updateOptions, () => {
    var findQuery = {
      qProcessing: true,
      qPassed: {
        $exists: false
      }
    };

    //Do not use toObject here, use lean: ~3X speed without mongoose docs.
    var findProjection =  {
      qProcessing: false,
      qPassed: false
    };

    return callback(this.find(
      findQuery,
      findProjection
    ).lean().cursor());

  });
};

FullAudit.statics.handleAuditResult = function(auditId, result, callback) {
  var udpateQuery = {
    _id: auditId
  };

  var updateOperation = {
    $set: {
      qPassed: result
    },
    $unset: {
      qProcessing: ''
    }
  };

  return this.update(udpateQuery, updateOperation, callback);
};

module.exports = function(connection) {
  return connection.model('FullAudit', FullAudit);
};
