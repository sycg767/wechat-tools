package com.wechat.tools;

import com.wechat.tools.config.DotenvLoader;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableAsync
@EnableScheduling
public class WechatToolsApplication {
    public static void main(String[] args) {
        DotenvLoader.load();
        SpringApplication.run(WechatToolsApplication.class, args);
    }
}