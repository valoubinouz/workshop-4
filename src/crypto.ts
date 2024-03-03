import { webcrypto } from "crypto";
import {randomBytes} from "crypto";

// #############
// ### Utils ###
// #############

// Function to convert ArrayBuffer to Base64 string
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString("base64");
}

// Function to convert Base64 string to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  var buff = Buffer.from(base64, "base64");
  return buff.buffer.slice(buff.byteOffset, buff.byteOffset + buff.byteLength);
}

// ################
// ### RSA keys ###
// ################

// Generates a pair of private / public RSA keys
type GenerateRsaKeyPair = {
  publicKey: webcrypto.CryptoKey;
  privateKey: webcrypto.CryptoKey;
};
export async function generateRsaKeyPair(): Promise<GenerateRsaKeyPair> {
  const { publicKey, privateKey } = await webcrypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );

  return { publicKey, privateKey};
}

// Export a crypto public key to a base64 string format
export async function exportPubKey(key: webcrypto.CryptoKey): Promise<string> {
  const exportedKey = await webcrypto.subtle.exportKey("spki", key);
  const base64Key = arrayBufferToBase64(exportedKey);

  return base64Key;
}

// Export a crypto private key to a base64 string format
export async function exportPrvKey(
  key: webcrypto.CryptoKey | null
): Promise<string | null> {
  if (!key) {
    return null;
  }

  const exportedKey = await webcrypto.subtle.exportKey("pkcs8", key);
  const base64Key = arrayBufferToBase64(exportedKey);

  return base64Key;
}

// Import a base64 string public key to its native format
export async function importPubKey(
  strKey: string
): Promise<webcrypto.CryptoKey> {
  const binaryKey = base64ToArrayBuffer(strKey);
  const importedKey = await webcrypto.subtle.importKey(
    "spki",
    binaryKey,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  );

  return importedKey;
}

// Import a base64 string private key to its native format
export async function importPrvKey(
  strKey: string
): Promise<webcrypto.CryptoKey> {
  const binaryKey = base64ToArrayBuffer(strKey);
  const importedKey = await webcrypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["decrypt"]
  );

  return importedKey;
}

// Encrypt a message using an RSA public key
export async function rsaEncrypt(
  b64Data: string,
  strPublicKey: string
): Promise<string> {
  const publicKey = await importPubKey(strPublicKey);
  const dataBuffer = base64ToArrayBuffer(b64Data);
  const encryptedData = await webcrypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    dataBuffer
  );

  return arrayBufferToBase64(encryptedData);
}

// Decrypts a message using an RSA private key
export async function rsaDecrypt(
  data: string,
  privateKey: webcrypto.CryptoKey
): Promise<string> {
  const dataBuffer = base64ToArrayBuffer(data);
  const decryptedData = await webcrypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    dataBuffer
  );

  return arrayBufferToBase64(decryptedData);
}

// ######################
// ### Symmetric keys ###
// ######################

// Generates a random symmetric key
export async function createRandomSymmetricKey(): Promise<webcrypto.CryptoKey> {
 
  const keyBytes = randomBytes(32);
  const key = await webcrypto.subtle.importKey(
   "raw",
   keyBytes,
   {
     name: "AES-CBC", // we use AES-CBC with 256 
     length: 256
   },
   true,
   ["encrypt", "decrypt"]
 );

 return key;
}

// Export a crypto symmetric key to a base64 string format
export async function exportSymKey(key: webcrypto.CryptoKey): Promise<string> {
  const exportedKey = await webcrypto.subtle.exportKey("raw", key);
  const base64Key = arrayBufferToBase64(exportedKey);

  return base64Key;
}

// Import a base64 string format to its crypto native format


export async function importSymKey(
  strKey: string
): Promise<webcrypto.CryptoKey> {
  // Import the symmetric key from a base64 string using the Web Crypto API
  const base64Key = Buffer.from(strKey, 'base64');
  const keyData = new Uint8Array(base64Key);
  const importedKey = await webcrypto.subtle.importKey(
    'raw',
    keyData,
    {
      name: 'AES-CBC',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );

  // Return the imported symmetric key as a CryptoKey object
  return importedKey;
}

//// NOT FUNCTIONAL 


// Encrypt a message using a symmetric key
export async function symEncrypt(
  
  key: webcrypto.CryptoKey,
  data: string
): Promise<string> {
const iv = webcrypto.getRandomValues(new Uint8Array(16));
const encrypted = await webcrypto.subtle.encrypt(
    {
      name: 'AES-CBC',
      iv: iv,
    },
    key,
    new TextEncoder().encode(data)
);
return arrayBufferToBase64(iv) + ':' + arrayBufferToBase64(encrypted);
}

// Decrypt a message using a symmetric key
export async function symDecrypt(
  strKey: string,
  encryptedData: string
): Promise<string> {
const key = await importSymKey(strKey);
const parts = encryptedData.split(':');
const iv = base64ToArrayBuffer(parts[0]);
const encrypted = base64ToArrayBuffer(parts[1]);

const decrypted = await webcrypto.subtle.decrypt(
    {
      name: 'AES-CBC',
      iv: iv,
    },
    key,
    encrypted
);
return new TextDecoder().decode(decrypted);
}