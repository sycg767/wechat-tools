package com.wechat.tools.common;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class TaskMetricsTest {

    private MeterRegistry registry;
    private TaskMetrics metrics;

    @BeforeEach
    void setUp() {
        registry = new SimpleMeterRegistry();
        metrics = new TaskMetrics(registry);
    }

    @Test
    void createdCounterIncrementsByToolType() {
        metrics.onTaskCreated("t1", "pdf-word");
        metrics.onTaskCreated("t2", "pdf-word");
        metrics.onTaskCreated("t3", "compress-image");

        assertEquals(2.0, registry.counter("task.created", "tool_type", "pdf-word").count());
        assertEquals(1.0, registry.counter("task.created", "tool_type", "compress-image").count());
    }

    @Test
    void terminalStatusRecordsCompletedAndDuration() throws InterruptedException {
        metrics.onTaskCreated("t1", "pdf-word");
        Thread.sleep(5);
        metrics.onTaskFinished("t1", "SUCCESS");

        assertEquals(1.0,
                registry.counter("task.completed", "tool_type", "pdf-word", "status", "SUCCESS").count());
        assertNotNull(registry.find("task.duration").timer());
        assertEquals(1, registry.find("task.duration")
                .tags("tool_type", "pdf-word", "status", "SUCCESS")
                .timer().count());
    }

    @Test
    void nonTerminalStatusIgnored() {
        metrics.onTaskCreated("t1", "pdf-word");
        metrics.onTaskFinished("t1", "PROCESSING"); // 不应触发任何指标

        assertEquals(0.0,
                registry.counter("task.completed", "tool_type", "pdf-word", "status", "PROCESSING").count());
    }

    @Test
    void unknownTaskDoesNotCrash() {
        // 任务被重启或被外部直接更新状态时，inflight 里没有记录
        metrics.onTaskFinished("never-created", "FAIL");
        // 应该至少把 completed 计数记上，不抛异常
        assertEquals(1.0,
                registry.counter("task.completed", "tool_type", "unknown", "status", "FAIL").count());
    }
}
