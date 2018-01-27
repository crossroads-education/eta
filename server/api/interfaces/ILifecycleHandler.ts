import Application from "../../Application";

abstract class ILifecycleHandler {
    public abstract register(app: Application): void;
}

export default ILifecycleHandler;
