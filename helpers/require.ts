import * as fs from "fs";
import * as tsconfigPaths from "tsconfig-paths";

const tsconfig = JSON.parse(fs.readFileSync(__dirname + "/../tsconfig.json", "utf-8"));
tsconfigPaths.register(tsconfig.compilerOptions);
export default tsconfig;
