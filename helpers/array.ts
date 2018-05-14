import * as _ from "lodash";

export default class HelperArray {
    /**
     * Maps an array into an object.
     * @param arr Array to build object from: [label: string, result: U]
     * @return Transformed object
     */
    public static mapObject<T>(pairs: ((string | T)[] | {
        key: string;
        value: T;
    })[]): {[key: string]: T} {
        const object: {[key: string]: T} = {};
        pairs.forEach(pair => {
            const key = pair instanceof Array ? <string>pair[0] : pair.key;
            object[key] = pair instanceof Array ? <T>pair[1] : pair.value;
        });
        return object;
    }

    public static getRandomItem<T>(items: T[], allowUndefined = false): T {
        return items[_.random(0, items.length - (allowUndefined ? 0 : 1))];
    }
}
