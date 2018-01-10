import IHttpController from "./interfaces/IHttpController";
import HttpRoute from "./interfaces/HttpRoute";
import HttpRouteAction from "./interfaces/HttpRouteAction";
import * as _ from "lodash";

export default class MVC {
    public static action(method: "GET" | "POST"): any {
        return function(target: IHttpController, propertyKey: string, descriptor: PropertyDescriptor): any {
            MVC.init(target, propertyKey, action => action.method = method);
        };
    }

    public static authorize(permissions?: any[]): any {
        return function(target: IHttpController, propertyKey: string, descriptor: PropertyDescriptor): any {
            MVC.init(target, propertyKey, action => {
                action.isAuthRequired = true;
                if (permissions) {
                    action.permissionsRequired = permissions;
                }
            });
        };
    }

    public static controller(): any {
        return function(target: typeof IHttpController, propertyKey: string, descriptor: PropertyDescriptor): any {
            MVC.init(target.prototype);
        };
    }

    public static flags(flags: {[key: string]: any}): any {
        return function(target: IHttpController, propertyKey: string, descriptor: PropertyDescriptor): any {
            if (flags instanceof Array) {
                const temp: {[key: string]: any} = {};
                flags.forEach(f => temp[f] = true);
                flags = temp;
            }
            MVC.init(target, propertyKey, action => action.flags = flags);
        };
    }

    public static delete(): any {
        return function(target: IHttpController, propertyKey: string, descriptor: PropertyDescriptor): any {
            MVC.init(target, propertyKey, action => action.method = "DELETE");
        };
    }

    public static get(): any {
        return function(target: IHttpController, propertyKey: string, descriptor: PropertyDescriptor): any {
            MVC.init(target, propertyKey, action => action.method = "GET");
        };
    }

    public static patch(): any {
        return function(target: IHttpController, propertyKey: string, descriptor: PropertyDescriptor): any {
            MVC.init(target, propertyKey, action => action.method = "PATCH");
        };
    }

    public static post(): any {
        return function(target: IHttpController, propertyKey: string, descriptor: PropertyDescriptor): any {
            MVC.init(target, propertyKey, action => action.method = "POST");
        };
    }

    public static put(): any {
        return function(target: IHttpController, propertyKey: string, descriptor: PropertyDescriptor): any {
            MVC.init(target, propertyKey, action => action.method = "PUT");
        };
    }

    public static params(names: string[]): any {
        return function(target: IHttpController, propertyKey: string, descriptor: PropertyDescriptor): any {
            console.error(`@eta.mvc.params() is deprecated, will not work, and should not be used. (${target.toString()} :: ${propertyKey}())`);
        };
    }

    public static raw(): any {
        return function(target: IHttpController, propertyKey: string, descriptor: PropertyDescriptor): any {
            MVC.init(target, propertyKey, action => action.useView = false);
        };
    }

    public static route(route: string): any {
        return function(target: typeof IHttpController, propertyKey: string, descriptor: PropertyDescriptor): any {
            if (target.prototype.route.raw !== undefined) throw new Error("Only one route may be specified per controller.");
            MVC.init(target.prototype);
            const rawRoute: string = route;
            let paramMap: string[] = [];
            if (route.includes(":")) {
                paramMap = route.match(/\:([A-z]+)/g);
                if (_.uniq(paramMap).length !== paramMap.length) {
                    throw new Error("All route parameters must be unique.");
                }
                for (const param of paramMap) {
                    route = route.replace(new RegExp(param), `([A-z0-9]+)`);
                }
            }
            target.prototype.route = new HttpRoute({
                regex: rawRoute.includes(":") ? new RegExp(`^${route}$`) : undefined,
                paramMap: paramMap.map(m => m.substr(1)),
                raw: rawRoute,
                actions: target.prototype.route.actions || {}
            });
        };
    }

    private static init(target: IHttpController, action?: string, worker: (action: HttpRouteAction) => void = action => { }): void {
        if (target.route === undefined) target.route = new HttpRoute({ actions: {} });
        if (action && !target.route.actions[action]) {
            target.route.actions[action] = {
                flags: {},
                method: "GET",
                isAuthRequired: false,
                useView: true,
                permissionsRequired: []
            };
        }
        worker(target.route.actions[action]);
    }
}
