powerstrip-logfiles
===================

A [Powerstrip](https://github.com/ClusterHQ/powerstrip) adapter that allows collection of in-container log files location by a regular log file collection agent, such as the [Sumo Logic File Collector](https://www.sumologic.com).

Docker and the use of containers is spreading like wildfire. In a Docker-ized environment, certain legacy practices and approaches are being challenged. Centralized logging is the one of them. The most popular way of capturing logs coming from a container is to setup the containerized process such that it logs to stdout. Docker then spools this to disk, from where it can be collected. This is great for many use cases.

At the same time, at work at Sumo Logic our customers are telling us that the stdout approach doesn't always work. Not all containers are setup to follow the process-per-container model. This is sometimes referred to as "fat" containers. There are tons of opinions about whether this is the right thing to do or not. Pragmatically speaking, it is a reality for some users.

Even some programs that are otherwise easily containerized as single processes pose some challenges to the stdout model. For example, popular web servers write at least two log files: access and error logs. There are of course workarounds to map this back to a single stdout stream. But ultimately there's only so much multiplexing that can be done before the demuxing operation becomes too painful.

powerstrip-logfiles presents a proof of concept towards easily centralizing log files from within a container. Simply setting `LOGS=/var/logs/nginx` in the container environment, for example, will use a bind mount to make the Nginx access and error logs available on the host under `/var/logs/container-logfiles/containers/[ID of the Nginx container]/var/log/nginx`. A file-based log collector can now simply be configured to recursively collect from `/var/logs/container-logfiles/containers` and will pick up logs from any container configured with the LOGS environment.

This implementation is based on [powerstrip-weave](https://github.com/binocarlos/powerstrip-weave) by Kai Davenport <kaiyadavenport@gmail.com>. All mistakes and bugs are entirely mine.


### Install

```bash
$ docker build -t raychaser/powerstrip-logfiles .
```

### Run the adapter

```bash
$ sudo docker build -t raychaser/powerstrip-logfiles:latest . && \
sudo docker run --privileged -it --rm \
--name powerstrip-logfiles \
--expose 80 -v /var/log/container-logfiles:/var/log/container-logfiles \
-v /var/run/docker.sock:/var/run/docker.sock \
raychaser/powerstrip-logfiles:latest \
-v --root /var/log/container-logfiles
```


### Run Powerstrip

First create a Powerstrip configuration with the powestrip-logfiles adapter:

```bash
$ mkdir -p ~/powerstrip-demo
$ cat > ~/powerstrip-demo/adapters.yml <<EOF
endpoints:
  "POST /*/containers/create":
    pre: [logfiles]
    post: [logfiles]
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

### Run containers

Now you can use the normal docker client to run containers.

First you must export the `DOCKER_HOST` variable to point at the powerstrip server:

```bash
$ export DOCKER_HOST=tcp://127.0.0.1:2375
```

Now you can specify as part of the container's environment which paths are supposed to be considered logfile paths. Those paths will be bind-mounted to appear under the location of the --root specified when running the powerstrip-logfiles container.

```bash
$ docker run --rm -e "LOGS=/x,/y" ubuntu \
    bash -c 'touch /x/foo; ls -la /x; touch /y/bar; ls -la /y'
```

You should now be able to see the files "foo" and "bar" under the path specified as the --root:

```bash
$ ls /var/log/container-logfiles/containers/[container ID]/x
```

```bash
$ ls /var/log/container-logfiles/containers/[container ID]/y
```


## Example using Nginx

See [example directory](example/).


