export default class HelperString {
    /**
     * DEPRECATED: Use the "camelcase" module instead.
     * Note that the "camelcase" module will not behave the same with multiple preceding capital letters.
     * @deprecated
     */
    public static toCamelCase(str: string): string {
        if (str.length < 2) {
            return !!str ? str.toLowerCase() : str;
        }
        return str[0].toLowerCase() + str.substring(1);
    }

    /**
     * DEPRECATED: Use the "camelcase" module instead.
     * @deprecated
     */
    public static toLowerCamelCase(str: string): string {
        let result = "";
        let i: number;
        for (i = 0; i < str.length; i++) {
            if (str[i] === str[i].toLowerCase()) {
                break;
            }
            result += str[i].toLowerCase();
        }
        result += str.slice(i);
        return result;
    }
}
