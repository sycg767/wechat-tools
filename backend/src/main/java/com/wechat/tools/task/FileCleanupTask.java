package com.wechat.tools.task;

import com.qcloud.cos.COSClient;
import com.qcloud.cos.ClientConfig;
import com.qcloud.cos.auth.BasicCOSCredentials;
import com.qcloud.cos.auth.COSCredentials;
import com.qcloud.cos.model.COSObjectSummary;
import com.qcloud.cos.model.ObjectListing;
import com.qcloud.cos.region.Region;
import com.wechat.tools.config.TencentCosProperties;
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
import java.util.Date;
import java.util.List;
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

    private final TencentCosProperties cosProperties;

    public FileCleanupTask(TencentCosProperties cosProperties) {
        this.cosProperties = cosProperties;
    }

    @Scheduled(cron = "0 0 * * * ?")
    public void cleanupExpiredFiles() {
        if (!enabled) {
            return;
        }

        // 1. 清理本地过期文件
        cleanupLocalFiles();

        // 2. 清理 COS 过期文件
        cleanupCosFiles();
    }

    private void cleanupLocalFiles() {
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
            if (deletedCount > 0) {
                log.info("本地文件清理完成，删除过期文件数量: {}", deletedCount);
            }
        } catch (IOException e) {
            log.error("本地文件清理任务失败", e);
        }
    }

    private void cleanupCosFiles() {
        if (cosProperties.getSecretId() == null || cosProperties.getSecretId().isBlank()) {
            return;
        }

        Instant expireBefore = Instant.now().minus(maxAgeHours, ChronoUnit.HOURS);
        Date expireDate = Date.from(expireBefore);
        int deletedCount = 0;

        COSCredentials credentials = new BasicCOSCredentials(cosProperties.getSecretId(), cosProperties.getSecretKey());
        ClientConfig clientConfig = new ClientConfig(new Region(cosProperties.getRegion()));
        COSClient client = new COSClient(credentials, clientConfig);

        try {
            ObjectListing objectListing = client.listObjects(cosProperties.getBucket());
            List<COSObjectSummary> summaries = objectListing.getObjectSummaries();

            for (COSObjectSummary summary : summaries) {
                if (summary.getLastModified().before(expireDate)) {
                    client.deleteObject(cosProperties.getBucket(), summary.getKey());
                    deletedCount++;
                }
            }
            if (deletedCount > 0) {
                log.info("COS 文件清理完成，删除过期文件数量: {}", deletedCount);
            }
        } catch (Exception e) {
            log.error("COS 文件清理任务失败", e);
        } finally {
            client.shutdown();
        }
    }
}
