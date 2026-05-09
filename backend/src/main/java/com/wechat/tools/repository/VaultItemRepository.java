package com.wechat.tools.repository;

import com.wechat.tools.entity.VaultItemEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface VaultItemRepository extends JpaRepository<VaultItemEntity, Long> {
    Optional<VaultItemEntity> findByIdAndUserIdAndDeletedAtIsNull(Long id, UUID userId);

    Page<VaultItemEntity> findByUserIdAndDeletedAtIsNull(UUID userId, Pageable pageable);

    Page<VaultItemEntity> findByUserIdAndDeletedAtIsNullAndPlatformContainingIgnoreCaseOrUserIdAndDeletedAtIsNullAndAccountContainingIgnoreCase(
            UUID userId1, String platformKeyword, UUID userId2, String accountKeyword, Pageable pageable);
}
