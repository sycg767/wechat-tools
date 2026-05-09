package com.wechat.tools.controller;

import com.wechat.tools.common.Result;
import com.wechat.tools.dto.vault.VaultCreateRequest;
import com.wechat.tools.dto.vault.VaultItemResponse;
import com.wechat.tools.dto.vault.VaultListResponse;
import com.wechat.tools.dto.vault.VaultRevealResponse;
import com.wechat.tools.dto.vault.VaultUpdateRequest;
import com.wechat.tools.service.VaultService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/vault/items")
public class VaultController {

    private final VaultService vaultService;

    public VaultController(VaultService vaultService) {
        this.vaultService = vaultService;
    }

    @PostMapping
    public Result<VaultItemResponse> create(@Valid @RequestBody VaultCreateRequest request) {
        return Result.success(vaultService.createItem(request));
    }

    @GetMapping
    public Result<VaultListResponse> list(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return Result.success(vaultService.listItems(keyword, page, size));
    }

    @GetMapping("/{id}")
    public Result<VaultItemResponse> detail(@PathVariable Long id) {
        return Result.success(vaultService.getItem(id));
    }

    @PostMapping("/{id}/reveal")
    public Result<VaultRevealResponse> reveal(@PathVariable Long id, HttpServletRequest request) {
        return Result.success(vaultService.revealPassword(
                id,
                request.getRemoteAddr(),
                request.getHeader("User-Agent")
        ));
    }

    @PutMapping("/{id}")
    public Result<VaultItemResponse> update(@PathVariable Long id, @Valid @RequestBody VaultUpdateRequest request) {
        return Result.success(vaultService.updateItem(id, request));
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        vaultService.deleteItem(id);
        return Result.success(null);
    }
}
