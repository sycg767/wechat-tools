package com.wechat.tools.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "vault_items")
public class VaultItemEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false, length = 120)
    private String platform;

    @Column(nullable = false, length = 160)
    private String account;

    @Column(name = "password_cipher", nullable = false, columnDefinition = "text")
    private String passwordCipher;

    @Column(name = "password_iv", nullable = false, length = 64)
    private String passwordIv;

    @Column(columnDefinition = "text")
    private String note;

    @Column(name = "deleted_at")
    private OffsetDateTime deletedAt;
}
