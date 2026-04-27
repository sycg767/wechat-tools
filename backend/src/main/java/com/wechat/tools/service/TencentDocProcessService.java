package com.wechat.tools.service;

public interface TencentDocProcessService {

    record DocProcessResult(String jobId, String outputObjectKey, String state, String message) {
    }

    String submitWordToPdf(String sourceObjectKey, String sourceExtension, String outputObjectKey);

    DocProcessResult waitForCompletion(String jobId, String expectedOutputObjectKey) throws InterruptedException;
}
