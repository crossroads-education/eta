import * as crypto from "crypto";
import * as randomstring from "randomstring";

export default class HelperCrypto {
    /**
     * Encrypts data given a key (using AES 256)
     * @param data The data to encrypt
     * @param key The key to encrypt the data against
     * @return The encrypted data
     */
    public static encrypt(data: string, key: string): string {
        if (key.length !== 32) throw new Error("Encryption key must be 32 characters.");
        const iv = randomstring.generate({ length: 16 });
        const cipher: crypto.Cipher = crypto.createCipheriv("aes-256-ctr", key, iv);
        const encrypted = cipher.update(data, "utf8", "hex");
        return Buffer.from(iv).toString("hex") + ":" + encrypted + cipher.final("hex");
    }

    /**
     * Decrypts AES 256 data given a key
     * @param data The data to decrypt
     * @param key The key to decrypt the data against
     * @return The decrypted data
     */
    public static decrypt(data: string, key: string): string {
        if (key.length !== 32) throw new Error("Decryption key must be 32 characters.");
        const tokens = data.split(":");
        const iv = Buffer.from(tokens.splice(0, 1)[0], "hex");
        const decipher: crypto.Decipher = crypto.createDecipheriv("aes-256-ctr", key, iv);
        const decrypted: string = decipher.update(tokens.join(":"), "hex", "utf8");
        return decrypted + decipher.final("utf8");
    }
}
