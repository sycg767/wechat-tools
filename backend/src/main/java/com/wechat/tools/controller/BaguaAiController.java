package com.wechat.tools.controller;

import com.wechat.tools.common.BizException;
import com.wechat.tools.common.Result;
import com.wechat.tools.service.BaguaAiService;
import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/tool")
public class BaguaAiController {

    private final BaguaAiService baguaAiService;

    public BaguaAiController(BaguaAiService baguaAiService) {
        this.baguaAiService = baguaAiService;
    }

    @PostMapping("/bagua-ai")
    public Result<String> baguaAiInterpret(@RequestBody String rawBody) {
        JSONObject body = new JSONObject(rawBody);
        String question = body.optString("question", "");
        JSONObject primaryHexagram = body.optJSONObject("primaryHexagram");
        JSONObject changedHexagram = body.optJSONObject("changedHexagram");
        JSONArray changingLines = body.optJSONArray("changingLines");
        String aiBaseUrl = body.optString("aiBaseUrl", "").trim();
        String aiModel = body.optString("aiModel", "").trim();
        String aiApiKey = body.optString("aiApiKey", "").trim();

        if (primaryHexagram == null || changedHexagram == null) {
            throw new BizException("缺少卦象数据");
        }
        if (aiBaseUrl.isBlank() || aiModel.isBlank() || aiApiKey.isBlank()) {
            throw new BizException("AI 配置不完整，请先在首页配置 AI");
        }

        String result = baguaAiService.interpret(question, primaryHexagram, changedHexagram,
                changingLines != null ? changingLines : new JSONArray(), aiBaseUrl, aiModel, aiApiKey);
        return Result.success(result);
    }
}
