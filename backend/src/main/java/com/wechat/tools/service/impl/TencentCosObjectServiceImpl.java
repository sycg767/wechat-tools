package com.wechat.tools.service.impl;

import com.qcloud.cos.COSClient;
import com.qcloud.cos.ClientConfig;
import com.qcloud.cos.auth.BasicCOSCredentials;
import com.qcloud.cos.auth.COSCredentials;
import com.qcloud.cos.model.GetObjectRequest;
import com.qcloud.cos.model.ObjectMetadata;
import com.qcloud.cos.model.PutObjectRequest;
import com.qcloud.cos.region.Region;
import com.wechat.tools.config.TencentCiProperties;
import com.wechat.tools.config.TencentCosProperties;
import com.wechat.tools.service.TencentCosObjectService;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.UUID;

@Service
public class TencentCosObjectServiceImpl implements TencentCosObjectService {

    private final TencentCosProperties cosProperties;
    private final TencentCiProperties ciProperties;

    public TencentCosObjectServiceImpl(TencentCosProperties cosProperties, TencentCiProperties ciProperties) {
        this.cosProperties = cosProperties;
        this.ciProperties = ciProperties;
    }

    @Override
    public String uploadWordSource(String originalFileName, byte[] data, String contentType) {
        String extension = extractExtension(originalFileName);
        String fileName = UUID.randomUUID().toString().replace("-", "");
        String objectKey = normalizePrefix(ciProperties.getInputPrefix()) + fileName + (extension.isBlank() ? "" : "." + extension);

        ObjectMetadata metadata = new ObjectMetadata();
        metadata.setContentLength(data.length);
        metadata.setContentType(contentType == null || contentType.isBlank()
            ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            : contentType);

        COSClient client = createClient();
        try (ByteArrayInputStream inputStream = new ByteArrayInputStream(data)) {
            client.putObject(new PutObjectRequest(cosProperties.getBucket(), objectKey, inputStream, metadata));
            return objectKey;
        } catch (Exception e) {
            throw new RuntimeException("上传腾讯云 COS 失败: " + e.getMessage(), e);
        } finally {
            client.shutdown();
        }
    }

    @Override
    public byte[] downloadObject(String objectKey) {
        COSClient client = createClient();
        try (InputStream inputStream = client.getObject(new GetObjectRequest(cosProperties.getBucket(), objectKey)).getObjectContent();
             ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            inputStream.transferTo(outputStream);
            return outputStream.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("下载腾讯云 COS 文件失败: " + e.getMessage(), e);
        } finally {
            client.shutdown();
        }
    }

    @Override
    public void deleteObject(String objectKey) {
        if (objectKey == null || objectKey.isBlank()) {
            return;
        }
        COSClient client = createClient();
        try {
            client.deleteObject(cosProperties.getBucket(), objectKey);
        } catch (Exception e) {
            throw new RuntimeException("删除腾讯云 COS 文件失败: " + e.getMessage(), e);
        } finally {
            client.shutdown();
        }
    }

    private COSClient createClient() {
        validateConfig();
        COSCredentials credentials = new BasicCOSCredentials(cosProperties.getSecretId(), cosProperties.getSecretKey());
        ClientConfig clientConfig = new ClientConfig(new Region(cosProperties.getRegion()));
        return new COSClient(credentials, clientConfig);
    }

    private void validateConfig() {
        if (isBlank(cosProperties.getSecretId()) || isBlank(cosProperties.getSecretKey()) || isBlank(cosProperties.getRegion()) || isBlank(cosProperties.getBucket())) {
            throw new IllegalStateException("腾讯云 COS 配置不完整，请检查 TENCENT_COS_SECRET_ID/TENCENT_COS_SECRET_KEY/TENCENT_COS_REGION/TENCENT_COS_BUCKET");
        }
    }

    private String normalizePrefix(String prefix) {
        if (prefix == null || prefix.isBlank()) {
            return "";
        }
        return prefix.endsWith("/") ? prefix : prefix + "/";
    }

    private String extractExtension(String fileName) {
        if (fileName == null || !fileName.contains(".")) {
            return "";
        }
        return fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
