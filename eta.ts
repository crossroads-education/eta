/// <reference path="./def/express.d.ts" />
import * as lodash from "lodash";
/**
 * Link to the "underscore" library for convenience
 */
export const _ = lodash;
export * from "./helpers/index";
export * from "./server/api/index";
export * from "./lib/index";
import { StackLogger } from "./lib/index";
export let logger: StackLogger;
