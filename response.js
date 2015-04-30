var fs = require('fs');
var mount = require("nodeos-mount");
var Docker = require('dockerode');
var Step = require('step');

module.exports = function(root, verbose, body) {

  var docker = new Docker({socketPath: '/var/run/docker.sock'});

  var POWERSTRIP_TOKEN = "POWERSTRIP_TOKEN__";

  var returnBody = {
    PowerstripProtocolVersion: 1
  }

  //
  // Helper functions
  //

  function S4() {
    return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
  }

  function createGuid() {
    return (S4() + S4() + "-" + S4() + "-4" + S4().substr(0,3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();
  }

  function debug(s) {
    if (verbose) {
      console.log(s);
    }
  }

  //
  // Pre- and post-hook processing
  //

  function preHook(root, verbose, body) {

    // Figure out the actual request to the Docker daemon.
    var clientRequestBody = JSON.parse(body.ClientRequest.Body);

    debug("\nbody.ClientRequest.Body:");
    debug(JSON.stringify(clientRequestBody, null, 4));

    // Create the directory for the original logs
    var originalPath = root + "/original";
    var token = createGuid();
    var pathPrefix = originalPath + "/" + token;
    if (!fs.existsSync(root)) {
      var err = fs.mkdirSync(root);
      if (err) throw err;
      debug("Created root directory: " + root);
    } else {
      debug("Root directory exists: " + root);
    }
    if (!fs.existsSync(originalPath)) {
      var err = fs.mkdirSync(originalPath);
      if (err) throw err;
      debug("Created original directory: " + originalPath);
    } else {
      debug("Original directory exists: " + originalPath);
    }
    if (!fs.existsSync(pathPrefix)) {
      var err = fs.mkdirSync(pathPrefix);
      if (err) throw err;
      debug("Create prefix directory: " + pathPrefix);
    } else {
      debug("Prefix directory exists: " + pathPrefix);
    }

    // Figure out all the log file paths from the LOGS env
    var envs = clientRequestBody.Env || [];
    debug("Envs: " + envs);
    var logs = [];
    for (var i = 0; i < envs.length; i++) {
      var env = envs[i];
      if (env.indexOf("LOGS=") == 0) {
        var kv = env.split("=", 5);
        if (kv[0] === "LOGS") {
          logs = logs.concat(kv[1].split(","));
        }
      }
    }
    debug("Logs: " + logs);

    // Add the token to the environment.
    envs.push(POWERSTRIP_TOKEN + "=" + token);
    clientRequestBody.Env = envs;

    // Create the additional bind mounts for the log paths
    var binds = clientRequestBody.HostConfig.Binds || [];
    for (var i = 0; i < logs.length; i++) {
      var hostPath = pathPrefix + logs[i];
      var containerPath = logs[i];
      var bind = hostPath + ":" + containerPath;
      binds.push(bind);
      debug("Bind: " + bind);
    }
    debug("Binds: " + binds);
    clientRequestBody.HostConfig.Binds = binds;

    // Forward the changes as the modified client request.
    var modifiedClientRequestBody = JSON.stringify(clientRequestBody);
    body.ClientRequest.Body = modifiedClientRequestBody;
    returnBody.ModifiedClientRequest = body.ClientRequest;
  }

  function postHook(root, verbose, body) {

    // Get the server response
    debug("body.ServerResponse.Body:");
    debug(body.ServerResponse.Body);
    var serverResponseBody;
    serverResponseBody = JSON.parse(body.ServerResponse.Body);
    debug("Parsed body.ServerResponse.Body:");
    debug(JSON.stringify(serverResponseBody, null, 4));

    // From the server response we can get the container ID
    var containerId = serverResponseBody.Id;
    debug("ContainerId: " + containerId);

    // Get the details for this container so we can get the
    // token from the container's environment
    var container = docker.getContainer(containerId);

    Step(
      function() {
        container.inspect(this);
      },
      function(err, data) {
        if (err) throw err;
        debug(data);

        // Get the environment variables and find the token
        var envs = data.Config.Env
        debug("Envs: " + envs)
        var token = null
        for (var i = 0; i < envs.length; i++) {
          var env = envs[i]
          if (env.indexOf(POWERSTRIP_TOKEN) == 0) {
            var kv = env.split("=", POWERSTRIP_TOKEN.length + 1)
            if (kv[0] === POWERSTRIP_TOKEN) {
              token = kv[1]
            }
          }
        }
        debug("Token: " + token);

        // With the token, we now know the path to rename
        var originalPath = root + "/original/" + token;
        debug("OriginalPath: " + originalPath);
        var containersRoot = root + "/containers";
        var containerPath = containersRoot + "/" + containerId;
        debug("ContainerPath: " + containerPath);

        // Create the link
        if (!fs.existsSync(containersRoot)) {
          var err = fs.mkdirSync(containersRoot);
          if (err) throw err;
          debug("Created containers directory: " + containersRoot);
        } else {
          debug("Containers directory exists: " + containersRoot);
        }
        var err = fs.mkdirSync(containerPath);
        if (err) throw err;
        debug("Created container path: " + containerPath);
        var err = mount.mountSync(originalPath, containerPath, "", ["bind"]);
        debug(err)
        if (err) throw err;
        debug("Linking complete: " + originalPath + " -> " + containerPath);
        if (!fs.existsSync(containerPath)) {
          throw "Container link doesn't exist: " + containerPath;
        }
      });
  }

  //
  // Main processing
  //

  if (body.Type == 'pre-hook'){

    try {

      // Pre-hook processing.
      preHook(root, verbose, body);

    } catch (err) {

      // Just move on and pass the response back
      // without processing
      debug("Error during pre-hook processing, " +
        "passing response without processing: " + err);
    }
  }
  else if(body.Type == 'post-hook'){

    // Check if Docker returned an error.
    if (body.ServerResponse.Code != 201) {

        // Just move on and pass the response back
        // without processing
      debug("ServerResponse.Code not 200 CREATED, but: " +
        body.ServerResponse.Code);
    }
    else {

      try {

        // Post-hook processing
        postHook(root, verbose, body);

      } catch (err) {

        // Just move on and pass the response back
        // without processing
        debug("Error during post-hook processing, " +
          "passing response without processing: " + err);
      }
    }

    // Just send back the incoming server response.
    returnBody.ModifiedServerResponse = body.ServerResponse

  } else {

    return null;
  }

  return returnBody;
}