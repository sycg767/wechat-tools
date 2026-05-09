package com.wechat.tools.controller;

import com.wechat.tools.common.BizException;
import com.wechat.tools.common.Result;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 开发者工具：文件 Hash 计算（文本 Hash 在前端做）。
 * 一次返回 MD5 / SHA-1 / SHA-256 三个值，避免多次上传。
 */
@RestController
@RequestMapping("/tool/dev")
public class DevToolController {

    private static final List<String> ALGORITHMS = List.of("MD5", "SHA-1", "SHA-256");
    private static final long MAX_HASH_FILE_SIZE = 50L * 1024 * 1024; // 50MB

    @PostMapping("/file-hash")
    public Result<Map<String, String>> fileHash(@RequestParam("file") MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new BizException("文件不能为空");
        }
        if (file.getSize() > MAX_HASH_FILE_SIZE) {
            throw new BizException("文件过大，请选择 50MB 以内的文件");
        }

        Map<String, MessageDigest> digests = new LinkedHashMap<>();
        for (String alg : ALGORITHMS) {
            try {
                digests.put(alg, MessageDigest.getInstance(alg));
            } catch (NoSuchAlgorithmException e) {
                throw new BizException(500, "算法不可用：" + alg);
            }
        }

        // 一次读流，喂给所有 digest，避免多次 IO
        try (InputStream in = file.getInputStream()) {
            byte[] buf = new byte[8 * 1024];
            int n;
            while ((n = in.read(buf)) > 0) {
                for (MessageDigest md : digests.values()) {
                    md.update(buf, 0, n);
                }
            }
        }

        Map<String, String> result = new LinkedHashMap<>();
        HexFormat hex = HexFormat.of();
        for (Map.Entry<String, MessageDigest> e : digests.entrySet()) {
            // 输出统一小写，Windows certutil/Linux sha256sum 都默认小写
            result.put(e.getKey().toLowerCase().replace("-", ""), hex.formatHex(e.getValue().digest()));
        }
        result.put("size", String.valueOf(file.getSize()));
        result.put("name", file.getOriginalFilename() == null ? "" : file.getOriginalFilename());
        return Result.success(result);
    }

    /**
     * 文本三种 Hash 一次返回，避免前端用 wx 原生算 Hash 的折腾。
     */
    @PostMapping(value = "/text-hash", consumes = "application/json")
    public Result<Map<String, String>> textHash(@RequestBody Map<String, String> payload) {
        String text = payload == null ? null : payload.get("text");
        if (text == null) {
            throw new BizException("缺少 text 参数");
        }
        byte[] bytes = text.getBytes(StandardCharsets.UTF_8);
        Map<String, String> result = new LinkedHashMap<>();
        HexFormat hex = HexFormat.of();
        for (String alg : ALGORITHMS) {
            try {
                MessageDigest md = MessageDigest.getInstance(alg);
                result.put(alg.toLowerCase().replace("-", ""), hex.formatHex(md.digest(bytes)));
            } catch (NoSuchAlgorithmException e) {
                throw new BizException(500, "算法不可用：" + alg);
            }
        }
        return Result.success(result);
    }

    /**
     * Base64 编/解码。小程序原生 wx.base64ToArrayBuffer/arrayBufferToBase64 处理 Unicode 麻烦，
     * 直接走后端最省事。
     */
    @PostMapping(value = "/base64", consumes = "application/json")
    public Result<Map<String, String>> base64(@RequestBody Map<String, String> payload) {
        String mode = payload == null ? null : payload.get("mode");
        String text = payload == null ? null : payload.get("text");
        if (text == null) {
            throw new BizException("缺少 text 参数");
        }
        if (!"encode".equals(mode) && !"decode".equals(mode)) {
            throw new BizException("mode 只支持 encode / decode");
        }
        try {
            String result;
            if ("encode".equals(mode)) {
                result = Base64.getEncoder().encodeToString(text.getBytes(StandardCharsets.UTF_8));
            } else {
                result = new String(Base64.getDecoder().decode(text), StandardCharsets.UTF_8);
            }
            return Result.success(Map.of("result", result));
        } catch (IllegalArgumentException e) {
            throw new BizException("Base64 解码失败：内容不是合法 Base64");
        }
    }
}
