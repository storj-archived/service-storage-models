'use strict';

const expect = require('chai').expect;
const mongoose = require('mongoose');

require('mongoose-types').loadTypes(mongoose);

const FarmerProfileSchema = require('../lib/models/farmer-profile');

var FarmerProfile;
var connection;

before(function(done) {
    connection = mongoose.createConnection(
        'mongodb://127.0.0.1:27017/__storj-bridge-test',
        function() {
            FarmerProfile = FarmerProfileSchema(connection);
            done();
        }
    );
});

after(function(done) {
    FarmerProfile.remove({}, function() {
        connection.close(done);
    });
});

describe('Storage/models/Exchange-Report', function() {

    it('should create a farmer profile with default props', function(done) {
        var newFarmerProfile = new FarmerProfile({
            farmerId: 'farmerId',
            profile: {
                failureRate: 0.5
            }
        });

        newFarmerProfile.save(function(err, report) {
            expect(err).to.not.be.an.instanceOf(Error);
            expect(report.created).to.be.an.instanceOf(Date);
            expect(report.profile).to.be.an.instanceOf(Object);
            expect(report.profile.failureRate).to.be.a('number');
            done();
        });

    });

});
