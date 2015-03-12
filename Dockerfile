FROM errordeveloper/iojs-minimal-runtime:v1.0.1
ADD . /srv/app
WORKDIR /srv/app
RUN npm install
EXPOSE 80
ENTRYPOINT ["node", "index.js"]