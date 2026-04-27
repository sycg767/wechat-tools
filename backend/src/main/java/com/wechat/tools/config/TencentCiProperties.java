package com.wechat.tools.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "tencent.ci")
public class TencentCiProperties {

    private String queueId;
    private String inputPrefix;
    private String outputPrefix;
    private long pollIntervalMillis;
    private long timeoutSeconds;
    private boolean keepRemoteFiles;

    public String getQueueId() {
        return queueId;
    }

    public void setQueueId(String queueId) {
        this.queueId = queueId;
    }

    public String getInputPrefix() {
        return inputPrefix;
    }

    public void setInputPrefix(String inputPrefix) {
        this.inputPrefix = inputPrefix;
    }

    public String getOutputPrefix() {
        return outputPrefix;
    }

    public void setOutputPrefix(String outputPrefix) {
        this.outputPrefix = outputPrefix;
    }

    public long getPollIntervalMillis() {
        return pollIntervalMillis;
    }

    public void setPollIntervalMillis(long pollIntervalMillis) {
        this.pollIntervalMillis = pollIntervalMillis;
    }

    public long getTimeoutSeconds() {
        return timeoutSeconds;
    }

    public void setTimeoutSeconds(long timeoutSeconds) {
        this.timeoutSeconds = timeoutSeconds;
    }

    public boolean isKeepRemoteFiles() {
        return keepRemoteFiles;
    }

    public void setKeepRemoteFiles(boolean keepRemoteFiles) {
        this.keepRemoteFiles = keepRemoteFiles;
    }
}
