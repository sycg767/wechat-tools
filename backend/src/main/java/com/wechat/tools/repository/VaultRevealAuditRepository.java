package com.wechat.tools.repository;

import com.wechat.tools.entity.VaultRevealAuditEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VaultRevealAuditRepository extends JpaRepository<VaultRevealAuditEntity, Long> {
}
