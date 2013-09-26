var Twit    = require('twit'),
    fs = require('fs'),
    counter = 0,
    nstore = require('nstore');
    express = require('express'),
    app     = express(),
    config = require('./config.js'),
    dbPath = 'data/data.db',
    history = new Array(); 
    command       = process.argv[2],
    arguments     = process.argv.splice(3),
    arg           = arguments,
    woeid         = 1,
    DST           = 1,
    amount        = 10,
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

app.use('/', express.static(__dirname + '/'));

app.get('/', function(req, res){
  res.send(history);
});


switch(command){
  case "streams":
    check_arguments('Enter one or more keywords to filter the stream',streams(arg));
    break;
  case "stream":
    check_arguments('Enter one or more keywords to filter the stream',stream(arg));
    break;
  case "search":
    check_arguments('Enter one or more keywords to search for',search(arg));
    break;
  case "trends":
    check_arguments('Enter a region, 1 is worldwide, 2 is Roma',trends(arg[0]));
    break;
  default:
    console.log('Usage: node app.js <command> <arguments>');
    console.log('<command> = search / stream / lookup / trends / dump'); 
    console.log('<arguments> = additional keywords/arguments');
    process.exit(1);
}

function check_arguments(text,callback){
  if (arg.length < 1) {
    console.log(text); 
    process.exit(1);
  } else {

    db = nstore.new(dbPath, function () {
      callback;
    });
  };  
}

Date.prototype.addHours= function(h){
  var copiedDate = new Date(this.getTime());
  copiedDate.setHours(copiedDate.getHours()+h);
  return copiedDate;
}

function addToStorage(searchTerm, item){
  history.push(item);
  var hash = hashCode(searchTerm);
  db.save(null, {category: hash, tweet: item}, function (err, key) {
    if (err) { throw err; }
  });
}

function streams(args){
  var interval = setInterval( function() {
    if(typeof stream!='undefined'){
      stream.stop();
    }
    console.log("now filtering for: "+args[counter]);
    var stream = T.stream('statuses/filter', { track: args[counter] });

    stream.on('tweet', function (tweet) {
      var type = (tweet.retweeted_status) ? 2 : 0;
      if (!type)
      type = (tweet.in_reply_to_user_id || tweet.in_reply_to_status_id) ? 1 : 0;
      view_message({date: tweet.created_at, text: tweet.text, lang: tweet.user.lang, user: tweet.user.screen_name, is: type});
      addToStorage(args[counter], tweet.text);
    }).on('limit', function (limitMessage) {
      console.log(limitMessage);
    }).on('delete', function (deleteMessage) {
      console.log(deleteMessage);
    }).on('disconnect', function (disconnectMessage) {
      console.log(disconnectMessage);
    });

    counter++;
    if (counter >= args.length) {
      counter=0;
    }
  }, 2800);
};

function view_message(body){
  var msg     = body.text,
      time    = new Date(body.date).addHours(DST).toISOString().replace(/T/, ' ').replace(/\..+/, ''),
      i=0;
  for(var word in arg){
    r = new RegExp('(' + arg[word].replace(/[A-z]+:(.*)/, '$1').split(' ').join('|') + ')','ig');
    i++;
  }
  console.log([time,  body.lang, body.user, ['--','RP','RT'][body.is], msg]); 
}

function show_error(err){
  errors = JSON.parse(err.data);
  console.log(errors.errors[0].message);
}


function search(args){
  T.get('search/tweets', { q: args.join(' OR '), count: amount }, function(err, reply) {
    if (err && err.data) {
      show_error(err);return false;
    };
    for (var i=0; i < reply.statuses.length; i++) {
      processTweet(reply.statuses[i]);
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

hashCode = function(str){
  var hash = 0;
  if (str.length == 0) return hash;
  for (i = 0; i < str.length; i++) {
    char = str.charCodeAt(i);
    hash = ((hash<<5)-hash)+char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

//  Credits: @JvdMeulen && @j3lte
//  Credits: @J3lte
