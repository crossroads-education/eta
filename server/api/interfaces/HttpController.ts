import RequestHandler from "./RequestHandler";

export default abstract class HttpController extends RequestHandler {
    public constructor(init: Partial<HttpController>) {
        super(init);
        Object.assign(this, init);
    }

    public redis<T>(method: string, ...args: any[]): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            (<any>this.app.redis)[method].bind(this.app.redis)(...args, (err: Error, result: T) => {
                if (err) reject(err);
                else resolve(result);
            });
        });
    }
}
