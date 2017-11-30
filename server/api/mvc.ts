import IHttpController from "./interfaces/IHttpController";
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

    public static get(): any {
        return function(target: IHttpController, propertyKey: string, descriptor: PropertyDescriptor): any {
            MVC.init(target, propertyKey, action => action.method = "GET");
        };
    }

    public static post(): any {
        return function(target: IHttpController, propertyKey: string, descriptor: PropertyDescriptor): any {
            MVC.init(target, propertyKey, action => action.method = "POST");
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
            MVC.init(target.prototype);
            if (route.includes(":")) {
                const rawRoute = route;
                const map: string[] = route.match(/\:([A-z]+)/g);
                if (_.uniq(map).length !== map.length) {
                    throw new Error("All route parameters must be unique.");
                }
                map.forEach((m, i) => {
                    route = route.replace(new RegExp(m), `([A-z0-9]+)`);
                });
                target.prototype.routes.push({
                    regex: new RegExp(`^${route}$`),
                    map: map.map(m => m.substr(1)),
                    raw: rawRoute
                });
            } else {
                target.prototype.routes.push(route);
            }
        };
    }

    private static init(target: IHttpController, action?: string, worker: (action: {
        flags: {[key: string]: string | number | boolean | RegExp};
        method: "GET" | "POST";
        useView: boolean;
        isAuthRequired: boolean;
        permissionsRequired: string[];
    }) => void = action => { }): void {
        if (!target.routes) target.routes = [];
        if (!target.actions) target.actions = {};
        if (action && !target.actions[action]) {
            target.actions[action] = {
                flags: {},
                method: "GET",
                isAuthRequired: false,
                useView: true,
                permissionsRequired: []
            };
        }
        worker(target.actions[action]);
    }
}
