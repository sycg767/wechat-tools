package com.wechat.tools.service.impl;

import com.wechat.tools.entity.KingScoreMemberEntity;
import com.wechat.tools.entity.KingScoreRecordEntity;
import com.wechat.tools.entity.KingScoreSessionEntity;
import com.wechat.tools.repository.KingScoreMemberRepository;
import com.wechat.tools.repository.KingScoreRecordRepository;
import com.wechat.tools.repository.KingScoreSessionRepository;
import com.wechat.tools.service.KingScoreService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class KingScoreServiceImpl implements KingScoreService {

    @Autowired
    private KingScoreMemberRepository memberRepository;

    @Autowired
    private KingScoreSessionRepository sessionRepository;

    @Autowired
    private KingScoreRecordRepository recordRepository;

    @Override
    public List<KingScoreMemberEntity> getAllMembers() {
        return memberRepository.findAllByActiveTrueOrderByCreatedAtDesc();
    }

    @Override
    @Transactional
    public KingScoreMemberEntity addMember(String realName, List<String> gameNames) {
        KingScoreMemberEntity member = new KingScoreMemberEntity();
        member.setRealName(realName);
        member.setGameNames(gameNames);
        member.setDailyScoreDate(LocalDate.now());
        return memberRepository.save(member);
    }

    @Override
    @Transactional
    public KingScoreMemberEntity updateMember(UUID id, String realName, List<String> gameNames) {
        return memberRepository.findById(id).map(member -> {
            member.setRealName(realName);
            member.setGameNames(gameNames);
            return memberRepository.save(member);
        }).orElseThrow(() -> new RuntimeException("成员不存在"));
    }

    @Override
    @Transactional
    public void deleteMember(UUID id) {
        memberRepository.findById(id).ifPresent(member -> {
            member.setActive(false);
            memberRepository.save(member);
        });
    }

    @Override
    @Transactional
    public KingScoreSessionEntity createSession(String title, Map<String, Object> settings) {
        KingScoreSessionEntity session = new KingScoreSessionEntity();
        session.setTitle(title);
        session.setSettings(settings);
        return sessionRepository.save(session);
    }

    @Override
    @Transactional
    public KingScoreRecordEntity addRecord(UUID sessionId, UUID memberId, Map<String, Object> detail) {
        KingScoreMemberEntity member = memberRepository.findById(memberId)
                .orElseThrow(() -> new RuntimeException("成员不存在"));
        
        KingScoreRecordEntity record = new KingScoreRecordEntity();
        record.setSessionId(sessionId);
        record.setMember(member);
        record.setRecordDetail(detail);
        record.setMatchTime(LocalDateTime.now());
        
        // 更新成员扣分逻辑
        if (detail.containsKey("score")) {
            int score = ((Number) detail.get("score")).intValue();
            member.setDailyDeducted(member.getDailyDeducted() + score);
            member.setTotalDeducted(member.getTotalDeducted() + score);
            memberRepository.save(member);
        }
        
        return recordRepository.save(record);
    }

    @Override
    public List<KingScoreRecordEntity> getSessionRecords(UUID sessionId) {
        return recordRepository.findAllBySessionIdOrderByMatchTimeDesc(sessionId);
    }
}