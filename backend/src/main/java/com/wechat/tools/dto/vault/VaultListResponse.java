package com.wechat.tools.dto.vault;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class VaultListResponse {
    private List<VaultItemResponse> items;
    private long total;
    private int page;
    private int size;
}
