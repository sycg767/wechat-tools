package com.wechat.tools.service;

public interface MarkdownConvertService {

    /**
     * Markdown 转 HTML 片段（含统一样式包装），供后续渲染 PDF/Word 使用。
     */
    String renderHtml(String markdown);

    /**
     * Markdown 渲染为 PDF 字节流。中文字体未就绪时会降级为系统默认字体（可能乱码）。
     */
    byte[] toPdf(String markdown);

    /**
     * Markdown 渲染为 .docx 字节流。
     */
    byte[] toWord(String markdown);
}
