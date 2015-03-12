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

  if(body.Type == 'pre-hook'){

    // Figure out the actual request to the Docker daemon.
    var clientRequestBody = JSON.parse(body.ClientRequest.Body)

    debug("\n\nbody.ClientRequest.Body:\n")
    debug(JSON.stringify(clientRequestBody, null, 4))
    debug("\n\n")

    // Get the ID of the container, and the name.
    var token = createGuid()
    var pathPrefix = root + "/" + token

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
  // }
  // else if(body.Type == 'post-hook'){

    // var serverResponseBody = JSON.parse(body.ServerResponse.Body)

    //
    // Once we know how to thread the modified client request 
    // through to the post-hook, use the token to rename the 
    // root directory for the bind mounts to the ID of the container.
    //

    // var modifiedServerResponseBody = JSON.stringify(serverResponseBody)
    // body.ServerResponse.Body = modifiedServerResponseBody
    // returnBody.ModifiedServerResponse = body.ServerResponse
  
  } else{

    return null
  }

  return returnBody
}