powerstrip-logfiles
===================

A [Powerstrip](https://github.com/ClusterHQ/powerstrip) adapter that moves in-container logfiles and paths to logfiles to a common location to be consumed by a regular logfile collection agent, such as the [Sumo Logic File Collector](https://www.sumologic.com).

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

Now you can specify as part of the container's environment which paths are supposed to
be considered logfile paths. Those paths will be bind-mounted to appear under the location
of the --root specified when running the powerstrip-logfiles container.

```bash
$ docker run --rm -e "LOGS=/x,/y" ubuntu bash -c 'ls -la /x; ls -la /y'
```
