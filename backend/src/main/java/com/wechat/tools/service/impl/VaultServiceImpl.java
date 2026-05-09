package com.wechat.tools.service.impl;

import com.wechat.tools.dto.vault.VaultCreateRequest;
import com.wechat.tools.dto.vault.VaultItemResponse;
import com.wechat.tools.dto.vault.VaultListResponse;
import com.wechat.tools.dto.vault.VaultRevealResponse;
import com.wechat.tools.dto.vault.VaultUpdateRequest;
import com.wechat.tools.entity.VaultItemEntity;
import com.wechat.tools.entity.VaultRevealAuditEntity;
import com.wechat.tools.repository.VaultItemRepository;
import com.wechat.tools.repository.VaultRevealAuditRepository;
import com.wechat.tools.service.VaultCryptoService;
import com.wechat.tools.service.VaultService;
import com.wechat.tools.service.VaultUserContextService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class VaultServiceImpl implements VaultService {

    private final VaultItemRepository vaultItemRepository;
    private final VaultRevealAuditRepository vaultRevealAuditRepository;
    private final VaultCryptoService vaultCryptoService;
    private final VaultUserContextService vaultUserContextService;

    public VaultServiceImpl(
            VaultItemRepository vaultItemRepository,
            VaultRevealAuditRepository vaultRevealAuditRepository,
            VaultCryptoService vaultCryptoService,
            VaultUserContextService vaultUserContextService
    ) {
        this.vaultItemRepository = vaultItemRepository;
        this.vaultRevealAuditRepository = vaultRevealAuditRepository;
        this.vaultCryptoService = vaultCryptoService;
        this.vaultUserContextService = vaultUserContextService;
    }

    @Override
    @Transactional
    public VaultItemResponse createItem(VaultCreateRequest request) {
        VaultCryptoService.VaultEncryptedPayload payload = vaultCryptoService.encrypt(request.getPassword());
        VaultItemEntity entity = new VaultItemEntity();
        entity.setUserId(currentUserId());
        entity.setPlatform(request.getPlatform().trim());
        entity.setAccount(request.getAccount().trim());
        entity.setPasswordCipher(payload.cipherText());
        entity.setPasswordIv(payload.iv());
        entity.setNote(trimToNull(request.getNote()));
        return toResponse(vaultItemRepository.save(entity));
    }

    @Override
    @Transactional(readOnly = true)
    public VaultListResponse listItems(String keyword, int page, int size) {
        int safePage = Math.max(page, 1) - 1;
        int safeSize = Math.min(Math.max(size, 1), 50);
        PageRequest pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "updatedAt"));
        UUID userId = currentUserId();
        String normalizedKeyword = keyword == null ? "" : keyword.trim();

        Page<VaultItemEntity> result;
        if (normalizedKeyword.isEmpty()) {
            result = vaultItemRepository.findByUserIdAndDeletedAtIsNull(userId, pageable);
        } else {
            result = vaultItemRepository.findByUserIdAndDeletedAtIsNullAndPlatformContainingIgnoreCaseOrUserIdAndDeletedAtIsNullAndAccountContainingIgnoreCase(
                    userId, normalizedKeyword, userId, normalizedKeyword, pageable);
        }

        return VaultListResponse.builder()
                .items(result.getContent().stream().map(this::toResponse).toList())
                .total(result.getTotalElements())
                .page(safePage + 1)
                .size(safeSize)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public VaultItemResponse getItem(Long id) {
        return toResponse(requireItem(id));
    }

    @Override
    @Transactional
    public VaultRevealResponse revealPassword(Long id, String clientIp, String userAgent) {
        VaultItemEntity item = requireItem(id);
        try {
            String password = vaultCryptoService.decrypt(item.getPasswordCipher(), item.getPasswordIv());
            saveAudit(id, clientIp, userAgent, true);
            return new VaultRevealResponse(password);
        } catch (RuntimeException e) {
            saveAudit(id, clientIp, userAgent, false);
            throw e;
        }
    }

    @Override
    @Transactional
    public VaultItemResponse updateItem(Long id, VaultUpdateRequest request) {
        VaultItemEntity entity = requireItem(id);
        entity.setPlatform(request.getPlatform().trim());
        entity.setAccount(request.getAccount().trim());
        entity.setNote(trimToNull(request.getNote()));
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            VaultCryptoService.VaultEncryptedPayload payload = vaultCryptoService.encrypt(request.getPassword());
            entity.setPasswordCipher(payload.cipherText());
            entity.setPasswordIv(payload.iv());
        }
        return toResponse(vaultItemRepository.save(entity));
    }

    @Override
    @Transactional
    public void deleteItem(Long id) {
        VaultItemEntity entity = requireItem(id);
        entity.setDeletedAt(OffsetDateTime.now());
        vaultItemRepository.save(entity);
    }

    private VaultItemEntity requireItem(Long id) {
        return vaultItemRepository.findByIdAndUserIdAndDeletedAtIsNull(id, currentUserId())
                .orElseThrow(() -> new RuntimeException("记录不存在"));
    }

    private void saveAudit(Long itemId, String clientIp, String userAgent, boolean success) {
        VaultRevealAuditEntity audit = new VaultRevealAuditEntity();
        audit.setUserId(currentUserId());
        audit.setItemId(itemId);
        audit.setClientIp(trimToNull(clientIp));
        audit.setUserAgent(trimToNull(userAgent));
        audit.setSuccess(success);
        vaultRevealAuditRepository.save(audit);
    }

    private UUID currentUserId() {
        return vaultUserContextService.getCurrentUserId();
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private VaultItemResponse toResponse(VaultItemEntity entity) {
        return VaultItemResponse.builder()
                .id(entity.getId())
                .platform(entity.getPlatform())
                .account(entity.getAccount())
                .note(entity.getNote())
                .createdAt(entity.getCreatedAt() == null ? null : entity.getCreatedAt().atOffset(java.time.ZoneOffset.ofHours(8)))
                .updatedAt(entity.getUpdatedAt() == null ? null : entity.getUpdatedAt().atOffset(java.time.ZoneOffset.ofHours(8)))
                .build();
    }
}
