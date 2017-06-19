FROM node:6.10.3
COPY ./content/schema/ /docker-entrypoint-initdb.d/
WORKDIR /usr/src/app
EXPOSE 3000
VOLUME [ "/usr/src/app" ]
