module.exports = function(root, body){

  function S4() {
    return (((1+Math.random())*0x10000)|0).toString(16).substring(1)
  }
  
  function createGuid() {
    return (S4() + S4() + "-" + S4() + "-4" + S4().substr(0,3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase()
  }

  var returnBody = {
    PowerstripProtocolVersion:1
  }

  if(body.Type == 'pre-hook'){
    var clientRequestBody = JSON.parse(body.ClientRequest.Body)

    console.log("\n\nbody.ClientRequest.Body:\n")
    console.log(JSON.stringify(clientRequestBody, null, 4))
    console.log("\n\n")

    // Get the ID of the container, and the name.
    var id = createGuid()
    var pathPrefix = root + "/" + id

    // Figure out all the log file paths from the LOGS env
    var envs = clientRequestBody.Env || {}
    console.log("Envs: " + envs)
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
    console.log("Logs: " + logs)

    // Create the additional bind mounts for the log paths
    var binds = clientRequestBody.HostConfig.Binds || []
    for (var i = 0; i < logs.length; i++) {
      var hostPath = pathPrefix + logs[i]
      var containerPath = logs[i]
      var bind = hostPath + ":" + containerPath
      binds.push(bind)
      console.log("Bind: " + bind)     
    }
    console.log("Binds: " + binds)
    clientRequestBody.HostConfig.Binds = binds
    var modifiedClientRequestBody = JSON.stringify(clientRequestBody)
    body.ClientRequest.Body = modifiedClientRequestBody
    returnBody.ModifiedClientRequest = body.ClientRequest
  }
  else if(body.Type == 'post-hook'){
    console.log("Post-hook")
  }
  else{

    return null
  }

  return returnBody
}