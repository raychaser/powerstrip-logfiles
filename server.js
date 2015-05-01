var concat = require('concat-stream');
var Response = require('./response');

module.exports = function(opts) {
  opts = opts || {};

  function debug(s) {
    if (opts.verbose || (process.env.VERBOSE && process.env.VERBOSE != "")) {
      console.log(s);
    }
  }

  return function(req, res) {
    req.pipe(concat(function(body) {

      if (!body) {
        res.statusCode = 500;
        res.end('No POST body found');
        return;
      }

      // Parse the response body
      body = JSON.parse(body.toString());
      var response = Response(opts.root, opts.verbose, body);

      // No response, error
      if (!response) {
        console.log('Error:  No Type found in body');
        res.statusCode = 500;
        res.end('No Type found in body');
        return;
      };

      // Finish up the processing.
      res.setHeader('Content-type', 'application/json');
      res.end(JSON.stringify(response, null, 4));
    }));
  }
}