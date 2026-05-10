package com.wechat.tools.config;

import java.io.BufferedReader;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

public final class DotenvLoader {

    private DotenvLoader() {
    }

    public static void load() {
        loadFile(Path.of("backend", ".env"));
        loadFile(Path.of(".env"));
    }

    private static void loadFile(Path path) {
        if (!Files.isRegularFile(path)) return;
        try (BufferedReader reader = Files.newBufferedReader(path, StandardCharsets.UTF_8)) {
            String line;
            while ((line = reader.readLine()) != null) {
                apply(line);
            }
        } catch (IOException ignored) {
        }
    }

    private static void apply(String line) {
        String value = line.trim();
        if (value.isEmpty() || value.startsWith("#")) return;
        int index = value.indexOf('=');
        if (index <= 0) return;
        String key = value.substring(0, index).trim();
        String raw = value.substring(index + 1).trim();
        if (System.getProperty(key) != null || System.getenv(key) != null) return;
        System.setProperty(key, unquote(raw));
    }

    private static String unquote(String value) {
        if (value.length() >= 2 && ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'")))) {
            return value.substring(1, value.length() - 1);
        }
        return value;
    }
}
