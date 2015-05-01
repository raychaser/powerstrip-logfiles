var http = require('http');

// Commandline argument parsing
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

// Make sure a root path is specified
if (!args.root || args.root == "") {
  if (process.env.ROOT && process.env.ROOT != "") {
    args.root = process.env.ROOT
  } else {
    console.log("\nNo --root specified. Exiting.\n\n");
    process.exit();
  }
}

// Check for absolute root path
if (!args.root.startsWith("/")) {
  console.log("\nOnly absolute paths allowed for --root. Exiting.\n\n");
  process.exit();
}

// Make sure we exit on CTRL-C
process.on('SIGINT', function() {
  process.exit();
})

// Create the HTTP server
var Server = require('./server');
console.log("Root file path: " + args.root);
var server = http.createServer(Server(args));

// Start listening for HTTP requests
server.listen(args.port, function() {
  console.log('Server listening on port: ' + args.port);
  if (args.verbose || (process.env.VERBOSE && process.env.VERBOSE != "")) {
    console.log('Verbose flag is on');
  }
})