package com.wechat.tools.pdf;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Component
public class PdfcpuRunner {

    @Value("${pdfcpu.enabled:true}")
    private boolean enabled;

    @Value("${pdfcpu.binary-path:}")
    private String configuredBinaryPath;

    @Value("${pdfcpu.timeout-seconds:60}")
    private long timeoutSeconds;

    private volatile String resolvedBinary;

    public void removeWatermark(Path inputFile, Path outputFile) throws IOException, InterruptedException {
        runOrThrow(List.of(resolveBinaryPath(), "watermark", "remove", inputFile.toString(), outputFile.toString()), true);
    }

    public void removeStamp(Path inputFile, Path outputFile) throws IOException, InterruptedException {
        runOrThrow(List.of(resolveBinaryPath(), "stamp", "remove", inputFile.toString(), outputFile.toString()), true);
    }

    public void collect(Path inputFile, Path outputFile, String pageRange) throws IOException, InterruptedException {
        runOrThrow(List.of(resolveBinaryPath(), "collect", "-p", pageRange, inputFile.toString(), outputFile.toString()), false);
    }

    public void rotate(Path inputFile, Path outputFile, int rotation) throws IOException, InterruptedException {
        runOrThrow(List.of(resolveBinaryPath(), "rotate", inputFile.toString(), String.valueOf(rotation), outputFile.toString()), false);
    }

    private String resolveBinaryPath() throws IOException {
        if (!enabled) {
            throw new IOException("pdfcpu 已禁用");
        }
        if (resolvedBinary != null) {
            return resolvedBinary;
        }

        List<String> candidates = new ArrayList<>();
        if (configuredBinaryPath != null && !configuredBinaryPath.isBlank()) {
            candidates.add(configuredBinaryPath.trim());
        }

        String osName = System.getProperty("os.name", "").toLowerCase();
        boolean isWindows = osName.contains("win");
        boolean isMac = osName.contains("mac");
        if (isWindows) {
            candidates.add("pdfcpu.exe");
            candidates.add("pdfcpu");
            candidates.add("backend/tools/pdfcpu/windows/pdfcpu.exe");
            candidates.add("tools/pdfcpu/windows/pdfcpu.exe");
            candidates.add("backend/tools/pdfcpu/pdfcpu.exe");
            candidates.add("tools/pdfcpu/pdfcpu.exe");
            candidates.add("pdfcpu/pdfcpu.exe");
        } else if (isMac) {
            candidates.add("pdfcpu");
            candidates.add("backend/tools/pdfcpu/macos/pdfcpu");
            candidates.add("tools/pdfcpu/macos/pdfcpu");
            candidates.add("backend/tools/pdfcpu/pdfcpu");
            candidates.add("tools/pdfcpu/pdfcpu");
            candidates.add("pdfcpu/pdfcpu");
        } else {
            candidates.add("pdfcpu");
            candidates.add("backend/tools/pdfcpu/linux/pdfcpu");
            candidates.add("tools/pdfcpu/linux/pdfcpu");
            candidates.add("backend/tools/pdfcpu/pdfcpu");
            candidates.add("tools/pdfcpu/pdfcpu");
            candidates.add("pdfcpu/pdfcpu");
        }

        for (String candidate : candidates) {
            if (candidate == null || candidate.isBlank()) {
                continue;
            }
            String normalized = candidate.trim();
            Path localPath = Path.of(normalized);
            if (localPath.getNameCount() > 1) {
                Path absolute = localPath.isAbsolute() ? localPath : Path.of(System.getProperty("user.dir")).resolve(localPath).normalize();
                if (!Files.exists(absolute)) {
                    continue;
                }
                normalized = absolute.toString();
            }
            if (isCallable(normalized)) {
                resolvedBinary = normalized;
                return resolvedBinary;
            }
        }

        throw new IOException("未找到 pdfcpu 可执行文件。请将 pdfcpu 放到 backend/tools/pdfcpu/{windows|linux|macos}/ 目录，或配置 pdfcpu.binary-path");
    }

    private boolean isCallable(String binary) {
        Process process = null;
        try {
            process = new ProcessBuilder(binary, "version").redirectErrorStream(true).start();
            process.waitFor(3, TimeUnit.SECONDS);
            return process.exitValue() == 0;
        } catch (Exception ignored) {
            return false;
        } finally {
            if (process != null && process.isAlive()) {
                process.destroyForcibly();
            }
        }
    }

    private void runOrThrow(List<String> command, boolean allowNoWatermarkAsSuccess) throws IOException, InterruptedException {
        ProcessBuilder pb = new ProcessBuilder(command);
        pb.redirectErrorStream(true);
        Process process = pb.start();

        String output;
        try (InputStream in = process.getInputStream()) {
            output = readAll(in);
        }

        boolean finished = process.waitFor(timeoutSeconds, TimeUnit.SECONDS);
        if (!finished) {
            process.destroyForcibly();
            throw new IOException("pdfcpu 执行超时");
        }

        int exitCode = process.exitValue();
        if (exitCode != 0) {
            String normalizedOutput = output == null ? "" : output.toLowerCase();
            if (allowNoWatermarkAsSuccess && (normalizedOutput.contains("no watermarks found") || normalizedOutput.contains("no stamps found"))) {
                return;
            }
            throw new IOException("pdfcpu 执行失败(" + exitCode + "): " + output);
        }
    }

    private String readAll(InputStream in) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[4096];
        int n;
        while ((n = in.read(buf)) != -1) {
            out.write(buf, 0, n);
        }
        return out.toString();
    }
}
