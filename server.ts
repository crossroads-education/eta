require("source-map-support").install();
import * as dbInit from "./db";
Object.keys(dbInit);
import logger from "./server/api/logger"; // Required to setup logger
import WebServer from "./server/WebServer";
import { connect } from "./server/api/db";

function main() {
    if (process.env.ETA_ENVIRONMENT !== "docker-compose") {
        console.warn("You should run this server with docker-compose: `docker-compose up`");
    }
    process.on("uncaughtException", (err: Error) => {
        console.log("An uncaught error occurred: " + err.message);
        console.log(err.stack);
    });
    let server: WebServer;
    process.on("SIGINT", () => {
        if (!server) {
            return;
        }
        logger.trace("Stopping Eta...");
        server.close().then(() => {
            process.exit();
        }).catch(err => {
            logger.error(err);
            process.exit();
        });
    });
    server = new WebServer();
    server.init().then((isInitialized) => {
        if (!isInitialized) {
            server.close();
            return;
        }
        server.start();
    }).catch(err => {
        console.log(err);
    });
}

main();
