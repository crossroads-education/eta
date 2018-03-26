import * as _ from "lodash";
import HttpAction from "../interfaces/HttpAction";

export default function(action: Partial<HttpAction>): MethodDecorator {
    return Reflect.metadata("action", action);
}
