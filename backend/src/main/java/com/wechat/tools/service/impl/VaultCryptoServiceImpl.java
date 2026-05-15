package com.wechat.tools.service.impl;

import com.wechat.tools.config.VaultProperties;
import com.wechat.tools.service.VaultCryptoService;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

@Service
public class VaultCryptoServiceImpl implements VaultCryptoService {

    private static final int GCM_TAG_BITS = 128;
    private static final int IV_LENGTH = 12;
    private static final int MIN_KEY_LENGTH = 32;
    private static final String DEFAULT_CRYPTO_KEY = "change-this-in-env";

    private final VaultProperties vaultProperties;
    private final SecureRandom secureRandom = new SecureRandom();

    private SecretKeySpec secretKeySpec;

    public VaultCryptoServiceImpl(VaultProperties vaultProperties) {
        this.vaultProperties = vaultProperties;
    }

    @PostConstruct
    public void init() {
        String cryptoKey = vaultProperties.getCryptoKey();
        if (cryptoKey == null || cryptoKey.isBlank()) {
            throw new IllegalStateException("未配置 vault.crypto-key");
        }
        if (DEFAULT_CRYPTO_KEY.equals(cryptoKey.trim())) {
            throw new IllegalStateException("vault.crypto-key 不能使用默认占位密钥");
        }
        if (cryptoKey.trim().length() < MIN_KEY_LENGTH) {
            throw new IllegalStateException("vault.crypto-key 长度不能少于 32 个字符");
        }
        try {
            byte[] keyBytes = MessageDigest.getInstance("SHA-256")
                    .digest(cryptoKey.getBytes(StandardCharsets.UTF_8));
            this.secretKeySpec = new SecretKeySpec(keyBytes, "AES");
        } catch (Exception e) {
            throw new IllegalStateException("初始化密码保险箱密钥失败", e);
        }
    }

    @Override
    public VaultEncryptedPayload encrypt(String plainText) {
        try {
            byte[] iv = new byte[IV_LENGTH];
            secureRandom.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, secretKeySpec, new GCMParameterSpec(GCM_TAG_BITS, iv));
            byte[] encrypted = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
            return new VaultEncryptedPayload(
                    Base64.getEncoder().encodeToString(encrypted),
                    Base64.getEncoder().encodeToString(iv)
            );
        } catch (Exception e) {
            throw new RuntimeException("密码加密失败");
        }
    }

    @Override
    public String decrypt(String cipherText, String iv) {
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(
                    Cipher.DECRYPT_MODE,
                    secretKeySpec,
                    new GCMParameterSpec(GCM_TAG_BITS, Base64.getDecoder().decode(iv))
            );
            byte[] decrypted = cipher.doFinal(Base64.getDecoder().decode(cipherText));
            return new String(decrypted, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new RuntimeException("密码解密失败");
        }
    }
}
