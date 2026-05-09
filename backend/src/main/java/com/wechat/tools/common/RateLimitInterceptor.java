package com.wechat.tools.common;

import com.wechat.tools.config.SimpleRateLimiter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    private static final int LIMIT_PER_MINUTE = 20;
    private static final int VAULT_REVEAL_LIMIT_PER_MINUTE = 5;
    private static final long WINDOW_MILLIS = 60_000L;

    /** Map 容量超过这个阈值就触发一次清理，避免 IP 漂移导致无限增长。 */
    private static final int CACHE_PURGE_THRESHOLD = 5_000;

    /** 长时间未访问（5×窗口）的 limiter 视为陈旧，清理时移除。 */
    private static final long STALE_AFTER_MILLIS = WINDOW_MILLIS * 5;

    private final ConcurrentHashMap<String, SimpleRateLimiter> rateLimiterCache;

    public RateLimitInterceptor(ConcurrentHashMap<String, SimpleRateLimiter> rateLimiterCache) {
        this.rateLimiterCache = rateLimiterCache;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String uri = request.getRequestURI();
        boolean isCommonProtected = uri.contains("/file/upload") || uri.contains("/tool/rename") || uri.contains("/task/create");
        boolean isVaultReveal = uri.matches(".*/vault/items/[^/]+/reveal$");
        if (!isCommonProtected && !isVaultReveal) {
            return true;
        }

        int limit = isVaultReveal ? VAULT_REVEAL_LIMIT_PER_MINUTE : LIMIT_PER_MINUTE;
        String key = request.getRemoteAddr() + ":" + uri;
        SimpleRateLimiter limiter = rateLimiterCache
                .computeIfAbsent(key, k -> new SimpleRateLimiter(limit, WINDOW_MILLIS));

        if (rateLimiterCache.size() > CACHE_PURGE_THRESHOLD) {
            purgeStale();
        }

        if (limiter.tryAcquire()) {
            return true;
        }

        response.setStatus(429);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{\"code\":429,\"message\":\"请求过于频繁，请稍后再试\",\"data\":null}");
        return false;
    }

    private void purgeStale() {
        long threshold = System.currentTimeMillis() - STALE_AFTER_MILLIS;
        rateLimiterCache.entrySet().removeIf(e -> e.getValue().getLastAccessAt() < threshold);
    }
}
