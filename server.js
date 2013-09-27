var Twit    = require('twit'),
    fs = require('fs'),
    counter = 1,
    nstore = require('nstore');
    nstore = nstore.extend(require('nstore/query')());
    express = require('express'),
    app     = express(),
    config = require('./config.js'),
    categories = require('./categories.json'),
    dbPath = 'data/data.db',
    history = new Array(),
    keywords = new Array(),
    command       = process.argv[2],
    arguments     = process.argv.splice(3),
    arg           = arguments,
    db = '',
    T             = new Twit({
      consumer_key: config['consumer_key'],
      consumer_secret: config['consumer_secret'],
      access_token:config['access_token'],
      access_token_secret: config['access_token_secret']
});

app.configure(function () {
  app.use(express.logger('dev')); /* 'default', 'short', 'tiny', 'dev' */
  app.use(express.bodyParser());
});

app.listen(process.env.PORT || 3000, function(){
  console.log("Express server listening on port %d in %s mode", this.address().port, app.settings.env);
});

db = nstore.new(dbPath, function () {
  app.use('/', express.static(__dirname + '/'));

  app.get('/', function(req, res){
    res.send(history);
  });

  app.get('/all', function(req, res){
    db.all(function (err, results) {
      res.send(results);
    })
  });

  app.get('/status', function(req, res){
    var results = new Array();
    db.all(function (err, results) {
      var r = new Array();
      for(var key in results){
        results[key].query!=null ? r.push(results[key].query+' ['+results[key].type+'] ') : null;
      }
      r = r.getUnique();
      res.send(r);
    });
  });

  app.get('/query/:id', function(req, res){
    var results = new Array();
    db.find({query: req.params.id}, function (err, results) {
      res.send(results);
    });
  });

  app.get('/query/:id/last/:minutes', function(req, res){
    var minutes = Date.now() - req.params.minutes * 60000;
    var results = new Array();
    db.find({query: req.params.id, "created >": minutes }, function (err, results) {
      res.json(results);
    });
  });

  //TODO simplified for arduino
  app.get('/squery/:id/last/:minutes', function(req, res){
    var minutes = Date.now() - req.params.minutes * 60000;
    var results = new Array();
    db.find({query: req.params.id, "created >": minutes }, function (err, results) {
      res.json(results.length);
    });
  });

  switch(command){
    case "predefined":
      loadKeywords();
      streamsPredefined();
      var interval = setInterval( function() {
        streamsPredefined();
      }, 9000);
      break;
    case "serve":
      loadKeywords();
      break;
    case "wipe":
      fs.unlink(dbPath, function (err) {
        if (err) throw err;
        console.log('successfully deleted',dbPath);
      });
      break;
    default:
      console.log('<arguments> = additional keywords/arguments');
      process.exit(1);
  }

  function check_arguments(text,callback){
    if (arg.length < 1) {
      console.log(text); 
      process.exit(1);
    } else {

      callback;
    };  
  }

  Date.prototype.addHours= function(h){
    var copiedDate = new Date(this.getTime());
    copiedDate.setHours(copiedDate.getHours()+h);
    return copiedDate;
  }

  function addToStorage(q, item, qtype){
    history.push(item);
    db.save(null, {type: qtype, query: q, tweet: item, created: Date.now()}, function (err, key) {
      if (err) { throw err; }
    });
  }

  function streamsPredefined(){
      if(typeof stream!='undefined'){
        stream.stop();
      }

      var thisKeyword = keywords[counter];
      var name = thisKeyword['name'];
      var type = thisKeyword['type'];
      var query = thisKeyword['query'];

      console.log("now filtering for: "+thisKeyword['name']+" of type "+thisKeyword['type']);
      switch(type){
        case "locations":
          var stream = T.stream('statuses/filter',  {locations:query} );
          break;
        case "keyword":
          var stream = T.stream('statuses/filter',  {track:query} );
          break;
      }

      stream.on('tweet', function (tweet) {
        view_message(tweet);
        addToStorage(name, tweet.text, type);
      }).on('limit', function (limitMessage) {
        console.log(limitMessage);
      }).on('delete', function (deleteMessage) {
        console.log(deleteMessage);
      }).on('disconnect', function (disconnectMessage) {
        console.log(disconnectMessage);
      });

      counter++;
      if (counter >= keywords.length) {
        counter=0;
      }
  };

  function search(args){
    T.get('search/tweets', { q: args.join(' OR '), count: amount }, function(err, reply) {
      if (err && err.data) {
        show_error(err);return false;
      };
      for (var i=0; i < reply.statuses.length; i++) {
        console.log(reply.statuses[i]);
      }
    });
  };

  function trends(id){
    var woeid = 1;
    if (id === '2')
      woeid = 721943;
    T.get('trends/place', { id : woeid }, function(err, reply) {
     if (err){console.log(err); return false}
      console.log('trends for: '+reply[0].locations[0].name+'\r\n');
      for (var i=0; i < reply[0].trends.length; i++) {
        console.log('--> '+ reply[0].trends[i].name);
      };
    });
  };
  function view_message(body){
    console.log(body); 
  }

  function show_error(err){
    errors = JSON.parse(err.data);
    console.log(errors.errors[0].message);
  }

  function loadKeywords(){
    categories['terms'].forEach(function(cat){
      keywords.push(cat);
    })
  }

});

Array.prototype.getUnique = function(){
   var u = {}, a = [];
   for(var i = 0, l = this.length; i < l; ++i){
      if(u.hasOwnProperty(this[i])) {
         continue;
      }
      a.push(this[i]);
      u[this[i]] = 1;
   }
   return a;
}
//  Credits: @JvdMeulen && @j3lte
//  Credits: @J3lte
