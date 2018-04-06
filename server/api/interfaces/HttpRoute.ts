import HttpAction from "./HttpAction";
import HttpController from "./HttpController";

export default interface HttpRoute {
    route: string;
    actions: HttpAction[];
    controller: new (partial: Partial<HttpController>) => HttpController;
}
