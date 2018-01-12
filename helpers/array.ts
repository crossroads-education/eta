export default class HelperArray {
    /**
     * Maps an array into an object.
     * @param arr Array to build object from: [label: string, result: U]
     * @return Transformed object
     */
    public static mapObject<T>(pairs: (string | T)[][]): {[key: string]: T} {
        const object: {[key: string]: T} = {};
        pairs.forEach(pair => {
            const key = <string>pair[0];
            object[key] = <T>pair[1];
        });
        return object;
    }
}
