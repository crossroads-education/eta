import * as crypto from "crypto";
import * as randomstring from "randomstring";

export default class HelperCrypto {
    /**
     * Concatenates a password and salt, then returns the hashed result.
     * @param password The password to hash
     * @param salt The salt to concatenate to the password
     * @return The SHA256-hashed password + salt
     */
    public static hashPassword(password: string, salt: string): string {
        return crypto.createHash("sha256").update(password + salt).digest("hex");
    }

    /**
     * Creates a random string of length 20.
     * @return The random string
     */
    public static generateSalt(): string {
        return randomstring.generate({
            length: 20
        });
    }

    /**
     * Generates a MD5 hash of the `data`.
     * @param data The buffer to generate a hash from
     * @return The unique hash based on the `data`
     */
    public static getUnique(data: Buffer): string {
        return crypto.createHash("md5").update(data).digest("hex");
    }
}
