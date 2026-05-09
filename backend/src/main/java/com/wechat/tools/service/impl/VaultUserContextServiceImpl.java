package com.wechat.tools.service.impl;

import com.wechat.tools.config.VaultProperties;
import com.wechat.tools.entity.UserEntity;
import com.wechat.tools.repository.UserRepository;
import com.wechat.tools.service.VaultUserContextService;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class VaultUserContextServiceImpl implements VaultUserContextService {

    private final VaultProperties vaultProperties;
    private final UserRepository userRepository;

    private UUID currentUserId;

    public VaultUserContextServiceImpl(VaultProperties vaultProperties, UserRepository userRepository) {
        this.vaultProperties = vaultProperties;
        this.userRepository = userRepository;
    }

    @PostConstruct
    @Transactional
    public void init() {
        String configuredUserId = vaultProperties.getDemoUserId();
        if (configuredUserId != null && !configuredUserId.isBlank()) {
            currentUserId = UUID.fromString(configuredUserId.trim());
            if (userRepository.findById(currentUserId).isEmpty()) {
                throw new IllegalStateException("配置了 vault.demo-user-id，但数据库中不存在对应用户");
            }
            return;
        }

        currentUserId = userRepository.findByOpenid(vaultProperties.getDemoOpenid())
                .map(UserEntity::getId)
                .orElseGet(() -> {
                    UserEntity user = new UserEntity();
                    user.setOpenid(vaultProperties.getDemoOpenid());
                    user.setNickname("本地演示用户");
                    return userRepository.save(user).getId();
                });
    }

    @Override
    public UUID getCurrentUserId() {
        return currentUserId;
    }
}
