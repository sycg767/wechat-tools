package com.wechat.tools.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * 二维码短码：把扫码后要展示的长文本压成 8 位 code，对应一条记录。
 * 设置 expires_at 让记录可以被定时清理，避免无限增长。
 */
@Getter
@Setter
@Entity
@Table(name = "qr_short_codes")
public class QrShortCodeEntity extends BaseEntity {

    @Id
    @Column(length = 16)
    private String code;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;
}
