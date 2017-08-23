# Setup

## Programs to install

- [Node.JS 8.2+](https://nodejs.org)
- [Git](https://git-scm.com/downloads)
- [PostgreSQL 9.6.x server](https://www.postgresql.org/download/)
- [Python 3.6+](https://python.org)

## Commands
- Clone this repository: `git clone https://github.com/crossroads-education/eta.git`
- Install [Typescript](https://typescriptlang.org): `npm i -g typescript`
- Install local dependencies: `npm i --only=dev` and `npm i --only=prod`
- Create necessary configuration files in `./config`
- Clone pre-existing modules with `npm run get-module -- <git-url>`

## Developing & Testing with a Local Database

- Create a database and a user for the Eta instance (e.g. using the command line tools, or a GUI tool like [pgAdmin](https://www.pgadmin.org/))
- Adjust `config/db.json` to match the PostgreSQL credentials you created
- Use `node server.js` (or `nodemon server.js`, to automatically restart the server when changes are made) to start the server
- You can run `tsc -w` in the project directory to automatically rebuild all Typescript files when they change
