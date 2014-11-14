var irc = require('irc');
var config = module.parent.config
var redis = require('redis');

var r = redis.createClient();

console.log("Connecting to server: " + config.connection.host);

var client = new irc.Client(config.connection.host, config.bot.nick, {
  channels: config.channels
});

client.addListener('message', function (nick, to, text, message) {
  //console.log(nick + ' => ' + to + ': ' + text);
  if (text == "!help" || text == "!rq") {
    client.say(to, irc.colors.wrap('light_red','Just one byte, one scratch from these creatures is sufficient. And then, you become one of them. (For more info, check http://restirc.tylercrumpton.com/docs/)'));
  }
});

client.addListener('pm', function (nick, text, message) {
  //console.log(nick + ' => ME: ' + text);
});

client.addListener('error', function(message) {
  console.log('error: ', message);
});

exports.getStatus = function(req, res, next) {
  console.log('Retrieving status.');
  res.send('running');
}

exports.postMessage = function(req, res, next) {
  var data = req.body;

  console.log("Data:" + JSON.stringify(req.body));

  //var apiKey = req.header('API-Key');
  var apiKey = data.key;
 
  if (data == null) {
    res.send("Error: No POST body found.");
    return;
  }

  if (data == {}) {
    res.send("Error: Parsed POST body was empty. (Hint: You need to use double-quotes in the JSON)");
    return;
  }
 
  if (data.channel == null) {
    data.channel = "#makerslocal";
  }
  if (apiKey == null) {
    res.send("Error: No API key provided.");
    return;
  }
  if (data.message == null) {
    res.send("Error: No message provided.");
    return;
  }

  r.get('rq:irc:msg:key:'+apiKey, function(err, username) {    
    console.log('Looking up rq:irc:msg:key:'+apiKey);
    if (username == null && data.channel != "##rqtest") {
      res.send("Error: Invalid API key.");
    }
    else if (!isValidChannel(data.channel)) {
      res.send("Error: '" + data.channel + "' is not a channel in Red Queen's config.");
    }
    else {
      console.log("rq:irc:msg:key:"+ apiKey + " belongs to " + username);
      console.log('Posting message: ' + JSON.stringify(data));
      if (data.isaction) {
        client.action(data.channel, irc.colors.wrap('light_red',data.message));
        res.send("Success: Sent action " +  data.channel + ": '" + data.message + "'");
      }
      else {
        client.say(data.channel, irc.colors.wrap('light_red',data.message));
        res.send("Success: Sent message " +  data.channel + ": '" + data.message + "'");
      }
    }
  });
}

exports.listKeys = function(req, res, next) {
  var data = req.body;
  var apiKey = req.header('API-Key');
  r.get('rq:irc:admin:key:'+apiKey, function(err, adminName) {    
    if (adminName == null) {
      res.send("Error: Invalid admin key.");
    }
    else {
      console.log("Listing keys for admin user '"+adminName+"'");
      r.keys('rq:irc:msg:key:*', function(err, keyList) {   
        var response = {};
        keyList.forEach(function (key) {
          r.get(key, function(err, username) {
            response[key] = username;
            console.log("get:"+JSON.stringify(response));
          });
          console.log("for:"+JSON.stringify(response));
        });
        console.log("keys:"+JSON.stringify(response));
        res.send(response);
      });
    }
  });
}

exports.createKey = function(req, res, next) {
  var data = req.body;
}

exports.revokeKey = function(req, res, next) {
  var data = req.body;
}

exports.registerCommand = function(req, res, next) {
  var data = req.body;
  var apiKey = data.key;

  if (data.channel == null) {
    data.channel = "#makerslocal";
  }
  if (apiKey == null) {
    res.send("Error: No API key provided.");
    return;
  }
  if (data.command == null) {
    res.send("Error: No command filter provided.");
    return;
  }

  r.get('rq:irc:commands:key:'+apiKey, function(err, username) {    
    console.log('Looking up rq:irc:commands:key:'+apiKey);
    if (username == null && data.channel != "##rqtest") {
      res.send("Error: Invalid API key.");
    }
    else if (!isValidChannel(data.channel)) {
      res.send("Error: '" + data.channel + "' is not a channel in Red Queen's config.");
    }
    else {
      console.log("Key "+ apiKey + " belongs to " + username);
      var pattern = analyzePattern(data.command)
      if (pattern != null) {
        console.log('Registering command: ' + JSON.stringify(pattern.input));
        // TODO register command in redis
      }
      else {
        res.send("Error: Bad command pattern.");
      }
    }
  });
}

function isValidChannel(name) {
    return ( name.indexOf('#') == 0 &&              // Starts with an octothorpe
             config.channels.indexOf(name) > -1 );  // Is a channel that RQ is set to be in
}

function analyzePattern(pattern) {
  var re = /^(!)?(\w+)( \[\w+\]| \w+)*$/;
  return pattern.match(re);
}
