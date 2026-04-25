package com.wechat.tools.service;

import java.io.InputStream;

public interface FileStorageService {

    String uploadFile(String fileName, InputStream inputStream, long size, String contentType);

    InputStream downloadFile(String fileId);

    void deleteFile(String fileId);

    String getFileUrl(String fileId);

    String getFileUrl(String fileId, String displayName);
}