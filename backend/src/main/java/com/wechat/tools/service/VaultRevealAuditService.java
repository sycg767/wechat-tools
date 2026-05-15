package com.wechat.tools.service;

import java.util.UUID;

public interface VaultRevealAuditService {
    void recordReveal(Long itemId, UUID userId, String clientIp, String userAgent, boolean success);
}
