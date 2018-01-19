import * as eta from "../../eta";
import * as redis from "redis";

const client: redis.RedisClient = undefined;
export default client;

export function connect(config: eta.Configuration): Promise<redis.RedisClient> {
    const client: redis.RedisClient = redis.createClient(config.get("session.port"), config.get("session.host"));
    return new Promise((resolve, reject) => {
        client.on("error", err => {
            eta.logger.error(err);
            if (err.code === "ECONNREFUSED") process.exit(1);
        });
        client.on("connect", () => {
            resolve(client);
        });
    });
}
