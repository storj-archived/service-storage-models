'use strict';

const expect = require('chai').expect;
const Mongoose = require('mongoose');
const FullAudit = require('../lib/models/full-audit');

var auditModel;
var connection;

before((done) => {
  connection = Mongoose.createConnection(
    'mongodb://127.0.0.1:27017/__storj-bridge-test',
    () => {
      auditModel = FullAudit(connection);
      done();
    }
  );
});

after((done) => {
  auditModel.remove({}, () => {
    connection.close(done);
  });
});

describe('FullAudit', function() {
  this.timeout(10000);
  var returnedFakeAuditsDoc;
  var fakeAuditScheduleObj = {
    start: Date.now(),
    end: Date.now() + 1000,
    farmer_id: 'test',
    data_hash: 'test',
    root: 'test',
    depth: 'test',
    challenges: ['test', 'test', 'test']
  };

  describe('scheduleFullAudits', function() {
    it('should create a schedule of audits', (done) => {
      auditModel.scheduleFullAudits(
        fakeAuditScheduleObj,
        null,
        (err, docsArr) => {
          returnedFakeAuditsDoc = docsArr;
          expect(docsArr.length).to.equal(3);
          done();
        }
      );
    });

    it('should not schedule audits with missing properties', (done) => {
      auditModel.scheduleFullAudits({challenges:[]},
        null,
        (err, docsArr) => {
          expect(err).to.not.be.a('null');
          expect(docsArr).to.be.an('undefined');
          done();
        }
      );
    });

    it('should accept an optional scheduling transform function', (done) => {
      auditModel.scheduleFullAudits(
        fakeAuditScheduleObj,
        function() {
          return 0;
        },
        (err, docsArr) => {
          expect(docsArr[0].ts.getTime()).to.equal(0);
          done();
        }
      );
    });
  });

  describe('defaultScheduleTransform', function() {
    it('should schedule audits at an evenly distributed, rounded, interval',
      () => {
      expect(auditModel.defaultScheduleTransform({
        start: 0,
        end: 9.1,
        challenges: [0,1,2]
      }, 0)).to.equal(3);

      expect(auditModel.defaultScheduleTransform({
        start: 0,
        end: 9.2,
        challenges: [0,1,2]
      }, 1)).to.equal(6);

      expect(auditModel.defaultScheduleTransform({
        start: 0,
        end: 9.3,
        challenges: [0,1,2]
      }, 2)).to.equal(9);
    });
  });

  describe('popReadyAudits', function() {
    it('should return a cursor of all audits with expired timestamps',
      (done) => {
      var docs = [];
      setTimeout(() => {
        auditModel.popReadyAudits((cursor) => {
          cursor.on('data', (doc) => {
            docs.push(doc);
          });
          cursor.on('end', () => {
            expect(docs.length).to.equal(6);
            done();
          });
        });
      }, 1500);
    });
  });

  describe('handleAuditResult', function() {
    it('should update an audit record with its result', (done) => {
      auditModel.handleAuditResult(returnedFakeAuditsDoc[0]._id, false, () => {
        auditModel.findById(returnedFakeAuditsDoc[0]._id, (err, doc) => {
          expect(doc.passed).to.equal(false);
          done();
        });
      });
    });
  });
});
