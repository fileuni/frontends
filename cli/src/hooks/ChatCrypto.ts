//! 前端加密工具类 / Frontend encryption utility

//! 前端加密工具类 / Frontend encryption utility
import CryptoJS from 'crypto-js';

export class ChatCrypto {
  /**
   * 判断是否为加密文本 / Check if it is encrypted text
   * CryptoJS AES 输出通常以 'U2FsdGVkX1' (Salted__) 开头
   */
  static isEncrypted(text: string): boolean {
    return typeof text === 'string' && text.startsWith('U2FsdGVkX1');
  }

  /**
   * 加密文本 / Encrypt text
   * 使用 AES-256-CBC 确保在非安全上下文（如局域网 HTTP）下依然可用
   * / Use AES-256-CBC to ensure availability in insecure contexts (e.g. LAN HTTP)
   */
  static async encrypt(text: string, password: string): Promise<string> {
    if (!password || !text) return text;
    try {
      // CryptoJS 会自动进行 Key 派生 (EVPKDF) 和 IV 生成
      // CryptoJS automatically performs Key derivation (EVPKDF) and IV generation
      return CryptoJS.AES.encrypt(text, password).toString();
    } catch (e) {
      console.error("[ChatCrypto] Encryption error:", e);
      return text;
    }
  }

  /**
   * 解密文本 / Decrypt text
   */
  static async decrypt(ciphertext: string, password: string): Promise<string> {
    if (!password || !ciphertext) return ciphertext;
    try {
      const bytes = CryptoJS.AES.decrypt(ciphertext, password);
      const plaintext = bytes.toString(CryptoJS.enc.Utf8);
      if (!plaintext) {
        // 如果解密结果为空，可能是密码错误或内容本来就是明文
        return ciphertext;
      }
      return plaintext;
    } catch (e) {
      // 解密失败返回原内容 / Return original on failure
      return ciphertext;
    }
  }
}


