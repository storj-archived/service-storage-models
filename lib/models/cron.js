'use strict';

const assert = require('assert');
const mongoose = require('mongoose');

const CronJob = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  locked: {
    type: Boolean,
    required: true
  },
  lockedEnd: {
    type: Date,
    required: true
  },
  started: {
    type: Date,
    required: true
  },
  finished: {
    type: Date,
    required: false
  },
  data: {
    type: String,
    required: false
  }
});

CronJob.statics.lock = function(name, expires, callback) {
  const self = this;
  const now = new Date();
  const end = new Date(now.getTime() + expires);
  assert(Number.isInteger(expires), 'Expires argument is expected');

  function isDuplicate(err) {
    return (err && err.code === 11000);
  }

  function getLock(done) {
    const query = {
      name: name,
      locked: false
    };
    const sort = {};
    const update = {
      $set: {
        name: name,
        locked: true,
        lockedEnd: end,
        started: now
      }
    };
    const options = {
      new: true,
      upsert: true,
      writeConcern: 'majority'
    };
    self.collection.findAndModify(query, sort, update, options, (err, res) => {
      if (isDuplicate(err)) {
        return done(null, false);
      } else if (err) {
        return done(err, false);
      }
      done(null, true, res);
    });
  }

  function getLockFromExpired(done) {
    const query = {
      name: name,
      locked: true,
      lockedEnd: {
        $lte: now
      }
    };
    const sort = {};
    const update = {
      $set: {
        name: name,
        locked: true,
        lockedEnd: end,
        started: now
      }
    };
    const options = {
      new: true,
      upsert: true,
      writeConcern: 'majority'
    };
    self.collection.findAndModify(query, sort, update, options, (err, res) => {
      if (isDuplicate(err)) {
        return done(null, false);
      } else if (err) {
        return done(err, false);
      }
      done(null, true, res);
    });
  }

  getLock((err, success, res) => {
    if (err) {
      return callback(err);
    }
    if (!success) {
      return getLockFromExpired(callback);
    }
    callback(err, success, res);
  });
};

module.exports = function(connection) {
  return connection.model('CronJob', CronJob);
};
