# Setup

## Programs to install

- [Node.JS 6.x](https://nodejs.org)
- [Atom](https://atom.io)
- [Git](https://git-scm.com/downloads)
- [PostgreSQL 9.4.x](https://www.postgresql.org/download/)
- [Python 3.x](https://python.org)

## Commands
- Clone this repository: `git clone https://github.com/crossroads-education/eta.git`
- Clone your content repository to "eta/content": `cd eta; git clone your-repo-here ./content`
- Ensure you are on NPM version 4.x (NPM 5.x is currently broken): `npm i -g npm@4.6.1`
  (actually, npm 5.0.4 is working again)
- Install [Typescript](https://typescriptlang.org): `npm i -g typescript`
- Install local dependencies: `npm i`
- Install the Python "pylint" package: `pip install pylint`
- Install Atom packages: `apm install atom-typescript language-pug linter-pylint`
- Create necessary configuration files in `./config`
- Open the project in Atom: `atom`

If you are using Sublime Text instead of Atom, install the TypeScript package through Sublimes package manager.

## Testing with a Local Database

- download and install Postgres (the [postgres app](http://postgresapp.com/) works well for OSX)
- create a database and a user for eta (e.g. useing the command line tools, or a GUI tool like [pgAdmin](https://www.pgadmin.org/))
- adjust the config files
