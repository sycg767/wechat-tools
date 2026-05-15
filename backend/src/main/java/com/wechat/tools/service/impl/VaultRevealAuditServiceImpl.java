package com.wechat.tools.service.impl;

import com.wechat.tools.entity.VaultRevealAuditEntity;
import com.wechat.tools.repository.VaultRevealAuditRepository;
import com.wechat.tools.service.VaultRevealAuditService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class VaultRevealAuditServiceImpl implements VaultRevealAuditService {

    private final VaultRevealAuditRepository vaultRevealAuditRepository;

    public VaultRevealAuditServiceImpl(VaultRevealAuditRepository vaultRevealAuditRepository) {
        this.vaultRevealAuditRepository = vaultRevealAuditRepository;
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordReveal(Long itemId, UUID userId, String clientIp, String userAgent, boolean success) {
        VaultRevealAuditEntity audit = new VaultRevealAuditEntity();
        audit.setUserId(userId);
        audit.setItemId(itemId);
        audit.setClientIp(trimToNull(clientIp));
        audit.setUserAgent(trimToNull(userAgent));
        audit.setSuccess(success);
        vaultRevealAuditRepository.save(audit);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
