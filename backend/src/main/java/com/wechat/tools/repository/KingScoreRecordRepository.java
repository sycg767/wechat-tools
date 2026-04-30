package com.wechat.tools.repository;

import com.wechat.tools.entity.KingScoreRecordEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface KingScoreRecordRepository extends JpaRepository<KingScoreRecordEntity, UUID> {
    List<KingScoreRecordEntity> findAllBySessionIdOrderByMatchTimeDesc(UUID sessionId);
    List<KingScoreRecordEntity> findAllByMemberIdOrderByMatchTimeDesc(UUID memberId);
}