package com.wechat.tools.repository;

import com.wechat.tools.entity.KingScoreSessionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface KingScoreSessionRepository extends JpaRepository<KingScoreSessionEntity, UUID> {
}