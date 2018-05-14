import HttpAction from "@eta/server/api/interfaces/HttpAction";

export default function(action: Partial<HttpAction>): MethodDecorator {
    return Reflect.metadata("action", action);
}
