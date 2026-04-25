package com.wechat.tools.config;

public class SimpleRateLimiter {

    private final int limit;
    private final long windowMillis;
    private long windowStart;
    private int requestCount;

    public SimpleRateLimiter(int limit, long windowMillis) {
        this.limit = limit;
        this.windowMillis = windowMillis;
        this.windowStart = System.currentTimeMillis();
        this.requestCount = 0;
    }

    public synchronized boolean tryAcquire() {
        long now = System.currentTimeMillis();
        if (now - windowStart >= windowMillis) {
            windowStart = now;
            requestCount = 0;
        }
        if (requestCount >= limit) {
            return false;
        }
        requestCount++;
        return true;
    }
}
