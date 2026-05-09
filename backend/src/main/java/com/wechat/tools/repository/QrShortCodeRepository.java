package com.wechat.tools.repository;

import com.wechat.tools.entity.QrShortCodeEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface QrShortCodeRepository extends JpaRepository<QrShortCodeEntity, String> {

    /**
     * 仅查询未过期的记录。过期记录由清理任务删除，但即便没及时清理，
     * 这里也会因为 expiresAt 早于 now 而拿不到。
     */
    Optional<QrShortCodeEntity> findByCodeAndExpiresAtAfter(String code, LocalDateTime now);

    @Modifying
    @Query("DELETE FROM QrShortCodeEntity q WHERE q.expiresAt < :before")
    int deleteAllExpired(@Param("before") LocalDateTime before);
}
