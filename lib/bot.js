var argv = require('minimist')(process.argv.slice(2));

if ("config" in argv) {
    module.config = require("./" + argv.config);
    console.log("Loading custom config: " + argv.config);
}
else {
    module.config = require('./config.js');
    console.log('Loading default config.');
}

var restify = require('restify');
var actions = require('../routes/actions');
var bodyParser = require('body-parser');
var fs = require('fs');
var static = require('node-static');


// Setup the static file server
file = new static.Server('../static');

// Setup some https server options
/*
var https_options = {
  key: fs.readFileSync('./server.key'),
  certificate: fs.readFileSync('./server.crt')
};
var server = restify.createServer(https_options);
*/

var server = restify.createServer();

server.use(bodyParser.json());

function testFunction(req,res,next){

    console.log(req.url)
    var serve = restify.serveStatic({
      directory: './static',
      default: 'index.html'
    });

    serve(req,res,next);
}

server.get(/\/blah\/.*/, testFunction);
server.get( /\/docs\/.*/, restify.serveStatic({
                           directory: './static',
                           default: 'index.html'
                          })
);

server.get(  '/status'   , actions.getStatus       );
server.post( '/relay'    , actions.postMessage     );
server.get(  '/keys'     , actions.listKeys        );
server.post( '/keys'     , actions.createKey       );
server.del(  '/keys'     , actions.revokeKey       );
server.post( '/register' , actions.registerCommand );

server.listen(module.config.port);
console.log('Listening on port ' + module.config.port + '...');

