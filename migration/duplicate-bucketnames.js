var uniqueBucketNames = function() {
  db.buckets.aggregate([
    {
      $group: {
        _id: {
          userName: "$user",
          bucketName: "$name"
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
        var name = data._id.bucketName + ' (' + i + ')';
        print("updating id: " + id + " original: " + data._id.bucketName + " to name: " + name);
        db.buckets.update({ _id: id }, { $set: {name: name} }, (err, result) => {
          print(err || result);
        })
      }      
    })
};

uniqueBucketNames();
