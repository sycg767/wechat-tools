package com.wechat.tools.common;

import com.wechat.tools.config.SimpleRateLimiter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    private final ConcurrentHashMap<String, SimpleRateLimiter> rateLimiterCache;

    public RateLimitInterceptor(ConcurrentHashMap<String, SimpleRateLimiter> rateLimiterCache) {
        this.rateLimiterCache = rateLimiterCache;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String uri = request.getRequestURI();
        if (!(uri.contains("/file/upload") || uri.contains("/tool/rename") || uri.contains("/task/create"))) {
            return true;
        }

        String key = request.getRemoteAddr() + ":" + uri;
        SimpleRateLimiter limiter = rateLimiterCache.computeIfAbsent(key, k -> new SimpleRateLimiter(20, 60_000));
        if (limiter.tryAcquire()) {
            return true;
        }

        response.setStatus(429);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{\"code\":429,\"message\":\"请求过于频繁，请稍后再试\",\"data\":null}");
        return false;
    }
}
