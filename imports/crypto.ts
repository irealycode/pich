var CryptoJS = require('crypto-js')


export async function encryptECB(data : string, key : string) {
  const k = CryptoJS.enc.Utf8.parse(key);
  const encrypted = await CryptoJS.AES.encrypt(data, k, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  });
  return encrypted.toString();
}

export function decryptECB(encrypted : string, key : string) {
  const k = CryptoJS.enc.Utf8.parse(key);
  const decrypted = CryptoJS.AES.decrypt(encrypted, k, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  });
  return decrypted.toString(CryptoJS.enc.Utf8);
}


export async function encrypt(data : string, key : string) {
  const iv = CryptoJS.lib.WordArray.random(16);

  const encrypted = CryptoJS.AES.encrypt(data, CryptoJS.enc.Utf8.parse(key), {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return iv.toString(CryptoJS.enc.Hex) + ':' + encrypted.ciphertext.toString(CryptoJS.enc.Hex);
}

export function decrypt(encrypted : string, key : string) {
  const [ivHex, cipherHex] = encrypted.split(':');
  const iv = CryptoJS.enc.Hex.parse(ivHex);
  const cipher = CryptoJS.enc.Hex.parse(cipherHex);

  const decrypted = CryptoJS.AES.decrypt({ ciphertext: cipher }, CryptoJS.enc.Utf8.parse(key), {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return decrypted.toString(CryptoJS.enc.Utf8);
}