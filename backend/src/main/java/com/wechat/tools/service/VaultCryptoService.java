package com.wechat.tools.service;

public interface VaultCryptoService {

    VaultEncryptedPayload encrypt(String plainText);

    String decrypt(String cipherText, String iv);

    record VaultEncryptedPayload(String cipherText, String iv) {
    }
}
