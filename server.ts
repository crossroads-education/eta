require("source-map-support").install();
import * as dbInit from "./db";
Object.keys(dbInit); // initializes all database models
import logger from "./server/api/logger"; // Required to setup logger
import WebServer from "./server/WebServer";
import { connect } from "./server/api/db";

function onUncaughtError(err: Error | string, extra?: any) {
    if (err instanceof Error) {
        console.error("An uncaught error occurred:", err.message, err.stack);
    } else {
        console.error("An uncaught error occurred:", err);
    }
}

/**
 * Sets the webserver up and starts it. Called once on app start.
 */
export default async function main(): Promise<WebServer> {
    process.on("uncaughtException", onUncaughtError);
    process.on("unhandledRejection", onUncaughtError);
    let server: WebServer;
    process.on("SIGINT", async () => { // gracefully close server on CTRL+C
        if (!server) {
            return;
        }
        logger.trace("Stopping Eta...");
        try {
            await server.close();
        } catch (err) {
            logger.error(err);
        } finally {
            process.exit();
        }
    });
    server = new WebServer();
    if (!await server.init()) {
        server.close();
        return undefined;
    }
    server.start();
    return server;
}

if (!module.parent) {
    main().then(() => { })
    .catch(err => console.error(err));
}
