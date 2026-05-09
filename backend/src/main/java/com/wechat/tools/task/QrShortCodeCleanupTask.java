package com.wechat.tools.task;

import com.wechat.tools.repository.QrShortCodeRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * 二维码短码过期清理：每天凌晨 4 点删除已过期记录。
 * 与 FileCleanupTask 错开，避免半夜抢资源。
 */
@Slf4j
@Component
public class QrShortCodeCleanupTask {

    private final QrShortCodeRepository qrShortCodeRepository;

    public QrShortCodeCleanupTask(QrShortCodeRepository qrShortCodeRepository) {
        this.qrShortCodeRepository = qrShortCodeRepository;
    }

    @Scheduled(cron = "0 0 4 * * ?")
    @Transactional
    public void cleanupExpired() {
        int deleted = qrShortCodeRepository.deleteAllExpired(LocalDateTime.now());
        if (deleted > 0) {
            log.info("已清理过期二维码短码 {} 条", deleted);
        }
    }
}
