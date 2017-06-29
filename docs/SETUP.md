# Setup

## Programs to install

- [Node.JS 6.x](https://nodejs.org)
- [Atom](https://atom.io)
- [Git](https://git-scm.com/downloads)
- [PostgreSQL 9.6.x server](https://www.postgresql.org/download/) ([macOS](http://postgresapp.com/))
- [Python 3.x](https://python.org)

## Commands
- Clone this repository: `git clone https://github.com/crossroads-education/eta.git`
- Clone your content repository to "eta/content": `cd eta; git clone your-repo-here ./content`
- Install [Typescript](https://typescriptlang.org): `npm i -g typescript`
- Install local dependencies: `npm i`
- Install the Python "pylint" package: `pip install pylint`
- Install Atom packages: `apm install atom-typescript language-pug linter-pylint`
- Create necessary configuration files in `./config`
- Open the project in Atom: `atom`

If you are using Sublime Text instead of Atom, install the Typescript package through [Sublime Package Control](https://packagecontrol.io/).

## Developing & Testing with a Local Database

- Create a database and a user for the Eta instance (e.g. using the command line tools, or a GUI tool like [pgAdmin](https://www.pgadmin.org/))
- Adjust `config/db.json` to match the PostgreSQL credentials you created
- Use `node server.js` (or `nodemon server.js`, to automatically restart the server when changes are made) to start the server
- You can run `tsc -w` in the project directory to automatically rebuild all Typescript files when they change
