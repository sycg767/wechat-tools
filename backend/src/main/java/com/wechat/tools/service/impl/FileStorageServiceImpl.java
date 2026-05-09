package com.wechat.tools.service.impl;

import com.wechat.tools.service.FileStorageService;
import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Profile;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
@Profile("!prod")
public class FileStorageServiceImpl implements FileStorageService {

    @Value("${storage.local.base-path:storage}")
    private String basePath;

    @Value("${server.port:8080}")
    private String serverPort;

    @Value("${server.servlet.context-path:/api}")
    private String contextPath;

    private Path storageRoot;

    @PostConstruct
    public void initStorage() {
        try {
            storageRoot = Paths.get(basePath).toAbsolutePath().normalize();
            Files.createDirectories(storageRoot);
        } catch (IOException e) {
            throw new RuntimeException("初始化本地存储目录失败", e);
        }
    }

    @Override
    public String uploadFile(String fileName, InputStream inputStream, long size, String contentType) {
        try {
            String extension = extractExtension(fileName);
            String fileId = UUID.randomUUID().toString().replace("-", "");
            String storedFileName = extension.isEmpty() ? fileId : fileId + "." + extension;
            Path targetPath = storageRoot.resolve(storedFileName).normalize();
            Files.copy(inputStream, targetPath, StandardCopyOption.REPLACE_EXISTING);
            return storedFileName;
        } catch (IOException e) {
            throw new RuntimeException("文件上传失败", e);
        }
    }

    @Override
    public InputStream downloadFile(String fileId) {
        try {
            Path targetPath = storageRoot.resolve(fileId).normalize();
            if (!Files.exists(targetPath)) {
                throw new RuntimeException("文件不存在");
            }
            return Files.newInputStream(targetPath);
        } catch (IOException e) {
            throw new RuntimeException("文件下载失败", e);
        }
    }

    @Override
    public void deleteFile(String fileId) {
        try {
            Files.deleteIfExists(storageRoot.resolve(fileId).normalize());
        } catch (IOException e) {
            throw new RuntimeException("文件删除失败", e);
        }
    }

    @Override
    public String getFileUrl(String fileId) {
        return getFileUrl(fileId, null);
    }

    @Override
    public String getFileUrl(String fileId, String displayName) {
        // 自动获取本机 IP 以支持真机调试，如果获取失败则回退到 localhost
        String ip = "localhost";
        try {
            ip = java.net.InetAddress.getLocalHost().getHostAddress();
        } catch (Exception ignored) {}
        
        StringBuilder url = new StringBuilder("http://")
            .append(ip)
            .append(":")
            .append(serverPort)
            .append(contextPath)
            .append("/file/download/")
            .append(fileId)
            .append("?inline=true");
        if (displayName != null && !displayName.isBlank()) {
            try {
                url.append("&name=").append(java.net.URLEncoder.encode(displayName, "UTF-8"));
            } catch (java.io.UnsupportedEncodingException ignored) {}
        }
        return url.toString();
    }

    private String extractExtension(String fileName) {
        if (fileName == null || !fileName.contains(".")) {
            return "";
        }
        return fileName.substring(fileName.lastIndexOf('.') + 1);
    }
}
