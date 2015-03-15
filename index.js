var http = require('http');
var args = require('minimist')(process.argv, {
  alias:{
    p: 'port',
    v: 'verbose',
    r: 'root'
  },
  default:{
    port: 80
  },
  boolean: ['verbose'],
  string: ['root']
})

if (!args.root || args.root == "") {
  console.log("\nNo --root specified. Exiting.\n\n");
  process.exit();
}

if (!args.root.startsWith("/")) {
  console.log("\nOnly absolute paths allowed for --root. Exiting.\n\n");
  process.exit();
}

process.on('SIGINT', function() {
  process.exit();
})

var Server = require('./server');
console.log("Root file path: " + args.root);
var server = http.createServer(Server(args));

server.listen(args.port, function() {
  console.log('Server listening on port: ' + args.port);
  if (args.verbose){
    console.log('Verbose flag is on');
  }
})