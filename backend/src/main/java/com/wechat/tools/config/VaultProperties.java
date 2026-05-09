package com.wechat.tools.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "vault")
public class VaultProperties {
    private String cryptoKey;
    private String demoUserId;
    private String demoOpenid = "vault-demo-user";
}
