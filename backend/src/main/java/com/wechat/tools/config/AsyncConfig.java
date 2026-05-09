package com.wechat.tools.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionHandler;

@Configuration
@EnableConfigurationProperties({TencentCosProperties.class, TencentCiProperties.class})
public class AsyncConfig {

    private static final Logger log = LoggerFactory.getLogger(AsyncConfig.class);

    /**
     * 文件转换专用线程池。
     * <p>
     * 容量按 CPU 核数自适应：
     * <ul>
     *   <li>core = max(2, CPU 核数)：通常的稳定吞吐</li>
     *   <li>max  = core * 2：突发流量时短暂扩容</li>
     *   <li>queue = 50：故意调小。PDF/Word 这类任务单任务耗时长，
     *       排队 100+ 意味着最末尾用户要等 30 分钟以上，体验更差，
     *       不如让 CallerRunsPolicy 提前介入，把背压传到 Controller 线程。</li>
     * </ul>
     * Bean 名保留 "taskExecutor" 不变，避免改动 FileConversionTask 中 15 处 @Async("taskExecutor")。
     */
    @Bean(name = "taskExecutor")
    public Executor taskExecutor() {
        int cpuCount = Math.max(2, Runtime.getRuntime().availableProcessors());
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(cpuCount);
        executor.setMaxPoolSize(cpuCount * 2);
        executor.setQueueCapacity(50);
        executor.setKeepAliveSeconds(60);
        executor.setThreadNamePrefix("conversion-");
        executor.setRejectedExecutionHandler(loggingCallerRunsPolicy());
        // 应用关闭时等待在跑的任务收尾，防止半截文件
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        executor.initialize();
        log.info("文件转换线程池启动 core={} max={} queue=50", cpuCount, cpuCount * 2);
        return executor;
    }

    /**
     * 自定义 CallerRunsPolicy：在退化前打 warn，便于线上发现"线程池被打满"。
     */
    private RejectedExecutionHandler loggingCallerRunsPolicy() {
        return (r, executor) -> {
            log.warn("线程池已饱和 (active={}/{}, queue={}/{})，由调用线程同步执行任务",
                    executor.getActiveCount(),
                    executor.getMaximumPoolSize(),
                    executor.getQueue().size(),
                    executor.getQueue().size() + executor.getQueue().remainingCapacity());
            if (!executor.isShutdown()) {
                r.run();
            }
        };
    }
}