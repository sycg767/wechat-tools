package com.wechat.tools.repository;

import com.wechat.tools.entity.KingScoreMemberEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface KingScoreMemberRepository extends JpaRepository<KingScoreMemberEntity, UUID> {
    List<KingScoreMemberEntity> findAllByActiveTrueOrderByCreatedAtDesc();
}