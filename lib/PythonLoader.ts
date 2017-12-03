import * as PythonShell from "python-shell";

export default class PythonLoader {
    public static load(filename: string): (...args: any[]) => Promise<any[]> {
        return (...args: any[]) => {
            return new Promise<any>((resolve, reject) => {
                const python: PythonShell.PythonShell = new (<any>PythonShell)(__dirname + "/../eta.py");
                const results: any[] = [];
                python.on("message", line => {
                    line = line.replace(/\r/g, "");
                    if (line === "::eta-py end") {
                        python.end(msg => {
                            resolve(results);
                        });
                    } else {
                        results.push(JSON.parse(line));
                    }
                });
                python.on("error", err => {
                    reject(err);
                    python.end(() => { });
                });
                args.forEach(arg => python.send(JSON.stringify(arg)));
                python.send("::eta-py " + filename);
            });
        };
    }
}
