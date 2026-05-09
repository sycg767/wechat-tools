package com.wechat.tools.service.impl;

import com.qcloud.cos.COSClient;
import com.qcloud.cos.ClientConfig;
import com.qcloud.cos.auth.BasicCOSCredentials;
import com.qcloud.cos.auth.COSCredentials;
import com.qcloud.cos.model.GeneratePresignedUrlRequest;
import com.qcloud.cos.model.GetObjectRequest;
import com.qcloud.cos.model.ObjectMetadata;
import com.qcloud.cos.model.PutObjectRequest;
import com.qcloud.cos.region.Region;
import com.wechat.tools.config.TencentCosProperties;
import com.wechat.tools.service.FileStorageService;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.net.URL;
import java.util.Date;
import java.util.UUID;

@Service
@Profile("prod")
public class TencentCosFileStorageServiceImpl implements FileStorageService {

    private final TencentCosProperties cosProperties;

    public TencentCosFileStorageServiceImpl(TencentCosProperties cosProperties) {
        this.cosProperties = cosProperties;
    }

    @Override
    public String uploadFile(String fileName, InputStream inputStream, long size, String contentType) {
        String extension = extractExtension(fileName);
        String fileId = UUID.randomUUID().toString().replace("-", "");
        String objectKey = extension.isEmpty() ? fileId : fileId + "." + extension;

        ObjectMetadata metadata = new ObjectMetadata();
        metadata.setContentLength(size);
        if (contentType != null && !contentType.isBlank()) {
            metadata.setContentType(contentType);
        }

        COSClient client = createClient();
        try {
            client.putObject(new PutObjectRequest(cosProperties.getBucket(), objectKey, inputStream, metadata));
            return objectKey;
        } catch (Exception e) {
            throw new RuntimeException("上传文件到腾讯云 COS 失败: " + e.getMessage(), e);
        } finally {
            client.shutdown();
        }
    }

    @Override
    public InputStream downloadFile(String fileId) {
        COSClient client = createClient();
        try {
            return client.getObject(new GetObjectRequest(cosProperties.getBucket(), fileId)).getObjectContent();
        } catch (Exception e) {
            client.shutdown();
            throw new RuntimeException("从腾讯云 COS 下载文件失败: " + e.getMessage(), e);
        }
    }

    @Override
    public void deleteFile(String fileId) {
        if (fileId == null || fileId.isBlank()) {
            return;
        }
        COSClient client = createClient();
        try {
            client.deleteObject(cosProperties.getBucket(), fileId);
        } catch (Exception e) {
            throw new RuntimeException("从腾讯云 COS 删除文件失败: " + e.getMessage(), e);
        } finally {
            client.shutdown();
        }
    }

    @Override
    public String getFileUrl(String fileId) {
        return getFileUrl(fileId, null);
    }

    @Override
    public String getFileUrl(String fileId, String displayName) {
        COSClient client = createClient();
        try {
            // 生成一个有效期为 1 小时的预签名 URL
            Date expiration = new Date(System.currentTimeMillis() + 3600 * 1000);
            GeneratePresignedUrlRequest request = new GeneratePresignedUrlRequest(cosProperties.getBucket(), fileId);
            request.setExpiration(expiration);
            
            // 如果需要设置下载时的文件名
            if (displayName != null && !displayName.isBlank()) {
                request.addRequestParameter("response-content-disposition", "attachment; filename=\"" + java.net.URLEncoder.encode(displayName, "UTF-8") + "\"");
            }

            URL url = client.generatePresignedUrl(request);
            return url.toString();
        } catch (Exception e) {
            throw new RuntimeException("生成腾讯云 COS 预签名 URL 失败: " + e.getMessage(), e);
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
            throw new IllegalStateException("腾讯云 COS 配置不完整，请检查配置文件中的 tencent.cos 相关项");
        }
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