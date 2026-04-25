package com.wechat.tools.task;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.attribute.FileTime;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.stream.Stream;

@Slf4j
@Component
public class FileCleanupTask {

    @Value("${file.cleanup.enabled:true}")
    private boolean enabled;

    @Value("${file.cleanup.max-age-hours:24}")
    private int maxAgeHours;

    @Value("${storage.local.base-path:storage}")
    private String basePath;

    @Scheduled(cron = "0 0 * * * ?")
    public void cleanupExpiredFiles() {
        if (!enabled) {
            return;
        }

        Path storageRoot = Paths.get(basePath).toAbsolutePath().normalize();
        if (!Files.exists(storageRoot)) {
            return;
        }

        Instant expireBefore = Instant.now().minus(maxAgeHours, ChronoUnit.HOURS);
        int deletedCount = 0;

        try (Stream<Path> paths = Files.list(storageRoot)) {
            for (Path path : paths.toList()) {
                if (!Files.isRegularFile(path)) {
                    continue;
                }
                FileTime lastModifiedTime = Files.getLastModifiedTime(path);
                if (lastModifiedTime.toInstant().isBefore(expireBefore)) {
                    Files.deleteIfExists(path);
                    deletedCount++;
                }
            }
            log.info("文件清理任务完成，删除过期文件数量: {}", deletedCount);
        } catch (IOException e) {
            log.error("文件清理任务失败", e);
        }
    }
}
