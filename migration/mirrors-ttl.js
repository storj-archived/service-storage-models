var addCreatedFromContractStart = function() {
  var cursor = db.mirrors.find({created: { $exists: false }});

  while(cursor.hasNext()) {

    var doc = cursor.next();
    var id = doc._id;
    var created = doc.contract.store_begin;
    print("updating id: " + id + " with created: " + created);
    var result = db.mirrors.update({
      _id: id
    }, {
      $set: {
        created: new Date(created)
      }
    });

    if (result.nModified) {
      print("updated id: " + id);
    }

  }

};

addCreatedFromContractStart();
