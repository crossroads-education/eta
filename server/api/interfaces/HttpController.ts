import * as redis from "redis";
import Redis from "./Redis";
import RequestHandler from "./RequestHandler";

export default abstract class HttpController extends RequestHandler {
    public constructor(init: Partial<HttpController>) {
        super(init);
        Object.assign(this, init);
    }

    public redis: Redis = <T>(method: keyof redis.Commands<redis.RedisClient>, ...args: any[]): Promise<T> =>
        new Promise<T>((resolve, reject) => {
            this.app.redis[method].apply(this.app.redis, args.concat([(err: Error, result: T) => {
                if (err) reject(err);
                else resolve(result);
            }]));
        })
}
