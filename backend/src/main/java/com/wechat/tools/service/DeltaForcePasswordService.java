package com.wechat.tools.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.jsoup.Jsoup;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class DeltaForcePasswordService {

    private static final String SOURCE_NAME = "三角洲行动一图流";
    private static final String SOURCE_BASE_URL = "https://www.kkrb.net/";
    private static final String USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final Pattern SCRIPT_COOKIE_PATTERN = Pattern.compile("document\\.cookie\\s*=\\s*'([^']+)'");
    private static final Pattern LOCATION_PATTERN = Pattern.compile("window\\.location\\.href='([^']+)'");
    private static final List<MapEntry> MAP_ENTRIES = List.of(
            new MapEntry("db", "零号大坝"),
            new MapEntry("cgxg", "长弓溪谷"),
            new MapEntry("bks", "巴克什"),
            new MapEntry("htjd", "航天基地"),
            new MapEntry("cxjy", "潮汐监狱")
    );

    private final ObjectMapper objectMapper;

    public DeltaForcePasswordService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Value("${delta-force.password.source-url:https://www.kkrb.net/?viewpage=view%2Foverview}")
    private String sourceUrl;

    private volatile PasswordResponse cache;
    private volatile LocalDate cacheDate;

    public synchronized PasswordResponse getPasswords() {
        LocalDate today = LocalDate.now();
        if (cache != null && today.equals(cacheDate)) {
            return cache;
        }

        return refreshPasswords(today, true);
    }

    @Scheduled(cron = "0 15 0 * * ?")
    public synchronized void refreshAfterMidnight() {
        refreshPasswords(LocalDate.now(), false);
    }

    @Scheduled(cron = "0 5 5 * * ?")
    public synchronized void refreshEarlyMorningFallback() {
        refreshPasswords(LocalDate.now(), false);
    }

    private PasswordResponse refreshPasswords(LocalDate today, boolean failWithoutCache) {
        LocalDateTime now = LocalDateTime.now();
        try {
            PasswordResponse fresh = fetchPasswords(now, false);
            cache = fresh;
            cacheDate = today;
            return fresh;
        } catch (Exception e) {
            if (cache != null) {
                return cache.asStale(now);
            }
            if (failWithoutCache) {
                throw new IllegalStateException("每日密码获取失败: " + e.getMessage(), e);
            }
            return null;
        }
    }

    private PasswordResponse fetchPasswords(LocalDateTime now, boolean stale) throws IOException {
        SourceSession session = createSourceSession();
        String builtVersion = fetchBuiltVersion(session.cookies());
        JsonNode data = fetchOverviewData(session.cookies(), builtVersion);

        List<PasswordItem> items = new ArrayList<>();
        JsonNode passwordData = data.path("data").path("bdData");
        for (MapEntry entry : MAP_ENTRIES) {
            JsonNode item = passwordData.path(entry.key());
            String password = item.path("password").asText("");
            if (!password.isBlank()) {
                items.add(new PasswordItem(entry.mapName(), password, formatUpdatedAt(item.path("updated").asText(""))));
            }
        }
        if (items.isEmpty()) {
            throw new IllegalStateException("未解析到每日地图密码");
        }

        return new PasswordResponse(items, SOURCE_NAME, sourceUrl, TIME_FORMATTER.format(now), stale);
    }

    private SourceSession createSourceSession() throws IOException {
        var first = Jsoup.connect(sourceUrl)
                .userAgent(USER_AGENT)
                .timeout((int) Duration.ofSeconds(12).toMillis())
                .execute();

        String body = first.body();
        Map<String, String> cookies = new LinkedHashMap<>(first.cookies());
        boolean requiresCookieRetry = applyScriptCookie(body, cookies);

        if (requiresCookieRetry) {
            String retryUrl = resolveOverviewUrl(body);
            var retry = Jsoup.connect(retryUrl == null ? sourceUrl : retryUrl)
                    .userAgent(USER_AGENT)
                    .referrer(sourceUrl)
                    .cookies(cookies)
                    .timeout((int) Duration.ofSeconds(12).toMillis())
                    .execute();
            cookies.putAll(retry.cookies());
        }

        return new SourceSession(cookies);
    }

    private String fetchBuiltVersion(Map<String, String> cookies) throws IOException {
        String body = Jsoup.connect(SOURCE_BASE_URL + "getMenu")
                .userAgent(USER_AGENT)
                .referrer(sourceUrl)
                .header("X-Requested-With", "XMLHttpRequest")
                .cookies(cookies)
                .timeout((int) Duration.ofSeconds(12).toMillis())
                .ignoreContentType(true)
                .method(org.jsoup.Connection.Method.POST)
                .execute()
                .body();

        JsonNode json = objectMapper.readTree(body);
        String builtVersion = json.path("built_ver").asText("");
        if (builtVersion.isBlank()) {
            throw new IllegalStateException("未获取到数据版本");
        }
        return builtVersion;
    }

    private JsonNode fetchOverviewData(Map<String, String> cookies, String builtVersion) throws IOException {
        checkSourceStatus(cookies, builtVersion);

        String body = Jsoup.connect(SOURCE_BASE_URL + "getOVData")
                .userAgent(USER_AGENT)
                .referrer(sourceUrl)
                .header("X-Requested-With", "XMLHttpRequest")
                .cookies(cookies)
                .data("version", builtVersion)
                .data("globalData", "false")
                .timeout((int) Duration.ofSeconds(12).toMillis())
                .ignoreContentType(true)
                .method(org.jsoup.Connection.Method.POST)
                .execute()
                .body();

        JsonNode json = objectMapper.readTree(body);
        if (json.path("code").asInt() != 1) {
            throw new IllegalStateException(json.path("msg").asText("数据接口返回异常"));
        }
        return json;
    }

    private void checkSourceStatus(Map<String, String> cookies, String builtVersion) throws IOException {
        String body = Jsoup.connect(SOURCE_BASE_URL + "checkUAStatus")
                .userAgent(USER_AGENT)
                .referrer(sourceUrl)
                .header("X-Requested-With", "XMLHttpRequest")
                .cookies(cookies)
                .data("version", builtVersion)
                .timeout((int) Duration.ofSeconds(12).toMillis())
                .ignoreContentType(true)
                .method(org.jsoup.Connection.Method.POST)
                .execute()
                .body();

        JsonNode json = objectMapper.readTree(body);
        if (json.path("code").asInt() != 1) {
            throw new IllegalStateException(json.path("msg").asText("数据源状态异常"));
        }
    }

    private boolean applyScriptCookie(String body, Map<String, String> cookies) {
        Matcher matcher = SCRIPT_COOKIE_PATTERN.matcher(body == null ? "" : body);
        if (!matcher.find()) {
            return false;
        }
        String cookie = matcher.group(1).split(";", 2)[0];
        int separatorIndex = cookie.indexOf('=');
        if (separatorIndex <= 0) {
            return false;
        }
        cookies.put(cookie.substring(0, separatorIndex), cookie.substring(separatorIndex + 1));
        return true;
    }

    private String resolveOverviewUrl(String body) {
        Matcher matcher = LOCATION_PATTERN.matcher(body == null ? "" : body);
        if (!matcher.find()) {
            return null;
        }
        String path = matcher.group(1);
        if (path.startsWith("http")) {
            return path;
        }
        return SOURCE_BASE_URL.substring(0, SOURCE_BASE_URL.length() - 1) + path;
    }

    private String formatUpdatedAt(String value) {
        if (value == null || value.length() < 8) {
            return "";
        }
        return value.substring(0, 4) + "-" + value.substring(4, 6) + "-" + value.substring(6, 8);
    }

    public record PasswordResponse(
            List<PasswordItem> items,
            String sourceName,
            String sourceUrl,
            String fetchedAt,
            boolean stale
    ) {
        PasswordResponse asStale(LocalDateTime now) {
            return new PasswordResponse(items, sourceName, sourceUrl, TIME_FORMATTER.format(now), true);
        }
    }

    public record PasswordItem(String mapName, String password, String updatedAt) {
    }

    private record MapEntry(String key, String mapName) {
    }

    private record SourceSession(Map<String, String> cookies) {
    }
}