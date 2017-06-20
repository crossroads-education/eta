FROM node:6.10.3
WORKDIR /usr/src/app
EXPOSE 3000
VOLUME [ "/usr/src/app" ]
RUN "psql < create extension if not exists pg_trgm;"
