package com.wechat.tools.controller;

import com.wechat.tools.common.Result;
import com.wechat.tools.entity.KingScoreMemberEntity;
import com.wechat.tools.entity.KingScoreRecordEntity;
import com.wechat.tools.entity.KingScoreSessionEntity;
import com.wechat.tools.service.KingScoreService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/king-score")
public class KingScoreController {

    @Autowired
    private KingScoreService kingScoreService;

    @GetMapping("/members")
    public Result<List<KingScoreMemberEntity>> getMembers() {
        return Result.success(kingScoreService.getAllMembers());
    }

    @PostMapping("/members")
    public Result<KingScoreMemberEntity> addMember(@RequestBody Map<String, Object> params) {
        String realName = (String) params.get("realName");
        List<String> gameNames = (List<String>) params.get("gameNames");
        return Result.success(kingScoreService.addMember(realName, gameNames));
    }

    @PutMapping("/members/{id}")
    public Result<KingScoreMemberEntity> updateMember(@PathVariable UUID id, @RequestBody Map<String, Object> params) {
        String realName = (String) params.get("realName");
        List<String> gameNames = (List<String>) params.get("gameNames");
        return Result.success(kingScoreService.updateMember(id, realName, gameNames));
    }

    @DeleteMapping("/members/{id}")
    public Result<Void> deleteMember(@PathVariable UUID id) {
        kingScoreService.deleteMember(id);
        return Result.success(null);
    }

    @PostMapping("/sessions")
    public Result<KingScoreSessionEntity> createSession(@RequestBody Map<String, Object> params) {
        String title = (String) params.get("title");
        Map<String, Object> settings = (Map<String, Object>) params.get("settings");
        return Result.success(kingScoreService.createSession(title, settings));
    }

    @PostMapping("/sessions/{sessionId}/records")
    public Result<KingScoreRecordEntity> addRecord(
            @PathVariable UUID sessionId,
            @RequestBody Map<String, Object> params) {
        UUID memberId = UUID.fromString((String) params.get("memberId"));
        Map<String, Object> detail = (Map<String, Object>) params.get("detail");
        return Result.success(kingScoreService.addRecord(sessionId, memberId, detail));
    }

    @GetMapping("/sessions/{sessionId}/records")
    public Result<List<KingScoreRecordEntity>> getRecords(@PathVariable UUID sessionId) {
        return Result.success(kingScoreService.getSessionRecords(sessionId));
    }
}