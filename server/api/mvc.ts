import IHttpController from "./interfaces/IHttpController";

export default class MVC {
    public static action(method: string): any {
        return function(target: IHttpController, propertyKey: string, descriptor: PropertyDescriptor): any {
            if (!target.actions) target.actions = {};
            target.actions[propertyKey] = method;
        };
    }

    public static authorize(permissions?: any[]): any {
        return function(target: IHttpController, propertyKey: string, descriptor: PropertyDescriptor): any {
            if (!target.authRequired) target.authRequired = [];
            target.authRequired.push(propertyKey);

            if (permissions) {
                if (!target.permsRequired) target.permsRequired = {};
                target.permsRequired[propertyKey] = permissions;
            }
        };
    }

    public static controller(): any {
        return function(target: typeof IHttpController, propertyKey: string, descriptor: PropertyDescriptor): any {
            if (!target.prototype.routes) target.prototype.routes = [];
            if (!target.prototype.actions) target.prototype.actions = {};
            if (!target.prototype.raw) target.prototype.raw = [];
            if (!target.prototype.params) target.prototype.params = {};
            if (!target.prototype.authRequired) target.prototype.authRequired = [];
            if (!target.prototype.permsRequired) target.prototype.permsRequired = {};
        };
    }

    public static get(): any {
        return function(target: IHttpController, propertyKey: string, descriptor: PropertyDescriptor): any {
            return MVC.action("GET")(target, propertyKey, descriptor);
        };
    }

    public static params(names: string[]): any {
        return function(target: IHttpController, propertyKey: string, descriptor: PropertyDescriptor): any {
            if (!target.params) target.params = {};
            target.params[propertyKey] = names;
        };
    }

    public static post(): any {
        return function(target: IHttpController, propertyKey: string, descriptor: PropertyDescriptor): any {
            return MVC.action("POST")(target, propertyKey, descriptor);
        };
    }

    public static raw(): any {
        return function(target: IHttpController, propertyKey: string, descriptor: PropertyDescriptor): any {
            if (!target.raw) target.raw = [];
            target.raw.push(propertyKey);
        };
    }

    public static route(route: string): any {
        return function(target: typeof IHttpController, propertyKey: string, descriptor: PropertyDescriptor): any {
            if (!target.prototype.routes) target.prototype.routes = [];
            target.prototype.routes.push(route);
        };
    }
}
