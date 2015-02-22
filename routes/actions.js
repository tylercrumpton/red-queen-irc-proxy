var irc = require('irc');
var config = module.parent.config
var redis = require('redis');
var restify = require('restify');
var r = redis.createClient();
var http = require('http');
var async = require('async');
var KeyTypeEnum = Object.freeze({MESSAGE:"msg",COMMAND:"cmd",ADMIN:"adm"});

console.log("Connecting to server: " + config.connection.host);

var client = new irc.Client(config.connection.host, config.bot.nick, {
  channels: config.channels
});

var matchedFilter = null;
function performAction(err) {
  console.log("DONE");
  // If matchedFilter != null, then it will contain the matched filter object at this point
  if (matchedFilter != null) {
    console.log("Filter matched, performing action.");
    // Perform the action set by the filter
    http.get("http://"+matchedFilter.action, function(res) {
      console.log("Got response: " + res.statusCode);
    }).on('error', function(e) {
      console.log("Got error: " + e.message);
    });
  }

}

client.addListener('message', function (nick, to, text, message) {
  //console.log(nick + ' => ' + to + ': ' + text);
  if (text == "!help" || text == "!rq") {
    client.say(to, irc.colors.wrap('dark_red','Just one byte, one scratch from these creatures is sufficient. And then, you become one of them. (For more info, check http://restirc.tylercrumpton.com/docs/)'));
  } else if (text.charAt(0) === '!') { 
    // Strip the bang:
    var command = text.substr(1);
    // Split text into words:
    var commandArray = command.split(' ');
    // Remove empty items:
    commandArray = commandArray.filter(Boolean);
    console.log("Saw command in " + to + ": " + commandArray);
    // Loop through each rq:irc:command:filter:* command filter:
    r.keys("rq:irc:command:filter:*", function (err, commandFilterKeys) {
      console.log(commandFilterKeys.length + " stored commands:");
      var arguments = {};
      //commandFilterKeys.forEach(function (i) {
      async.each(commandFilterKeys, function(i) {
        r.get(i, function(error, commandFilter) {
          console.log(" Checking against --> " + commandFilter);
          // Loop through each word in command filter:
          var i = 0;
          var parsedCommand = JSON.parse(commandFilter);
          parsedCommand.command.some(function (filterWord) {
            if (/^\[.*\]$/.test(filterWord)){  //if filterWord is in [] brackets
              console.log('  - Matched "' + filterWord + '"');
              // If filter word is last word grab all of the remaining words:
              if (i == parsedCommand.command.length - 1) {
                if (matchedFilter == null || parsedCommand.command.length > matchedFilter.length) {
                  // Push rest of command to arg array as single string:
                  arguments[filterWord] = commandArray[i];
                  for (++i; i<commandArray.length; ++i) {
                    arguments[filterWord] += ' ' + commandArray[i];
                  }
                  console.log('   - Storing argument "' + arguments[filterWord] + '" -> ' + filterWord);
                  console.log('  - Full command match success');
                  console.log('  - New longest match (' + parsedCommand.command.length + ')');
                  matchedFilter = parsedCommand;
                } else {
                  console.log('  - Full command match success, but shorter than another match');
                }
              }
              else { // If not the last word, just grab one word:
                console.log('   - Storing argument "' + commandArray[i] + '" -> ' + filterWord);
                arguments[filterWord]=commandArray[i];
              }
            } else if (commandArray[i] == filterWord) {
              // If filterWord word is last word:
              console.log('  - Matched "' + filterWord + '"');
              if (i == commandArray.length - 1 && i == parsedCommand.command.length - 1) {
                console.log('  - Full command match success');
                if (matchedFilter == null || parsedCommand.command.length > matchedFilter.length) {
                  console.log('  - New longest match (' + parsedCommand.command.length + ')');
                  matchedFilter = parsedCommand;
                } else {
                  console.log('  - Full command match success, but shorter than another match');
                }
              } else if  (i == commandArray.length - 1 || i == parsedCommand.command.length - 1) {
                console.log('  - Match failed: Command length does not match filter.');
              }
            } else {
              console.log('  - Failed to match "' + filterWord + '"');
              return true; // Break loop
            }
            ++i;
            return false; //Don't break the loop
          });
        });
      }, performAction);
    });
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
    return next(new restify.MissingParameterError("No POST body found."));
  }

  if (data == {}) {
    return next(new restify.MissingParameterError("Parsed POST body was empty. (Hint: You need to use double-quotes in the JSON)"));
  }
 
  if (data.channel == null) {
    data.channel = "#makerslocal";
  }
  if (apiKey == null) {
    return next(new restify.MissingParameterError("No API key provided."));
  }
  if (data.message == null) {
    return next(new restify.MissingParameterError("No message provided."));
  }
  
  checkApiKey(KeyTypeEnum.MESSAGE, apiKey, function(err, username) {     
    if (username == null && data.channel != "##rqtest") {
      return next(new restify.NotAuthorizedError("Invalid API key."));
    }
    else if (!isValidChannel(data.channel)) {
      return next(new restify.InvalidArgumentError("'" + data.channel + "' is not a channel in Red Queen's config."));
    }
    else {
      console.log("rq:irc:msg:key:"+ apiKey + " belongs to " + username);
      console.log('Posting message: ' + JSON.stringify(data));
      if (data.isaction) {
        client.action(data.channel, irc.colors.wrap('dark_red',data.message));
        res.send("Success: Sent action " +  data.channel + ": '" + data.message + "'");
      }
      else {
        client.say(data.channel, irc.colors.wrap('dark_red',data.message));
        res.send("Success: Sent message " +  data.channel + ": '" + data.message + "'");
      }
    }
  });
}

exports.listKeys = function(req, res, next) {
  var data = req.body;
  var apiKey = req.header('API-Key');
  checkApiKey(KeyTypeEnum.ADMIN, apiKey, function(err, adminName) {   
    if (adminName == null) {
      return next(new restify.NotAuthorizedError("Invalid admin key."));
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
    return next(new restify.MissingParameterError("No API key provided."));
  }
  if (data.command == null) {
    return next(new restify.MissingParameterError("No command filter provided."));
  }
  if (data.action == null) {
    return next(new restify.MissingParameterError("No command action provided."));
  }

  checkApiKey(KeyTypeEnum.COMMAND, apiKey, function(err, username) {  
    if (username == null && data.channel != "##rqtest") {
      return next(new restify.NotAuthorizedError("Invalid API key."));
    }
    else if (!isValidChannel(data.channel)) {
      return next(new restify.InvalidArgumentError("'" + data.channel + "' is not a channel in Red Queen's config."));
    }
    else {
      console.log("Key "+ apiKey + " belongs to " + username);
      var pattern = analyzePattern(data.command);
      if (pattern != null) {
        console.log('Registering command ' + JSON.stringify(pattern) + ' on channel ' + data.channel);
        r.incr('nextid', function(err, id) {
          var commandObject = {"owner":username, "command":pattern, "action":data.action, "channel":data.channel};
          r.set('rq:irc:command:filter:'+id, JSON.stringify(commandObject), function(){
            var response = {"id":id, "owner":username, "pattern":pattern, "action":data.action, "channel":data.channel};
            res.send(response);
          });
        });
      }
      else {
        return next(new restify.InvalidArgumentError("Bad command pattern."));
      }
    }
  });
}

function isValidChannel(name) {
    return ( name.indexOf('#') == 0 &&              // Starts with an octothorpe
             config.channels.indexOf(name) > -1 );  // Is a channel that RQ is set to be in
}

function analyzePattern(pattern) {
  // Convert to lowercase:
  var newpattern = pattern.toLowerCase();
  // Strip this first '!' if there is one
  if (newpattern.charAt(0) === '!')  {
    newpattern = newpattern.substr(1);
  }
  // Split into words:
  var arr = newpattern.split(' ');
  // Remove empty items:
  arr = arr.filter(Boolean);
  // Make sure items are valid:
  var validPattern = /^(\w*|\[\w*\])$/
  var allValid = arr.every(function (item) {
    return validPattern.test(item);
  });
  if (allValid) {
    return arr;
  } else {
    return null;
  }
}

function checkApiKey(keyType, key, callback) {
  if (keyType == KeyTypeEnum.MESSAGE) {
    console.info("Looking up MESSAGE api-key: " + key);
    r.get('rq:irc:msg:key:' + key, callback); 
  } else if (keyType == KeyTypeEnum.COMMAND) {
    console.info("Looking up COMMAND api-key: " + key);
    r.get('rq:irc:commands:key:' + key, callback);
  } else if (keyType == KeyTypeEnum.ADMIN) {
    console.info("Looking up ADMIN api-key: " + key);
    r.get('rq:irc:admin:key:' + key, callback);
  } else {
    console.error("Invalid keyType");
    callback("Invalid API key type", null);
  }
}
