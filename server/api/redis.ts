import * as eta from "../../eta";
import * as redis from "redis";

let client: redis.RedisClient = undefined;
export default client;

export function connect(config: eta.Configuration): Promise<redis.RedisClient> {
    const tempClient: redis.RedisClient = redis.createClient(config.get("session.port"), config.get("session.host"));
    return new Promise(resolve => {
        tempClient.on("error", err => {
            eta.logger.error(err);
            if (err.code === "ECONNREFUSED") process.exit(1);
        });
        tempClient.on("ready", () => {
            client = tempClient;
            resolve(tempClient);
        });
    });
}
