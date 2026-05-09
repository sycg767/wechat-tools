package com.wechat.tools.service.impl;

import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import com.wechat.tools.service.MarkdownConvertService;
import lombok.extern.slf4j.Slf4j;
import org.commonmark.Extension;
import org.commonmark.ext.gfm.strikethrough.StrikethroughExtension;
import org.commonmark.ext.gfm.tables.TablesExtension;
import org.commonmark.ext.task.list.items.TaskListItemsExtension;
import org.commonmark.node.Node;
import org.commonmark.parser.Parser;
import org.commonmark.renderer.html.HtmlRenderer;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Slf4j
@Service
public class MarkdownConvertServiceImpl implements MarkdownConvertService {

    /** Debian 系字体（fonts-noto-cjk 包安装到这两条路径之一）。 */
    private static final List<String> CJK_FONT_CANDIDATES = List.of(
            "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
            "/usr/share/fonts/opentype/noto/NotoSansCJKsc-Regular.otf",
            "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
            "/System/Library/Fonts/PingFang.ttc",          // macOS 开发用
            "C:/Windows/Fonts/msyh.ttc",                   // Windows 开发用：微软雅黑
            "C:/Windows/Fonts/simsun.ttc"
    );

    private static final List<Extension> EXTENSIONS = List.of(
            TablesExtension.create(),
            StrikethroughExtension.create(),
            TaskListItemsExtension.create()
    );

    private final Parser parser = Parser.builder().extensions(EXTENSIONS).build();
    private final HtmlRenderer htmlRenderer = HtmlRenderer.builder().extensions(EXTENSIONS).build();

    @Override
    public String renderHtml(String markdown) {
        if (markdown == null) markdown = "";
        Node document = parser.parse(markdown);
        String body = htmlRenderer.render(document);
        return toXhtml(wrapWithStyle(body));
    }

    @Override
    public byte[] toPdf(String markdown) {
        try {
            String html = renderHtml(markdown);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.useFastMode();

            File font = locateCjkFont();
            if (font != null) {
                builder.useFont(font, "CJK", 400, com.openhtmltopdf.outputdevice.helper.BaseRendererBuilder.FontStyle.NORMAL, true);
            } else {
                log.warn("未找到中文字体，PDF 中文可能显示为方块。生产环境请确保安装 fonts-noto-cjk");
            }

            builder.withHtmlContent(html, null);
            builder.toStream(out);
            builder.run();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Markdown 转 PDF 失败: " + e.getMessage(), e);
        }
    }

    @Override
    public byte[] toWord(String markdown) {
        // 走 "Word HTML" 模式：含 Office namespace 的 HTML 文件，后缀 .doc，
        // Word / WPS / LibreOffice 都能直接打开，且保留绝大多数排版（标题、列表、表格、代码块）。
        // 比 docx4j ImportXHTML 链路轻很多，没有额外依赖且效果稳定。
        String body = renderHtml(markdown);
        // 把 head 替换成带 Office namespace 的版本
        String wordHtml = body.replaceFirst(
                "<html>",
                "<html xmlns:o=\"urn:schemas-microsoft-com:office:office\" " +
                        "xmlns:w=\"urn:schemas-microsoft-com:office:word\" " +
                        "xmlns=\"http://www.w3.org/TR/REC-html40\">"
        );
        return wordHtml.getBytes(StandardCharsets.UTF_8);
    }

    private static String toXhtml(String html) {
        Document document = Jsoup.parse(html);
        document.outputSettings()
                .syntax(Document.OutputSettings.Syntax.xml)
                .escapeMode(org.jsoup.nodes.Entities.EscapeMode.xhtml)
                .charset(StandardCharsets.UTF_8);
        return document.outerHtml();
    }

    private static File locateCjkFont() {
        for (String path : CJK_FONT_CANDIDATES) {
            File f = new File(path);
            if (f.exists() && f.canRead()) {
                return f;
            }
        }
        return null;
    }

    private static String wrapWithStyle(String body) {
        return """
                <!doctype html>
                <html><head><meta charset="UTF-8"/><style>
                  body { font-family: 'Times New Roman', 'SimSun', 'Songti SC', 'CJK', serif; font-size: 11pt; line-height: 1.7; color: #1f2329; padding: 24pt; }
                  h1, h2, h3, h4 { font-weight: 600; line-height: 1.3; margin: 1.2em 0 0.5em; }
                  h1 { font-size: 22pt; border-bottom: 1pt solid #e5e6eb; padding-bottom: 6pt; }
                  h2 { font-size: 18pt; }
                  h3 { font-size: 15pt; }
                  p { margin: 0.6em 0; }
                  pre { background: #f5f6f7; padding: 10pt; border-radius: 4pt; font-family: 'Consolas', 'Courier New', monospace; font-size: 9.5pt; white-space: pre-wrap; word-break: break-word; }
                  code { background: #f5f6f7; padding: 1pt 4pt; border-radius: 3pt; font-family: 'Consolas', 'Courier New', monospace; font-size: 10pt; }
                  pre code { background: transparent; padding: 0; }
                  blockquote { border-left: 3pt solid #c9cdd4; padding: 0 12pt; color: #4e5969; margin: 0.8em 0; }
                  table { border-collapse: collapse; width: 100%; margin: 0.6em 0; }
                  th, td { border: 0.5pt solid #c9cdd4; padding: 6pt 10pt; }
                  th { background: #f5f6f7; }
                  ul, ol { padding-left: 24pt; }
                  hr { border: none; border-top: 0.5pt solid #c9cdd4; margin: 1em 0; }
                  a { color: #1f6feb; text-decoration: underline; }
                  img { max-width: 100%; }
                </style></head><body>
                """ + body + "</body></html>";
    }
}
