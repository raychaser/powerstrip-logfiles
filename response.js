var fs = require('fs')

module.exports = function(root, verbose, body){

  function S4() {
    return (((1+Math.random())*0x10000)|0).toString(16).substring(1)
  }
  
  function createGuid() {
    return (S4() + S4() + "-" + S4() + "-4" + S4().substr(0,3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase()
  }

  function debug(s) {
    if (verbose) {
      console.log(s)
    }
  }

  var POWERSTRIP_TOKEN = "POWERSTRIP_TOKEN__"

  var returnBody = {
    PowerstripProtocolVersion:1
  }

  if (body.Type == 'pre-hook'){

    // Figure out the actual request to the Docker daemon.
    var clientRequestBody = JSON.parse(body.ClientRequest.Body)

    debug("\nbody.ClientRequest.Body:")
    debug(JSON.stringify(clientRequestBody, null, 4))

    // Create the directory for the original logs
    var originalPath = root + "/original" 
    var token = createGuid()
    var pathPrefix = originalPath + "/" + token
    fs.stat(originalPath, function(err, stat) {
      if (err) {
        err = fs.mkdirSync(originalPath)
        if (err) throw err;   
        debug("Making original directory complete")

        err = fs.mkdirSync(pathPrefix)
        if (err) throw err;   
        debug("Making path prefix directory complete")
      }  
      else {

        // TODO: Ouch.
        err = fs.mkdirSync(pathPrefix)
        if (err) throw err;   
        debug("Making path prefix directory complete")
      }
    })

    // Figure out all the log file paths from the LOGS env
    var envs = clientRequestBody.Env || []
    debug("Envs: " + envs)
    var logs = []
    for (var i = 0; i < envs.length; i++) {
      var env = envs[i]
      if (env.startsWith("LOGS=")) {
        var kv = env.split("=", 5)
        if (kv[0] === "LOGS") {
          logs = logs.concat(kv[1].split(","))
        }
      }
    }
    debug("Logs: " + logs)

    // Add the token to the environment.
    envs.push(POWERSTRIP_TOKEN + "=" + token)
    clientRequestBody.Env = envs

    // Create the additional bind mounts for the log paths
    var binds = clientRequestBody.HostConfig.Binds || []
    for (var i = 0; i < logs.length; i++) {
      var hostPath = pathPrefix + logs[i]
      var containerPath = logs[i]
      var bind = hostPath + ":" + containerPath
      binds.push(bind)
      debug("Bind: " + bind)     
    }
    debug("Binds: " + binds)
    clientRequestBody.HostConfig.Binds = binds

    // Forward the changes as the modified client request.
    var modifiedClientRequestBody = JSON.stringify(clientRequestBody)
    body.ClientRequest.Body = modifiedClientRequestBody
    returnBody.ModifiedClientRequest = body.ClientRequest
  }
  else if(body.Type == 'post-hook'){

    // Get the modified client request 
    var modifiedClientRequestBody = JSON.parse(body.ModifiedClientRequest.Body)
    debug("\nbody.ModifiedClientRequest.Body:")
    debug(JSON.stringify(modifiedClientRequestBody, null, 4))

    // From the modified client request we can extract
    // the token we put there
    var envs = modifiedClientRequestBody.Env || []
    debug("Envs: " + envs)
    var token = null
    for (var i = 0; i < envs.length; i++) {
      var env = envs[i]
      if (env.startsWith(POWERSTRIP_TOKEN)) {
        var kv = env.split("=", POWERSTRIP_TOKEN.length + 1)
        if (kv[0] === POWERSTRIP_TOKEN) {
          token = kv[1]
        }
      }
    }
    debug("Token: " + token)

    // Get the server response
    var serverResponseBody = JSON.parse(body.ServerResponse.Body)
    debug("body.ServerResponse.Body:")
    debug(JSON.stringify(serverResponseBody, null, 4))

    // From the server response we can get the container ID
    var containerId = serverResponseBody.Id
    debug("ContainerId: " + containerId)

    // With the token, we now know the path to rename
    var originalPath = root + "/original/" + token
    debug("OriginalPath: " + originalPath)
    var containersRoot = root + "/containers"
    var containerPath = containersRoot + "/" + containerId
    debug("ContainerPath: " + containerPath)

    // Make sure the root to the containers directory exists
    fs.stat(containersRoot, function(err, stat) {
      if (err) {
        err = fs.mkdirSync(containersRoot)
        if (err) throw err;
        debug("Making containers directory complete")

        // Finally, create the symlink.
        err = fs.symlinkSync(originalPath, containerPath)
        if (err) throw err;
        debug("Linking complete")        
      }
      else {

        // TODO: Ouch.
        err = fs.symlinkSync(originalPath, containerPath)
        if (err) throw err;
          debug("Linking complete")        
        }
      })

  
    // Just send back the incoming server response.
    var modifiedServerResponseBody = JSON.stringify(serverResponseBody)
    body.ServerResponse.Body = modifiedServerResponseBody
    returnBody.ModifiedServerResponse = body.ServerResponse
  
  } else{

    return null
  }

  return returnBody
}