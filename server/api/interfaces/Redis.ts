import * as redis from "redis";

type Redis = <T>(method: keyof redis.Commands<redis.RedisClient>, ...args: any[]) => Promise<T>;

export default Redis;
