package com.wechat.tools.dto.vault;

import lombok.Builder;
import lombok.Getter;

import java.time.OffsetDateTime;

@Getter
@Builder
public class VaultItemResponse {
    private Long id;
    private String platform;
    private String account;
    private String note;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
