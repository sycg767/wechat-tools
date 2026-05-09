package com.wechat.tools.common;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Tags;
import io.micrometer.core.instrument.Timer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.TimeUnit;

/**
 * 文件转换任务指标埋点。
 * <p>
 * 暴露在 /actuator/prometheus：
 * <ul>
 *   <li>{@code task_created_total{tool_type="..."}}：建任务计数</li>
 *   <li>{@code task_completed_total{tool_type="...",status="..."}}：终态计数</li>
 *   <li>{@code task_duration_seconds{tool_type="...",status="..."}}：从建任务到终态的耗时</li>
 * </ul>
 */
@Component
public class TaskMetrics {

    private static final Logger log = LoggerFactory.getLogger(TaskMetrics.class);

    private final MeterRegistry registry;

    /** taskId → 任务开始的纳秒时间。终态时取出来算耗时然后移除。 */
    private final ConcurrentMap<String, StartedTask> inflight = new ConcurrentHashMap<>();

    public TaskMetrics(MeterRegistry registry) {
        this.registry = registry;
    }

    public void onTaskCreated(String taskId, String toolType) {
        inflight.put(taskId, new StartedTask(toolType, System.nanoTime()));
        registry.counter("task.created", Tags.of("tool_type", safeTag(toolType))).increment();
    }

    /**
     * 任务进入终态时调用。非终态（PROCESSING）会被忽略。
     */
    public void onTaskFinished(String taskId, String status) {
        if (!isTerminal(status)) {
            return;
        }
        StartedTask started = inflight.remove(taskId);
        String toolType = started != null ? started.toolType : "unknown";
        Tags tags = Tags.of("tool_type", safeTag(toolType), "status", safeTag(status));

        registry.counter("task.completed", tags).increment();

        if (started != null) {
            long elapsedNanos = System.nanoTime() - started.startNanos;
            Timer.builder("task.duration")
                    .tags(tags)
                    .publishPercentiles(0.5, 0.95, 0.99)
                    .register(registry)
                    .record(elapsedNanos, TimeUnit.NANOSECONDS);
        } else {
            // 没有起始时间——通常是任务历史记录被复用或重启后 status 才更新，记 warn 即可
            log.debug("task {} 终态但没有开始时间记录", taskId);
        }
    }

    private static boolean isTerminal(String status) {
        return "SUCCESS".equals(status) || "FAIL".equals(status);
    }

    private static String safeTag(String value) {
        return value == null || value.isBlank() ? "unknown" : value;
    }

    private record StartedTask(String toolType, long startNanos) {}
}
