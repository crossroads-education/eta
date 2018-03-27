import Application from "../../Application";

export default abstract class LifecycleHandler {
    protected app: Application;
    public constructor(app: Application) {
        this.app = app;
    }

    public abstract register(): void;
}