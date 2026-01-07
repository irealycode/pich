var CryptoJS = require('crypto-js')


export async function encrypt(data : string, key : string) {
  const k = CryptoJS.enc.Utf8.parse(key);
  const encrypted = await CryptoJS.AES.encrypt(data, k, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  });
  return encrypted.toString();
}

export function decrypt(encrypted : string, key : string) {
  const k = CryptoJS.enc.Utf8.parse(key);
  const decrypted = CryptoJS.AES.decrypt(encrypted, k, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  });
  return decrypted.toString(CryptoJS.enc.Utf8);
}