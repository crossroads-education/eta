import IHttpController from "./interfaces/IHttpController";

export default class mvc {
    public static action(method: string): any {
        return function(target: IHttpController, propertyKey: string, descriptor: PropertyDescriptor): any {
            if (!target.actions) {
                target.actions = {};
            }
            target.actions[propertyKey] = method;
        };
    }

    public static authorize(): any {
        return function(target: IHttpController, propertyKey: string, descriptor: PropertyDescriptor): any {
            if (!target.authRequired) {
                target.authRequired = [];
            }
            target.authRequired.push(propertyKey);
        };
    }

    public static controller(): any {
        return function(target: typeof IHttpController, propertyKey: string, descriptor: PropertyDescriptor): any {
            if (!target.prototype.routes) target.prototype.routes = [];
            if (!target.prototype.actions) target.prototype.actions = {};
            if (!target.prototype.raw) target.prototype.raw = [];
            if (!target.prototype.params) target.prototype.params = {};
            if (!target.prototype.authRequired) target.prototype.authRequired = [];
        };
    }

    public static get(): any {
        return function(target: IHttpController, propertyKey: string, descriptor: PropertyDescriptor): any {
            return mvc.action("GET")(target, propertyKey, descriptor);
        };
    }

    public static params(names: string[]): any {
        return function(target: IHttpController, propertyKey: string, descriptor: PropertyDescriptor): any {
            if (!target.params) {
                target.params = {};
            }
            target.params[propertyKey] = names;
        };
    }

    public static post(): any {
        return function(target: IHttpController, propertyKey: string, descriptor: PropertyDescriptor): any {
            return mvc.action("POST")(target, propertyKey, descriptor);
        };
    }

    public static raw(): any {
        return function(target: IHttpController, propertyKey: string, descriptor: PropertyDescriptor): any {
            if (!target.raw) {
                target.raw = [];
            }
            target.raw.push(propertyKey);
        };
    }

    public static route(route: string): any {
        return function(target: typeof IHttpController, propertyKey: string, descriptor: PropertyDescriptor): any {
            if (!target.prototype.routes) {
                target.prototype.routes = [];
            }
            target.prototype.routes.push(route);
        };
    }
}
