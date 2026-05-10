package com.wechat.tools.controller;

import com.wechat.tools.common.Result;
import com.wechat.tools.service.FreeAstroFortuneService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/tool")
public class ZodiacFortuneController {

    private final FreeAstroFortuneService freeAstroFortuneService;

    public ZodiacFortuneController(FreeAstroFortuneService freeAstroFortuneService) {
        this.freeAstroFortuneService = freeAstroFortuneService;
    }

    @GetMapping("/zodiac-fortune")
    public Result<FreeAstroFortuneService.FortuneResponse> getZodiacFortune(@RequestParam String sign,
                                                                             @RequestParam(required = false) String date) {
        return Result.success(freeAstroFortuneService.getFortune(sign, date));
    }
}
