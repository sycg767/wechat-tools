package com.wechat.tools.service;

import com.wechat.tools.entity.KingScoreMemberEntity;
import com.wechat.tools.entity.KingScoreRecordEntity;
import com.wechat.tools.entity.KingScoreSessionEntity;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface KingScoreService {
    List<KingScoreMemberEntity> getAllMembers();
    KingScoreMemberEntity addMember(String realName, List<String> gameNames);
    KingScoreMemberEntity updateMember(UUID id, String realName, List<String> gameNames);
    void deleteMember(UUID id);
    
    KingScoreSessionEntity createSession(String title, Map<String, Object> settings);
    KingScoreRecordEntity addRecord(UUID sessionId, UUID memberId, Map<String, Object> detail);
    List<KingScoreRecordEntity> getSessionRecords(UUID sessionId);
}