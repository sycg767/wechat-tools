package com.wechat.tools.config;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SimpleRateLimiterTest {

    @Test
    void allowsUpToLimitWithinWindow() {
        SimpleRateLimiter limiter = new SimpleRateLimiter(3, 1_000);
        assertTrue(limiter.tryAcquire());
        assertTrue(limiter.tryAcquire());
        assertTrue(limiter.tryAcquire());
        assertFalse(limiter.tryAcquire(), "第 4 次应被限流");
    }

    @Test
    void recoversAfterWindowSlidesForward() throws InterruptedException {
        SimpleRateLimiter limiter = new SimpleRateLimiter(2, 200);
        assertTrue(limiter.tryAcquire());
        assertTrue(limiter.tryAcquire());
        assertFalse(limiter.tryAcquire());

        // 等待窗口滑过，最早的两个时间戳都应过期
        Thread.sleep(220);
        assertTrue(limiter.tryAcquire(), "窗口滑过后应放行");
    }

    @Test
    void slidingWindowPreventsBoundaryBurst() throws InterruptedException {
        // 固定窗口的经典反例：在窗口边界附近能打 2x limit
        // 滑动窗口必须能阻止这种情况
        SimpleRateLimiter limiter = new SimpleRateLimiter(2, 300);
        assertTrue(limiter.tryAcquire());
        assertTrue(limiter.tryAcquire());

        // 在窗口快结束时，再尝试两次——滑动窗口看的是"过去 300ms 内的总数"
        Thread.sleep(280);
        assertFalse(limiter.tryAcquire(), "窗口未完全滑过前不应放行");
    }

    @Test
    void lastAccessAtTracksMostRecentCall() throws InterruptedException {
        SimpleRateLimiter limiter = new SimpleRateLimiter(10, 1_000);
        long before = limiter.getLastAccessAt();
        Thread.sleep(10);
        limiter.tryAcquire();
        assertTrue(limiter.getLastAccessAt() > before, "tryAcquire 后 lastAccessAt 应更新");
    }
}
