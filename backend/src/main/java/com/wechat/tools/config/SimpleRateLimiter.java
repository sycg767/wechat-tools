package com.wechat.tools.config;

import java.util.ArrayDeque;
import java.util.Deque;

public class SimpleRateLimiter {

    private final int limit;
    private final long windowMillis;
    private final Deque<Long> timestamps = new ArrayDeque<>();
    private volatile long lastAccessAt;

    public SimpleRateLimiter(int limit, long windowMillis) {
        this.limit = limit;
        this.windowMillis = windowMillis;
        this.lastAccessAt = System.currentTimeMillis();
    }

    /**
     * 滑动窗口：保留最近 windowMillis 内的请求时间戳，超出窗口的弹出。
     * 相比固定窗口，消除了"在窗口切换瞬间打 2×limit 次"的边界突刺。
     */
    public synchronized boolean tryAcquire() {
        long now = System.currentTimeMillis();
        lastAccessAt = now;

        long windowStart = now - windowMillis;
        while (!timestamps.isEmpty() && timestamps.peekFirst() <= windowStart) {
            timestamps.pollFirst();
        }
        if (timestamps.size() >= limit) {
            return false;
        }
        timestamps.addLast(now);
        return true;
    }

    /** 给 Interceptor 的缓存清理用：长时间未访问的 limiter 可以淘汰。 */
    public long getLastAccessAt() {
        return lastAccessAt;
    }
}
