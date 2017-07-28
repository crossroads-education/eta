#!/bin/sh
cd content;
git pull;
npm i --only=dev
cd ..
npm i --only=dev
npm i --only=prod
npm run compile;
npm run compile-client;
npm run test;
npm run test-content;
echo "Run sudo docker restart <instance name>"
