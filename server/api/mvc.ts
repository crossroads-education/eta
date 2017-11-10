import IHttpController from "./interfaces/IHttpController";

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
            target.prototype.routes.push(route);
        };
    }

    private static init(target: IHttpController, action?: string, worker: (action: {
        method: "GET" | "POST";
        useView: boolean;
        isAuthRequired: boolean;
        permissionsRequired: string[];
    }) => void = action => { }): void {
        if (!target.routes) target.routes = [];
        if (!target.actions) target.actions = {};
        if (action && !target.actions[action]) {
            target.actions[action] = {
                method: "GET",
                isAuthRequired: false,
                useView: true,
                permissionsRequired: []
            };
        }
        worker(target.actions[action]);
    }
}
