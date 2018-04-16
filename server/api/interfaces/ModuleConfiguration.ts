export default interface IModuleConfiguration {
    /**
     * Directory definitions for various item types
     */
    dirs: {
        controllers: string[];
        lifecycleHandlers: string[];
        models: string[];
        staticFiles: string[];
        views: string[];
    };
    /**
     * The actual name of the module (in filesystem as well)
     */
    name: string;
    /**
     * Redirect definitions (i.e., "/home/index": "/home/otherPage" would redirect from index to otherPage)
     */
    redirects: {[key: string]: string};
    /**
     * Absolute path to module directory.
     * Generated on module load by ModuleLoader.
     */
    rootDir: string;
    /**
     * Modules that this module requires.
     * Format: username/repository
     * Only Github repositories are supported.
     */
    dependencies: string[];
    hooks: {[key: string]: {
        cwd: string;
        exec: string;
    }[]};
    [key: string]: any;
}
