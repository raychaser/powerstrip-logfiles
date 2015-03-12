var concat = require('concat-stream')
var Response = require('./response')

module.exports = function(opts){
  opts = opts || {}
  return function(req, res){
    req.pipe(concat(function(body){
      if(!body){
        res.statusCode = 500;
        res.end('No POST body found')
        return
      }

      body = JSON.parse(body.toString())

      console.log("\n\nBody:\n")
      console.log(body)
      console.log("\n\n")

      var response = Response(opts.root, body)

      if(!response){
        console.log('Error:  No Type found in body')
        res.statusCode = 500;
        res.end('No Type found in body')
        return
      }
      
      res.setHeader('Content-type', 'application/json')
      res.end(JSON.stringify(response, null, 4))
    }))
  }
}