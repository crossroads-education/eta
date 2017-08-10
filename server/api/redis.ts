import * as eta from "../../eta";
import * as redis from "redis";

const client: redis.RedisClient = undefined;
export default client;

export function connect(): redis.RedisClient {
    const tempClient: redis.RedisClient = redis.createClient(eta.config.http.session.port, eta.config.http.session.host);
    tempClient.on("connect", () => {
        eta.logger.info("Successfully connected to the Redis server.");
    });
    tempClient.on("error", (err: Error) => {
        eta.logger.error(err);
    });
    return tempClient;
}
