package com.wechat.tools.controller;

import com.wechat.tools.common.Result;
import com.wechat.tools.service.DeltaForcePasswordService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/game/delta-force")
public class DeltaForceController {

    private final DeltaForcePasswordService deltaForcePasswordService;

    public DeltaForceController(DeltaForcePasswordService deltaForcePasswordService) {
        this.deltaForcePasswordService = deltaForcePasswordService;
    }

    @GetMapping("/passwords")
    public Result<DeltaForcePasswordService.PasswordResponse> getPasswords() {
        return Result.success(deltaForcePasswordService.getPasswords());
    }
}
