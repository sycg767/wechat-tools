package com.wechat.tools.common;

import com.wechat.tools.service.FileStorageService;
import com.wechat.tools.service.TaskService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class FileTaskTemplateTest {

    private FileStorageService storage;
    private TaskService taskService;
    private FileTaskTemplate template;

    @BeforeEach
    void setUp() throws IOException {
        storage = mock(FileStorageService.class);
        taskService = mock(TaskService.class);
        when(storage.uploadFile(anyString(), any(), anyLong(), any())).thenReturn("file-123");
        when(taskService.createTask(anyString(), anyString())).thenReturn("task-456");
        template = new FileTaskTemplate(storage, taskService);
    }

    private static MultipartFile pdf(String name) {
        return new MockMultipartFile("file", name, "application/pdf", "fake".getBytes());
    }

    @Test
    void emptyFileThrowsBizException() {
        MockMultipartFile empty = new MockMultipartFile("file", "x.pdf", "application/pdf", new byte[0]);
        assertThrows(BizException.class,
                () -> template.submit(empty).asTask("pdf-word").run(ctx -> {}));
    }

    @Test
    void wrongExtensionRejected() {
        BizException ex = assertThrows(BizException.class,
                () -> template.submit(pdf("a.docx")).requireExtension(".pdf").asTask("pdf-word").run(ctx -> {}));
        assertEquals(400, ex.getCode());
    }

    @Test
    void wrongContentTypeRejected() {
        MultipartFile notImage = new MockMultipartFile("file", "a.pdf", "application/pdf", "x".getBytes());
        assertThrows(BizException.class,
                () -> template.submit(notImage)
                        .requireContentTypePrefix("image/")
                        .asTask("compress")
                        .run(ctx -> {}));
    }

    @Test
    void missingAsTaskFailsFast() {
        assertThrows(IllegalStateException.class,
                () -> template.submit(pdf("a.pdf")).run(ctx -> {}));
    }

    @Test
    void successfulRunInvokesRunnerWithContext() {
        AtomicReference<FileTaskTemplate.TaskContext> captured = new AtomicReference<>();
        Result<String> result = template.submit(pdf("a.pdf"))
                .requireExtension(".pdf")
                .asTask("pdf-word")
                .run(captured::set);

        assertEquals(200, result.getCode());
        assertEquals("task-456", result.getData());
        assertNotNull(captured.get());
        assertEquals("task-456", captured.get().taskId());
        assertEquals("file-123", captured.get().fileId());
        verify(taskService).createTask("pdf-word", "a.pdf");
    }

    @Test
    void originalNameOverridesFilename() {
        AtomicReference<FileTaskTemplate.TaskContext> captured = new AtomicReference<>();
        template.submit(pdf("temp.pdf"))
                .originalName("我的文档.pdf")
                .asTask("rename")
                .run(captured::set);
        assertEquals("我的文档.pdf", captured.get().fileName());
    }

    @Test
    void noFileTaskCreatesTaskWithoutUpload() throws IOException {
        AtomicReference<String> captured = new AtomicReference<>();
        Result<String> result = template.submitNoFile("qr-generate", "二维码", captured::set);

        assertEquals("task-456", result.getData());
        assertSame("task-456", captured.get());
        verify(storage, never()).uploadFile(anyString(), any(), anyLong(), any());
    }
}
