package cc.uconnect.service;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.vault.core.VaultTemplate;
import org.springframework.vault.support.Ciphertext;
import org.springframework.vault.support.Plaintext;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.security.SecureRandom;
import java.util.Base64;

@Service
@Slf4j
public class MessageCipherService {

    private static final String TRANSIT_KEY = "chat-messages";
    private static final String VAULT_PREFIX = "vault:";
    private static final String AES_ALGORITHM = "AES/GCM/NoPadding";
    private static final int IV_LENGTH_BYTES = 12;
    private static final int GCM_TAG_LENGTH_BITS = 128;
    private static final String SEPARATOR = ":";

    // Null quand Vault est désactivé (local)
    @Autowired(required = false)
    private VaultTemplate vaultTemplate;

    // Clé locale pour le développement sans Vault
    @Value("${app.cipher.key:}")
    private String base64LocalKey;

    private SecretKey localSecretKey;

    @PostConstruct
    void init() {
        if (vaultTemplate != null) {
            log.info("CIPHER using Vault Transit key={} — rotation native activée", TRANSIT_KEY);
            return;
        }
        if (!base64LocalKey.isBlank()) {
            byte[] keyBytes = Base64.getDecoder().decode(base64LocalKey);
            if (keyBytes.length != 32) {
                throw new IllegalStateException("app.cipher.key must be a 32-byte Base64-encoded AES-256 key");
            }
            localSecretKey = new SecretKeySpec(keyBytes, "AES");
            log.info("CIPHER using local AES-256-GCM (Vault non disponible)");
            return;
        }
        log.warn("CIPHER aucune configuration de chiffrement — les messages ne seront PAS chiffrés");
    }

    public String encrypt(String plaintext) {
        if (plaintext == null || plaintext.isBlank()) {
            return plaintext;
        }
        if (vaultTemplate != null) {
            return vaultTemplate.opsForTransit()
                    .encrypt(TRANSIT_KEY, Plaintext.of(plaintext))
                    .getCiphertext();
        }
        if (localSecretKey != null) {
            return localAesEncrypt(plaintext);
        }
        return plaintext;
    }

    public String decrypt(String ciphertext) {
        if (ciphertext == null || ciphertext.isBlank()) {
            return ciphertext;
        }
        // Vault Transit format : "vault:v1:abc123..."
        if (ciphertext.startsWith(VAULT_PREFIX)) {
            if (vaultTemplate != null) {
                return vaultTemplate.opsForTransit()
                        .decrypt(TRANSIT_KEY, Ciphertext.of(ciphertext))
                        .asString();
            }
            log.warn("CIPHER ciphertext Vault Transit reçu mais Vault non disponible");
            return ciphertext;
        }
        // AES-GCM local format : "base64(iv):base64(ciphertext)"
        if (ciphertext.contains(SEPARATOR) && localSecretKey != null) {
            return localAesDecrypt(ciphertext);
        }
        // Pas de séparateur → message legacy en clair
        return ciphertext;
    }

    private String localAesEncrypt(String plaintext) {
        try {
            byte[] iv = new byte[IV_LENGTH_BYTES];
            new SecureRandom().nextBytes(iv);
            Cipher cipher = Cipher.getInstance(AES_ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, localSecretKey, new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv));
            byte[] encrypted = cipher.doFinal(plaintext.getBytes());
            return Base64.getEncoder().encodeToString(iv) + SEPARATOR + Base64.getEncoder().encodeToString(encrypted);
        } catch (Exception e) {
            throw new IllegalStateException("Local AES-GCM encryption failed", e);
        }
    }

    private String localAesDecrypt(String ciphertext) {
        try {
            String[] parts = ciphertext.split(SEPARATOR, 2);
            byte[] iv = Base64.getDecoder().decode(parts[0]);
            byte[] encrypted = Base64.getDecoder().decode(parts[1]);
            Cipher cipher = Cipher.getInstance(AES_ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, localSecretKey, new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv));
            return new String(cipher.doFinal(encrypted));
        } catch (Exception e) {
            log.warn("CIPHER local AES-GCM decryption failed — returning raw value");
            return ciphertext;
        }
    }
}
