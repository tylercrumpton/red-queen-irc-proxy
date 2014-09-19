var irc = require('irc');
var config = require('../lib/config.js');
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
  //var apiKey = req.header('API-Key');
  var apiKey = data.key;

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

  r.get('api:'+apiKey, function(err, username) {    
    console.log('Looking up api:'+apiKey);
    if (username == null && data.channel != "##rqtest") {
      res.send("Error: Invalid API key.");
    }
    else if (!isChannel(data.channel)) {
      res.send("Error: '" + data.channel + "' is not a valid channel.");
    }
    else {
      console.log("api:"+ apiKey + " belongs to " + username);
      console.log('Posting message to: ' + JSON.stringify(data));
      if (data.isaction) {
        client.action(data.channel, irc.colors.wrap('light_red',data.message));
        res.send("Success: Sent action to " +  data.channel + ": '" + data.message + "'");
      }
      else {
        client.say(data.channel, irc.colors.wrap('light_red',data.message));
        res.send("Success: Sent message to " +  data.channel + ": '" + data.message + "'");
      }
    }
  });
}

exports.listKeys = function(req, res, next) {
  var data = req.body;
  var apiKey = req.header('API-Key');
  r.get('admin:'+apiKey, function(err, adminName) {    
    if (adminName == null) {
      res.send("Error: Invalid admin key.");
    }
    else {
      console.log("Listing keys for admin user '"+adminName+"'");
      r.keys('api:*', function(err, keyList) {   
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

function isChannel(name) {
    return (name.indexOf('#') == 0);
}
