package com.wechat.tools.common;

import lombok.Data;

@Data
public class FileUploadResult {
    private String fileId;
    private String fileName;
    private Long fileSize;
    private String contentType;

    public FileUploadResult() {}

    public FileUploadResult(String fileId, String fileName, Long fileSize, String contentType) {
        this.fileId = fileId;
        this.fileName = fileName;
        this.fileSize = fileSize;
        this.contentType = contentType;
    }
}