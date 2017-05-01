var uniqueBucketEntryNames = function() {
  db.bucketentries.aggregate([
    {
      $group: {
        _id: {
          bucketId: "$bucket",
          fileName: "$name"
        },
        duplicates: {$push: "$_id"},
        count: {$sum: 1}
      }
    },
    {
      $match: {
        count: {$gt: 1}
      }
    }], {allowDiskUse: true}).forEach((data) => {

      for (var i = 0; i < data.duplicates.length; i++) {
        var id = data.duplicates[i];
        var name = data._id.fileName + ' (' + i + ')';
        print("updating id: " + id + " original: " + data._id.fileName + " to name: " + name);
        db.bucketentries.update({ _id: id }, { $set: {name: name} }, (err, result) => {
          print(err || result);
        })
      }
    })
};

uniqueBucketEntryNames();
