package com.wechat.tools.service;

import com.wechat.tools.dto.vault.VaultCreateRequest;
import com.wechat.tools.dto.vault.VaultItemResponse;
import com.wechat.tools.dto.vault.VaultListResponse;
import com.wechat.tools.dto.vault.VaultRevealResponse;
import com.wechat.tools.dto.vault.VaultUpdateRequest;

public interface VaultService {
    VaultItemResponse createItem(VaultCreateRequest request);

    VaultListResponse listItems(String keyword, int page, int size);

    VaultItemResponse getItem(Long id);

    VaultRevealResponse revealPassword(Long id, String clientIp, String userAgent);

    VaultItemResponse updateItem(Long id, VaultUpdateRequest request);

    void deleteItem(Long id);
}
