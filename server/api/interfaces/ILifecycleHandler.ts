import WebServer from "../../WebServer";

abstract class ILifecycleHandler {
    public abstract register(server: WebServer): void;
}

export default ILifecycleHandler;
