require("source-map-support").install();

export function getServerDir(): string {
    let dir: string = process.cwd().replace(/\\/g, "/");
    if (dir.endsWith("scripts")) {
        const tokens: string[] = dir.split("/");
        dir = tokens.splice(0, tokens.length - 1).join("/");
    }
    return dir;
}
