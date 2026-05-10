package com.wechat.tools.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wechat.tools.common.BizException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class FreeAstroFortuneService {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final List<String> BODIES = List.of("Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto");
    private static final List<ZodiacInfo> ZODIACS = List.of(
            new ZodiacInfo("白羊座", "3.21-4.19", "火象", "基本宫", "火星", List.of("主动", "开局", "直接"), "天秤座"),
            new ZodiacInfo("金牛座", "4.20-5.20", "土象", "固定宫", "金星", List.of("稳定", "积累", "感官"), "天蝎座"),
            new ZodiacInfo("双子座", "5.21-6.21", "风象", "变动宫", "水星", List.of("沟通", "信息", "灵活"), "射手座"),
            new ZodiacInfo("巨蟹座", "6.22-7.22", "水象", "基本宫", "月亮", List.of("照顾", "安全感", "情绪"), "摩羯座"),
            new ZodiacInfo("狮子座", "7.23-8.22", "火象", "固定宫", "太阳", List.of("表达", "自信", "创造"), "水瓶座"),
            new ZodiacInfo("处女座", "8.23-9.22", "土象", "变动宫", "水星", List.of("细节", "整理", "效率"), "双鱼座"),
            new ZodiacInfo("天秤座", "9.23-10.23", "风象", "基本宫", "金星", List.of("平衡", "协作", "审美"), "白羊座"),
            new ZodiacInfo("天蝎座", "10.24-11.22", "水象", "固定宫", "冥王星", List.of("洞察", "边界", "深度"), "金牛座"),
            new ZodiacInfo("射手座", "11.23-12.21", "火象", "变动宫", "木星", List.of("探索", "学习", "远方"), "双子座"),
            new ZodiacInfo("摩羯座", "12.22-1.19", "土象", "基本宫", "土星", List.of("目标", "责任", "结构"), "巨蟹座"),
            new ZodiacInfo("水瓶座", "1.20-2.18", "风象", "固定宫", "天王星", List.of("创新", "社群", "独立"), "狮子座"),
            new ZodiacInfo("双鱼座", "2.19-3.20", "水象", "变动宫", "海王星", List.of("感受", "想象", "共情"), "处女座")
    );
    private static final Map<String, String> BODY_NAMES = Map.ofEntries(
            Map.entry("Sun", "太阳"), Map.entry("Moon", "月亮"), Map.entry("Mercury", "水星"), Map.entry("Venus", "金星"), Map.entry("Mars", "火星"),
            Map.entry("Jupiter", "木星"), Map.entry("Saturn", "土星"), Map.entry("Uranus", "天王星"), Map.entry("Neptune", "海王星"), Map.entry("Pluto", "冥王星")
    );
    private static final Map<String, String> SIGN_NAMES = Map.ofEntries(
            Map.entry("aries", "白羊座"), Map.entry("taurus", "金牛座"), Map.entry("gemini", "双子座"), Map.entry("cancer", "巨蟹座"),
            Map.entry("leo", "狮子座"), Map.entry("virgo", "处女座"), Map.entry("libra", "天秤座"), Map.entry("scorpio", "天蝎座"),
            Map.entry("sagittarius", "射手座"), Map.entry("capricorn", "摩羯座"), Map.entry("aquarius", "水瓶座"), Map.entry("pisces", "双鱼座")
    );
    private static final List<String> COLORS = List.of("米白色", "岩灰色", "墨绿色", "雾蓝色", "暖棕色", "珍珠灰", "松石色", "浅金色", "银白色", "焦糖色");
    private static final List<Integer> NUMBERS = List.of(1, 2, 3, 5, 6, 7, 8, 9, 11, 12);
    private static final List<String> TIMES = List.of("08:00-10:00", "10:00-12:00", "13:00-15:00", "16:00-18:00", "19:00-21:00", "21:00-23:00");
    private static final List<String> DIRECTIONS = List.of("正东", "正西", "正南", "正北", "东南", "西南", "东北", "西北");

    private final ObjectMapper objectMapper;
    private final Map<String, FortuneResponse> cache = new ConcurrentHashMap<>();

    @Value("${free-astro.enabled:false}")
    private boolean enabled;

    @Value("${free-astro.api-key:}")
    private String apiKey;

    @Value("${free-astro.base-url:https://api.freeastroapi.com}")
    private String baseUrl;

    @Value("${free-astro.timeout-millis:5000}")
    private int timeoutMillis;

    public FreeAstroFortuneService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public FortuneResponse getFortune(String sign, String dateText) {
        ZodiacInfo zodiac = findZodiac(sign);
        LocalDate date = parseDate(dateText);
        if (!enabled || apiKey == null || apiKey.isBlank()) {
            throw new BizException(503, "真实天象服务未配置");
        }
        String cacheKey = date + "_" + zodiac.name();
        FortuneResponse cached = cache.get(cacheKey);
        if (cached != null) return cached;
        List<PlanetPosition> positions = fetchPlanetPositions(date);
        FortuneResponse response = buildFortune(zodiac, date, positions);
        cache.put(cacheKey, response);
        return response;
    }

    private List<PlanetPosition> fetchPlanetPositions(LocalDate date) {
        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("start", date + "T12:00:00Z");
            payload.put("bodies", BODIES);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(trimSlash(baseUrl) + "/api/v1/ephemeris/calculate"))
                    .timeout(Duration.ofMillis(Math.max(1000, timeoutMillis)))
                    .header("Content-Type", "application/json")
                    .header("x-api-key", apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload)))
                    .build();
            HttpResponse<String> response = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofMillis(Math.max(1000, timeoutMillis)))
                    .build()
                    .send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new BizException(502, "真实天象服务暂不可用");
            }
            JsonNode root = objectMapper.readTree(response.body());
            List<PlanetPosition> positions = new ArrayList<>();
            collectPositions(root, positions);
            if (positions.isEmpty()) {
                throw new BizException(502, "真实天象数据解析失败");
            }
            return positions;
        } catch (BizException e) {
            throw e;
        } catch (Exception e) {
            throw new BizException(502, "真实天象服务请求失败", e);
        }
    }

    private void collectPositions(JsonNode node, List<PlanetPosition> positions) {
        if (node == null || node.isNull()) return;
        if (node.isArray()) {
            node.forEach(item -> collectPositions(item, positions));
            return;
        }
        if (node.isObject()) {
            String body = firstText(node, "body", "name", "planet", "planetName");
            String sign = firstText(node, "sign", "zodiac", "zodiacSign", "signName");
            if (isKnownBody(body) && sign != null && !sign.isBlank()) {
                positions.add(new PlanetPosition(normalizeBody(body), localizeSign(sign), firstDecimal(node, "longitude", "lon", "eclipticLongitude", "absoluteDegree", "fullDegree"), firstDecimal(node, "degree", "degrees", "signDegree", "position"), firstDecimal(node, "speed", "velocity", "dailyMotion"), isRetrograde(node)));
            }
            node.fields().forEachRemaining(entry -> collectPositions(entry.getValue(), positions));
        }
    }

    private FortuneResponse buildFortune(ZodiacInfo zodiac, LocalDate date, List<PlanetPosition> positions) {
        Map<String, PlanetPosition> byBody = new LinkedHashMap<>();
        for (PlanetPosition position : positions) byBody.putIfAbsent(position.body(), position);
        PlanetPosition moon = byBody.getOrDefault("Moon", positions.get(0));
        PlanetPosition mercury = byBody.getOrDefault("Mercury", moon);
        PlanetPosition venus = byBody.getOrDefault("Venus", moon);
        PlanetPosition mars = byBody.getOrDefault("Mars", moon);
        int seed = Math.abs((date + zodiac.name() + moon.sign()).hashCode());
        String axis = chooseAxis(moon, mercury, venus, mars);
        int loveScore = score(seed, 5, venus.sign(), zodiac.name());
        int careerScore = score(seed, 7, mercury.sign(), zodiac.name());
        int wealthScore = score(seed, 11, byBody.getOrDefault("Jupiter", moon).sign(), zodiac.name());
        int healthScore = score(seed, 13, mars.sign(), zodiac.name());
        int overall = Math.round((loveScore + careerScore + wealthScore + healthScore) / 4.0f);
        FortuneResponse result = new FortuneResponse();
        result.id = date + "_" + zodiac.name();
        result.date = date.format(DATE_FORMATTER);
        result.name = zodiac.name();
        result.range = zodiac.range();
        result.element = zodiac.element();
        result.mode = zodiac.mode();
        result.ruler = zodiac.ruler();
        result.traits = String.join(" · ", zodiac.traits());
        result.axis = axis;
        result.summary = "今天月亮位于" + moon.sign() + "，" + zodiac.name() + "会更容易被“" + axis + "”牵动。适合把" + zodiac.traits().get(0) + "用在具体行动上，同时给情绪和节奏留出缓冲。";
        result.score = overall;
        result.stars = stars(overall);
        result.sections = List.of(
                new Section("love", "爱情 / 人际", loveScore, stars(loveScore), "金星落在" + venus.sign() + "，关系互动更适合从真实感受出发，少一点试探，多一点明确回应。"),
                new Section("career", "事业 / 学业", careerScore, stars(careerScore), "水星落在" + mercury.sign() + "，信息整理、沟通确认和计划拆解会影响今天的推进效率。"),
                new Section("wealth", "财富提醒", wealthScore, stars(wealthScore), "木星与今日主题提示你关注长期收益，消费和投入适合先看规则与持续成本。"),
                new Section("health", "健康节奏", healthScore, stars(healthScore), "火星落在" + mars.sign() + "，行动力会上升，但也要避免因节奏过急而透支体力。")
        );
        result.luckyColor = pick(COLORS, seed, 23);
        result.luckyNumber = pick(NUMBERS, seed, 29);
        result.luckyTime = pick(TIMES, seed, 31);
        result.luckyDirection = pick(DIRECTIONS, seed, 37);
        result.supportSign = supportSign(zodiac, moon.sign());
        result.watchSign = zodiac.opposite();
        result.dos = chooseDos(axis);
        result.donts = chooseDonts(axis);
        result.advice = "围绕“" + axis + "”完成一个 15 分钟内能落地的小动作，比等待状态变好更有效。";
        result.shareText = result.date + " " + result.name + "今日主轴：" + result.axis + "。综合" + result.score + "分 " + result.stars + "。" + result.summary + " 宜：" + result.dos + "；忌：" + result.donts + "。幸运色：" + result.luckyColor + "，幸运数字：" + result.luckyNumber + "，幸运时间：" + result.luckyTime + "。";
        result.source = "api";
        result.sourceLabel = "真实天象";
        result.astroData = byBody.values().stream().map(item -> new AstroItem(BODY_NAMES.getOrDefault(item.body(), item.body()), item.sign() + (formatDegree(item.degree() != null ? item.degree() : item.longitude()).isBlank() ? "" : " " + formatDegree(item.degree() != null ? item.degree() : item.longitude())) + " · " + formatMotion(item))).toList();
        return result;
    }

    private ZodiacInfo findZodiac(String sign) {
        return ZODIACS.stream().filter(item -> item.name().equals(sign)).findFirst().orElseThrow(() -> new BizException("星座参数不正确"));
    }

    private LocalDate parseDate(String dateText) {
        try {
            return dateText == null || dateText.isBlank() ? LocalDate.now() : LocalDate.parse(dateText, DATE_FORMATTER);
        } catch (Exception e) {
            throw new BizException("日期格式不正确");
        }
    }

    private String firstText(JsonNode node, String... names) {
        for (String name : names) {
            JsonNode value = node.get(name);
            if (value != null && value.isValueNode()) return value.asText();
        }
        return null;
    }

    private boolean isKnownBody(String body) {
        return body != null && BODIES.stream().anyMatch(item -> item.equalsIgnoreCase(body));
    }

    private String normalizeBody(String body) {
        return BODIES.stream().filter(item -> item.equalsIgnoreCase(body)).findFirst().orElse(body);
    }

    private String localizeSign(String sign) {
        return SIGN_NAMES.getOrDefault(sign.trim().toLowerCase(Locale.ROOT), sign.trim());
    }

    private Double firstDecimal(JsonNode node, String... names) {
        for (String name : names) {
            JsonNode value = node.get(name);
            if (value == null || value.isNull()) continue;
            if (value.isNumber()) return value.asDouble();
            if (value.isTextual()) {
                try {
                    return Double.parseDouble(value.asText().replace("°", "").trim());
                } catch (NumberFormatException ignored) {
                }
            }
        }
        return null;
    }

    private String formatDegree(Double value) {
        if (value == null) return "";
        double degree = Math.abs(value % 30);
        return String.format(Locale.ROOT, "%.1f°", degree);
    }

    private String formatMotion(PlanetPosition position) {
        if (position.retrograde()) return "逆行";
        if (position.speed() == null) return "顺行";
        return position.speed() < 0 ? "逆行" : "顺行";
    }

    private boolean isRetrograde(JsonNode node) {
        for (String name : Arrays.asList("retrograde", "isRetrograde", "rx")) {
            JsonNode value = node.get(name);
            if (value != null) return value.asBoolean(false);
        }
        Double speed = firstDecimal(node, "speed", "velocity", "dailyMotion");
        return speed != null && speed < 0;
    }

    private int score(int seed, int step, String transitSign, String ownSign) {
        int base = 64 + Math.abs(seed * step + step * 19) % 32;
        if (ownSign.equals(transitSign)) base += 3;
        return Math.max(60, Math.min(98, base));
    }

    private String stars(int value) {
        int count = Math.max(1, Math.min(5, Math.round(value / 20.0f)));
        return "★★★★★".substring(0, count) + "☆☆☆☆☆".substring(0, 5 - count);
    }

    private <T> T pick(List<T> list, int seed, int step) {
        return list.get(Math.abs(seed * step + step * 17) % list.size());
    }

    private String chooseAxis(PlanetPosition moon, PlanetPosition mercury, PlanetPosition venus, PlanetPosition mars) {
        if ("水象".equals(elementOf(moon.sign()))) return "情绪与关系";
        if ("风象".equals(elementOf(mercury.sign()))) return "沟通与表达";
        if ("火象".equals(elementOf(mars.sign()))) return "行动突破";
        if ("土象".equals(elementOf(venus.sign()))) return "稳定推进";
        return "整理复盘";
    }

    private String elementOf(String sign) {
        return switch (sign) {
            case "白羊座", "狮子座", "射手座" -> "火象";
            case "金牛座", "处女座", "摩羯座" -> "土象";
            case "双子座", "天秤座", "水瓶座" -> "风象";
            case "巨蟹座", "天蝎座", "双鱼座" -> "水象";
            default -> "";
        };
    }

    private String supportSign(ZodiacInfo zodiac, String moonSign) {
        if (moonSign != null && !moonSign.equals(zodiac.name())) return moonSign;
        return ZODIACS.stream().filter(item -> !item.name().equals(zodiac.name())).findFirst().map(ZodiacInfo::name).orElse(zodiac.opposite());
    }

    private String chooseDos(String axis) {
        return switch (axis) {
            case "沟通与表达" -> "主动确认";
            case "行动突破" -> "先做一步";
            case "情绪与关系" -> "温和表达";
            case "稳定推进" -> "按计划推进";
            default -> "复盘整理";
        };
    }

    private String chooseDonts(String axis) {
        return switch (axis) {
            case "沟通与表达" -> "含糊表达";
            case "行动突破" -> "冲动承诺";
            case "情绪与关系" -> "情绪化消费";
            case "稳定推进" -> "临时加码";
            default -> "贪多求快";
        };
    }

    private String trimSlash(String value) {
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private record ZodiacInfo(String name, String range, String element, String mode, String ruler, List<String> traits, String opposite) {}
    private record PlanetPosition(String body, String sign, Double longitude, Double degree, Double speed, boolean retrograde) {}
    public record Section(String key, String title, int score, String stars, String text) {}
    public record AstroItem(String label, String value) {}

    public static class FortuneResponse {
        public String id;
        public String date;
        public String name;
        public String range;
        public String element;
        public String mode;
        public String ruler;
        public String traits;
        public String axis;
        public String summary;
        public int score;
        public String stars;
        public List<Section> sections;
        public String luckyColor;
        public int luckyNumber;
        public String luckyTime;
        public String luckyDirection;
        public String supportSign;
        public String watchSign;
        public String dos;
        public String donts;
        public String advice;
        public String shareText;
        public String source;
        public String sourceLabel;
        public List<AstroItem> astroData;
    }
}
