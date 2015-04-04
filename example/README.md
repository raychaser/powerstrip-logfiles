Nginx Example
=============

A quick example to illustrate how powerstrip-logfiles can be used to collect log files from inside an Nginx container.

### Pre-conditions

Run powerstrip-logfiles and Powerstrip as described in the [main project readme](https://github.com/raychaser/powerstrip-logfiles). Going forward this example assumes Powerstrip running and DOCKER_HOST to be set as follows:

```bash
$ export DOCKER_HOST=tcp://127.0.0.1:2375
```

### Run Nginx

You can just run Nginx from a toy image off of Docker Hub based on the Dockerfile in this repository:

```bash
$ docker run -d --name nginx-example -p 80:80 raychaser/powerstrip-logfiles:nginx-example-latest
```

Or, if you want to run an build locally:

```bash
$ docker build -t raychaser/nginx-example . && \
  docker run -d --name nginx-example -p 80:80 raychaser/nginx-example
```

### Exercise Nginx

Hit http://localhost a couple of times, and maybe try to force some 404 errors by going to something like http://localhost/schnitzel.

You should be able to see the Nginx access and error logs in the container:

```bash
$ docker exec -it nginx-example ls -la /var/log/nginx
```

And you should be able to see the contents of the access log:

```bash
$ docker exec -it nginx-example tail /var/log/nginx/access.log
```

Before the next step, shutdown and remove the Nginx contaienr:

```bash
$ docker stop nginx-example && docker rm nginx-example
```

### One more time

Create another Nginx example container through powerstrip-logfiles with the Nginx log path specified on the commandline:

```bash
$ CID=$(DOCKER_HOST=localhost:2375 docker run -d --name nginx-example-powerstrip -p 80:80 -e LOGS=/var/log/nginx raychaser/powerstrip-logfiles:nginx-example-latest) && echo $CID
```

You should now be able to see the Nginx container's /var under the host's `/var/log/container-logfiles/containers/$CID/`:

```bash
$ ls -la /var/log/container-logfiles/containers/$CID/
```

And if you tail the access log from that location while hitting http://localhost you should see the hits being logged:

```bash
$ tail -F /var/log/container-logfiles/containers/$CID/var/log/nginx/access.log
```

Finally, stop and remove the powerstrip Nginx example container:

```bash
$ docker stop nginx-example-powerstrip && docker rm nginx-example-powerstrip
```
