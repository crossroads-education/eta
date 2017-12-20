import Application from "../../Application";

abstract class ILifecycleHandler {
    public abstract register(server: Application): void;
}

export default ILifecycleHandler;
