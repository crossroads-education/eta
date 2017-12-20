require("source-map-support").install();
import * as dbInit from "./db";
Object.keys(dbInit); // initializes all database models
import logger from "./server/api/logger"; // Required to setup logger
import Application from "./server/Application";
import { connect } from "./server/api/db";

function onUncaughtError(err: Error | string, extra?: any) {
    if (err instanceof Error) {
        console.error("An uncaught error occurred:", err.message, err.stack);
    } else {
        console.error("An uncaught error occurred:", err);
    }
}

/**
 * Sets the application up and starts it. Called once on app start.
 */
export default async function main(): Promise<Application> {
    process.on("uncaughtException", onUncaughtError);
    process.on("unhandledRejection", onUncaughtError);
    let app: Application;
    process.on("SIGINT", async () => { // gracefully close server on CTRL+C
        if (!app) {
            return;
        }
        logger.trace("Stopping Eta...");
        try {
            await app.close();
        } catch (err) {
            logger.error(err);
        } finally {
            process.exit();
        }
    });
    app = new Application();
    if (!await app.init()) {
        await app.close();
        return undefined;
    }
    app.start();
    return app;
}

if (!module.parent) {
    main().then(() => { })
    .catch(err => console.error(err));
}
