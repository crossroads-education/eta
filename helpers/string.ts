export default class HelperString {
    public static toCamelCase(str: string): string {
        if (str.length < 2) {
            return !!str ? str.toLowerCase() : str;
        }
        return str[0].toLowerCase() + str.substring(1);
    }

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
