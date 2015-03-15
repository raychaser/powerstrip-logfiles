var concat = require('concat-stream');
var Response = require('./response');

module.exports = function(opts) {
  opts = opts || {};
  return function(req, res) {
    req.pipe(concat(function(body) {

      if (!body) {
        res.statusCode = 500;
        res.end('No POST body found');
        return;
      }

      body = JSON.parse(body.toString());
      var response = Response(opts.root, opts.verbose, body);

      if (!response) {
        console.log('Error:  No Type found in body');
        res.statusCode = 500;
        res.end('No Type found in body');
        return;
      }
      res.setHeader('Content-type', 'application/json');
      res.end(JSON.stringify(response, null, 4));
    }));
  }
}