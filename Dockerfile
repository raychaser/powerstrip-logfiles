FROM library/node
MAINTAINER Christian Beedgen <raychaser@gmail.com>
ADD package.json /srv/app/package.json
WORKDIR /srv/app
RUN npm install
ADD . /srv/app
EXPOSE 80
ENTRYPOINT ["node", "index.js"]