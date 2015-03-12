powerstrip-logfiles
===================

A [Powerstrip](https://github.com/ClusterHQ/powerstrip) adapter that moves in-container logfiles and paths to logfiles to a common location to be consumed by a regular logfile collection agent, such as the [Sumo Logic File Collector](https://www.sumologic.com).

Sometimes, a fat container is just a reality - how to centralize the various logfiles in a fat container for central collection? Even in a single-process container, sometimes the process is writing multiple logfiles (Nginx, Apache access and error logs, for example) - and while it is possible to perform some situps to multiplex them over stdout, this might not always be the most elegant solution.

This Powerstrip adapter is a Proof-of-Concept to show that it is not terribly hard to centralize the logfiles such that any old logfile collector can pick them up via a simple "**" recursive collection rule.

## Install

```bash
$ docker build -t raychaser/powerstrip-logfiles .
```

## Run the adapter

```bash
$ docker run -d --name powerstrip-logfiles \
    --expose 80 \
    raychaser/powerstrip-logfiles --root __my/path__
```


## Run Powerstrip

First create a Powerstrip configuration with the logfiles adapter:

```bash
$ mkdir -p ~/powerstrip-demo
$ cat > ~/powerstrip-demo/adapters.yml <<EOF
endpoints:
  "POST /*/containers/create":
    pre: [logfiles]
adapters:
  logfiles: http://logfiles/v1/extension
EOF
```

And then run the Powerstrip container and link it to the powerstrip-logfiles container:

```bash
$ docker run -d --name powerstrip \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v ~/powerstrip-demo/adapters.yml:/etc/powerstrip/adapters.yml \
  --link powerstrip-logfiles:logfiles \
  -p 2375:2375 \
  clusterhq/powerstrip
```

## Run containers

Now you can use the normal docker client to run containers.

First you must export the `DOCKER_HOST` variable to point at the powerstrip server:

```bash
$ export DOCKER_HOST=tcp://127.0.0.1:2375
```

Now you can specify as part of the container's environment which paths are supposed to be considered logfile paths. Those paths will be bind-mounted to appear under the location of the --root specified when running the powerstrip-logfiles container.

```bash
$ docker run --rm -e "LOGS=/x,/y" ubuntu bash -c 'touch /x/foo; ls -la /x; touch /y/bar; ls -la /y'
```

You should now be able to see the files "foo" and "bar" under the path specified as the --root:

```bash
$ ls __my/path__/__GUID__/x
```

```bash
$ ls __my/path__/__GUID__/y
```

The GUID is for now randomly generated and represents a container; as soon as I get a chance I will change this to the ID of the actual container.

Hopefully, the point is coming across nonetheless - any in-container log files will be neatly  accessible in a central place in the file system and can from there be easily collected and forwarded.

