package com.wechat.tools.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.ConcurrentHashMap;

@Configuration
public class RateLimitConfig {

    @Bean
    public ConcurrentHashMap<String, SimpleRateLimiter> rateLimiterCache() {
        return new ConcurrentHashMap<>();
    }
}
