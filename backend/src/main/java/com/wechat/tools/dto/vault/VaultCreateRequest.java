package com.wechat.tools.dto.vault;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class VaultCreateRequest {
    @NotBlank(message = "平台不能为空")
    @Size(max = 120, message = "平台长度不能超过120")
    private String platform;

    @NotBlank(message = "账号不能为空")
    @Size(max = 160, message = "账号长度不能超过160")
    private String account;

    @NotBlank(message = "密码不能为空")
    private String password;

    @Size(max = 5000, message = "备注过长")
    private String note;
}
