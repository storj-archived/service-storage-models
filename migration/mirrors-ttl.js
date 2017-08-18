var addCreatedFromContractStart = function() {
  var cursor = db.mirrors.find({created: { $exists: false }});

  function updateNextDocument() {
    if (cursor.hasNext()) {

      var doc = cursor.next();
      var id = doc._id;
      var created = doc.contract.store_begin;
      print("updating id: " + id + " with created: " + created);
      db.mirrors.update({
        _id: id
      }, {
        $set: {
          created: created
        }
      }, (err) => {
        if (err) {
          print(err);
        }
        updateNextDocument();
      });
      
    }
  }
};

addCreatedFromContractStart();
