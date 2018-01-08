import * as eta from "../../eta";
import * as redis from "redis";

const client: redis.RedisClient = undefined;
export default client;

export function connect(): Promise<redis.RedisClient> {
    const client: redis.RedisClient = redis.createClient(eta.config.http.session.port, eta.config.http.session.host);
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
