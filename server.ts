require("source-map-support").install();
import logger from "./server/api/logger"; // Required to setup logger
import WebServer from "./server/WebServer";
import {connect} from "./server/api/db";

function main() {
    process.on("uncaughtException", (err: Error) => {
        console.log("An uncaught error occurred: " + err.message);
        console.log(err.stack);
    });
    let server: WebServer = new WebServer();
}

main();
