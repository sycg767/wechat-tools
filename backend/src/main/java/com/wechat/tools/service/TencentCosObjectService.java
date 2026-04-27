package com.wechat.tools.service;

public interface TencentCosObjectService {

    String uploadWordSource(String originalFileName, byte[] data, String contentType);

    byte[] downloadObject(String objectKey);

    void deleteObject(String objectKey);
}
