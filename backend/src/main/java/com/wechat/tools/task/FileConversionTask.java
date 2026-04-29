package com.wechat.tools.task;

import com.baidu.aip.ocr.AipOcr;
import com.wechat.tools.common.TaskStatusResult;
import com.wechat.tools.config.TencentCiProperties;
import com.wechat.tools.service.FileStorageService;
import com.wechat.tools.service.TaskService;
import com.wechat.tools.service.TencentCosObjectService;
import com.wechat.tools.service.TencentDocProcessService;
import net.coobird.thumbnailator.Thumbnails;
import net.sourceforge.tess4j.Tesseract;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.io.RandomAccessReadBuffer;
import org.apache.pdfbox.multipdf.PDFMergerUtility;
import org.apache.pdfbox.multipdf.Splitter;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.state.PDExtendedGraphicsState;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.text.TextPosition;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.docx4j.openpackaging.packages.WordprocessingMLPackage;
import org.docx4j.wml.ObjectFactory;
import org.docx4j.wml.P;
import org.docx4j.wml.R;
import org.docx4j.wml.Text;
import org.json.JSONArray;
import org.json.JSONObject;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.BinaryBitmap;
import com.google.zxing.DecodeHintType;
import com.google.zxing.EncodeHintType;
import com.google.zxing.LuminanceSource;
import com.google.zxing.MultiFormatReader;
import com.google.zxing.MultiFormatWriter;
import com.google.zxing.client.j2se.BufferedImageLuminanceSource;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.common.HybridBinarizer;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.awt.AlphaComposite;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class FileConversionTask {

    private final TaskService taskService;
    private final FileStorageService fileStorageService;
    private final TencentCosObjectService tencentCosObjectService;
    private final TencentDocProcessService tencentDocProcessService;
    private final TencentCiProperties tencentCiProperties;
    private final com.wechat.tools.pdf.PdfcpuRunner pdfcpuRunner;

    @Value("${baidu.ocr.app-id:}")
    private String baiduAppId;

    @Value("${baidu.ocr.api-key:}")
    private String baiduApiKey;

    @Value("${baidu.ocr.secret-key:}")
    private String baiduSecretKey;

    @Value("${baidu.ocr.enabled:false}")
    private boolean baiduOcrEnabled;

    @Value("${baidu.image-matting.api-key:}")
    private String baiduImageMattingApiKey;

    @Value("${baidu.image-matting.secret-key:}")
    private String baiduImageMattingSecretKey;

    @Value("${baidu.image-matting.enabled:false}")
    private boolean baiduImageMattingEnabled;

    private static final DateTimeFormatter FILE_NAME_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss");

    private final HttpClient httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(20))
        .build();

    public FileConversionTask(TaskService taskService,
                              FileStorageService fileStorageService,
                              TencentCosObjectService tencentCosObjectService,
                              TencentDocProcessService tencentDocProcessService,
                              TencentCiProperties tencentCiProperties,
                              com.wechat.tools.pdf.PdfcpuRunner pdfcpuRunner) {
        this.taskService = taskService;
        this.fileStorageService = fileStorageService;
        this.tencentCosObjectService = tencentCosObjectService;
        this.tencentDocProcessService = tencentDocProcessService;
        this.tencentCiProperties = tencentCiProperties;
        this.pdfcpuRunner = pdfcpuRunner;
    }

    @Async("taskExecutor")
    public void processRename(String taskId, String sourceFileId, String newFileName) {
        try {
            taskService.updateTaskStatus(taskId, TaskStatusResult.processing(taskId, 50));
            
            byte[] fileData;
            try (java.io.InputStream is = fileStorageService.downloadFile(sourceFileId)) {
                fileData = is.readAllBytes();
            }

            String resultFileId = fileStorageService.uploadFile(
                newFileName,
                new ByteArrayInputStream(fileData),
                fileData.length,
                "application/octet-stream"
            );
            String resultUrl = fileStorageService.getFileUrl(resultFileId, newFileName);
            taskService.updateTaskStatus(taskId, TaskStatusResult.success(taskId, resultUrl, newFileName));
            
            // 清理临时上传的源文件
            fileStorageService.deleteFile(sourceFileId);
        } catch (Exception e) {
            taskService.updateTaskStatus(taskId, TaskStatusResult.fail(taskId, "重命名失败: " + e.getMessage()));
        }
    }

    @Async("taskExecutor")
    public void processPdfToWord(String taskId, String sourceFileId, String originalFileName) {
        try {
            taskService.updateTaskStatus(taskId, TaskStatusResult.processing(taskId, 10));

            byte[] fileData;
            try (java.io.InputStream is = fileStorageService.downloadFile(sourceFileId)) {
                fileData = is.readAllBytes();
            }

            taskService.updateTaskStatus(taskId, TaskStatusResult.processing(taskId, 30));
            String text = extractPdfTextWithOcr(taskId, fileData);

            taskService.updateTaskStatus(taskId, TaskStatusResult.processing(taskId, 80));
            byte[] docxBytes = createWordDocument(text);

            String resultFileName = buildDocxFileName(originalFileName);
            String resultFileId = fileStorageService.uploadFile(
                resultFileName,
                new ByteArrayInputStream(docxBytes),
                docxBytes.length,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            );
            String resultUrl = fileStorageService.getFileUrl(resultFileId, resultFileName);
            taskService.updateTaskStatus(taskId, TaskStatusResult.success(taskId, resultUrl, resultFileName));

            // 清理临时上传的源文件
            fileStorageService.deleteFile(sourceFileId);
        } catch (Exception e) {
            taskService.updateTaskStatus(taskId, TaskStatusResult.fail(taskId, "转换失败: " + e.getMessage()));
        }
    }

    @Async("taskExecutor")
    public void processWordToPdf(String taskId, String sourceFileId, String originalFileName) {
        String sourceObjectKey = null;
        String outputObjectKey = null;
        try {
            taskService.updateTaskStatus(taskId, TaskStatusResult.processing(taskId, 10));

            byte[] fileData;
            try (java.io.InputStream is = fileStorageService.downloadFile(sourceFileId)) {
                fileData = is.readAllBytes();
            }

            String sourceExtension = extractExtension(originalFileName, "docx");
            String resultFileName = buildPdfFileName(originalFileName);
            outputObjectKey = buildRemoteOutputObjectKey(resultFileName);

            taskService.updateTaskStatus(taskId, TaskStatusResult.processing(taskId, 25));
            sourceObjectKey = tencentCosObjectService.uploadWordSource(originalFileName, fileData, resolveWordContentType(sourceExtension));

            taskService.updateTaskStatus(taskId, TaskStatusResult.processing(taskId, 40));
            String jobId = tencentDocProcessService.submitWordToPdf(sourceObjectKey, sourceExtension, outputObjectKey);

            taskService.updateTaskStatus(taskId, TaskStatusResult.processing(taskId, 60));
            TencentDocProcessService.DocProcessResult docProcessResult = tencentDocProcessService.waitForCompletion(jobId, outputObjectKey);
            if (!"SUCCESS".equals(docProcessResult.state())) {
                String message = docProcessResult.message() == null || docProcessResult.message().isBlank()
                    ? "腾讯云转码失败"
                    : docProcessResult.message();
                throw new IllegalStateException(message);
            }

            taskService.updateTaskStatus(taskId, TaskStatusResult.processing(taskId, 90));
            byte[] pdfBytes = tencentCosObjectService.downloadObject(docProcessResult.outputObjectKey());

            taskService.updateTaskStatus(taskId, TaskStatusResult.processing(taskId, 95));
            String resultFileId = fileStorageService.uploadFile(
                resultFileName,
                new ByteArrayInputStream(pdfBytes),
                pdfBytes.length,
                "application/pdf"
            );
            String resultUrl = fileStorageService.getFileUrl(resultFileId, resultFileName);
            taskService.updateTaskStatus(taskId, TaskStatusResult.success(taskId, resultUrl, resultFileName));

            fileStorageService.deleteFile(sourceFileId);
            if (!tencentCiProperties.isKeepRemoteFiles()) {
                tencentCosObjectService.deleteObject(sourceObjectKey);
                tencentCosObjectService.deleteObject(docProcessResult.outputObjectKey());
            }
        } catch (Exception e) {
            taskService.updateTaskStatus(taskId, TaskStatusResult.fail(taskId, "Word 转 PDF 失败: " + e.getMessage()));
        } finally {
            if (!tencentCiProperties.isKeepRemoteFiles()) {
                safeDeleteRemoteObject(sourceObjectKey);
                safeDeleteRemoteObject(outputObjectKey);
            }
        }
    }

    @Async("taskExecutor")
    public void processCompressImage(String taskId, String sourceFileId, String originalFileName, double quality) {
        try {
            taskService.updateTaskStatus(taskId, TaskStatusResult.processing(taskId, 20));

            byte[] fileData;
            try (java.io.InputStream is = fileStorageService.downloadFile(sourceFileId)) {
                fileData = is.readAllBytes();
            }

            taskService.updateTaskStatus(taskId, TaskStatusResult.processing(taskId, 50));
            
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            Thumbnails.of(new ByteArrayInputStream(fileData))
                .scale(1.0)
                .outputQuality(quality)
                .toOutputStream(baos);
            
            byte[] compressedData = baos.toByteArray();

            taskService.updateTaskStatus(taskId, TaskStatusResult.processing(taskId, 80));
            
            String resultFileId = fileStorageService.uploadFile(
                originalFileName,
                new ByteArrayInputStream(compressedData),
                compressedData.length,
                "image/jpeg"
            );
            String resultUrl = fileStorageService.getFileUrl(resultFileId, originalFileName);
            taskService.updateTaskStatus(taskId, TaskStatusResult.success(taskId, resultUrl, originalFileName));

            // 清理临时上传的源文件
            fileStorageService.deleteFile(sourceFileId);
        } catch (Exception e) {
            taskService.updateTaskStatus(taskId, TaskStatusResult.fail(taskId, "压缩失败: " + e.getMessage()));
        }
    }

    @Async("taskExecutor")
    public void processPdfToExcel(String taskId, String sourceFileId, String originalFileName) {
        try {
            taskService.updateTaskStatus(taskId, TaskStatusResult.processing(taskId, 10));

            byte[] fileData;
            try (java.io.InputStream is = fileStorageService.downloadFile(sourceFileId)) {
                fileData = is.readAllBytes();
            }

            taskService.updateTaskStatus(taskId, TaskStatusResult.processing(taskId, 30));
            String text = extractPdfTextWithOcr(taskId, fileData);

            taskService.updateTaskStatus(taskId, TaskStatusResult.processing(taskId, 70));
            byte[] excelBytes = createExcelDocument(text);

            String resultFileName = buildXlsxFileName(originalFileName);
            String resultFileId = fileStorageService.uploadFile(
                resultFileName,
                new ByteArrayInputStream(excelBytes),
                excelBytes.length,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            );
            String resultUrl = fileStorageService.getFileUrl(resultFileId, resultFileName);
            taskService.updateTaskStatus(taskId, TaskStatusResult.success(taskId, resultUrl, resultFileName));

            // 清理临时上传的源文件
            fileStorageService.deleteFile(sourceFileId);
        } catch (Exception e) {
            taskService.updateTaskStatus(taskId, TaskStatusResult.fail(taskId, "转换失败: " + e.getMessage()));
        }
    }

    @Async("taskExecutor")
    public void processChangeIdPhotoBg(String taskId, String sourceFileId, String originalFileName, String bgColor) {
        try {
            if (!baiduImageMattingEnabled || baiduImageMattingApiKey.isBlank() || baiduImageMattingSecretKey.isBlank()) {
                throw new IllegalStateException("未配置百度智能抠图密钥");
            }

            taskService.updateTaskStatus(taskId, TaskStatusResult.processing(taskId, 20));

            byte[] fileData;
            try (java.io.InputStream is = fileStorageService.downloadFile(sourceFileId)) {
                fileData = is.readAllBytes();
            }

            taskService.updateTaskStatus(taskId, TaskStatusResult.processing(taskId, 45));
            byte[] foregroundBytes = callBaiduImageMatting(fileData);

            taskService.updateTaskStatus(taskId, TaskStatusResult.processing(taskId, 75));
            byte[] resultBytes = mergeForegroundWithSolidBackground(foregroundBytes, bgColor);

            taskService.updateTaskStatus(taskId, TaskStatusResult.processing(taskId, 85));
            String resultFileName = buildIdPhotoBgFileName(bgColor);
            String resultFileId = fileStorageService.uploadFile(
                resultFileName,
                new ByteArrayInputStream(resultBytes),
                resultBytes.length,
                "image/png"
            );
            String resultUrl = fileStorageService.getFileUrl(resultFileId, resultFileName);
            taskService.updateTaskStatus(taskId, TaskStatusResult.success(taskId, resultUrl, resultFileName));

            fileStorageService.deleteFile(sourceFileId);
        } catch (Exception e) {
            taskService.updateTaskStatus(taskId, TaskStatusResult.fail(taskId, "证件照换底色失败: " + e.getMessage()));
        }
    }

    @Async("taskExecutor")
    public void processPdfMerge(String taskId, List<String> sourceFileIds, String resultFileName) {
        try {
            taskService.updateTaskStatus(taskId, TaskStatusResult.processing(taskId, 10));
            
            PDFMergerUtility merger = new PDFMergerUtility();
            List<PDDocument> documents = new ArrayList<>();
            
            try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
                merger.setDestinationStream(baos);
                
                for (int i = 0; i < sourceFileIds.size(); i++) {
                    String fileId = sourceFileIds.get(i);
                    byte[] data;
                    try (java.io.InputStream is = fileStorageService.downloadFile(fileId)) {
                        data = is.readAllBytes();
                    }
                    PDDocument doc = Loader.loadPDF(data);
                    documents.add(doc);
                    merger.addSource(new RandomAccessReadBuffer(data));
                    
                    int progress = 10 + (int) (((double) (i + 1) / sourceFileIds.size()) * 70);
                    taskService.updateTaskStatus(taskId, TaskStatusResult.processing(taskId, progress));
                }
                
                merger.mergeDocuments(null);
                byte[] mergedData = baos.toByteArray();
                
                taskService.updateTaskStatus(taskId, TaskStatusResult.processing(taskId, 90));
                
                String resultFileId = fileStorageService.uploadFile(
                    resultFileName,
                    new ByteArrayInputStream(mergedData),
                    mergedData.length,
                    "application/pdf"
                );
                String resultUrl = fileStorageService.getFileUrl(resultFileId, resultFileName);
                taskService.updateTaskStatus(taskId, TaskStatusResult.success(taskId, resultUrl, resultFileName));
            } finally {
                for (PDDocument doc : documents) {
                    try { doc.close(); } catch (Exception ignored) {}
                }
            }
            
            // 清理临时文件
            for (String fileId : sourceFileIds) {
                fileStorageService.deleteFile(fileId);
            }
        } catch (Exception e) {
            taskService.updateTaskStatus(taskId, TaskStatusResult.fail(taskId, "合并失败: " + e.getMessage()));
        }
    }

    @Async("taskExecutor")
    public void processPdfSplit(String taskId, String sourceFileId, String originalFileName, String range) {
        try {
            taskService.updateTaskStatus(taskId, TaskStatusResult.processing(taskId, 20));
            
            byte[] fileData;
            try (java.io.InputStream is = fileStorageService.downloadFile(sourceFileId)) {
                fileData = is.readAllBytes();
            }
            
            try (PDDocument document = Loader.loadPDF(fileData)) {
                Splitter splitter = new Splitter();
                
                // 解析范围，例如 "1-3,5"
                // 为了简单起见，如果 range 为空，则拆分所有页（但目前只支持提取到一个 PDF）
                // 这里的逻辑改为：提取指定范围的页面到一个新的 PDF
                if (range != null && !range.isBlank()) {
                    // 简单的范围解析逻辑可以很复杂，这里先实现基础的提取
                    // 比如 "1-3" 提取前三页
                    String[] parts = range.split("-");
                    if (parts.length == 2) {
                        int start = Integer.parseInt(parts[0].trim());
                        int end = Integer.parseInt(parts[1].trim());
                        splitter.setStartPage(start);
                        splitter.setEndPage(end);
                    } else if (parts.length == 1) {
                        int page = Integer.parseInt(parts[0].trim());
                        splitter.setStartPage(page);
                        splitter.setEndPage(page);
                    }
                }
                
                List<PDDocument> splitDocs = splitter.split(document);
                
                // 将拆分后的页面合并成一个新的 PDF（即提取范围内的页面）
                try (ByteArrayOutputStream baos = new ByteArrayOutputStream();
                     PDDocument resultDoc = new PDDocument()) {
                    
                    for (PDDocument part : splitDocs) {
                        for (int i = 0; i < part.getNumberOfPages(); i++) {
                            // 使用 importPage 确保资源（字体、图片等）被正确复制
                            resultDoc.importPage(part.getPage(i));
                        }
                        part.close();
                    }
                    
                    resultDoc.save(baos);
                    byte[] resultData = baos.toByteArray();
                    
                    String resultFileName = "split_" + originalFileName;
                    String resultFileId = fileStorageService.uploadFile(
                        resultFileName,
                        new ByteArrayInputStream(resultData),
                        resultData.length,
                        "application/pdf"
                    );
                    String resultUrl = fileStorageService.getFileUrl(resultFileId, resultFileName);
                    taskService.updateTaskStatus(taskId, TaskStatusResult.success(taskId, resultUrl, resultFileName));
                }
            }
            
            fileStorageService.deleteFile(sourceFileId);
        } catch (Exception e) {
            taskService.updateTaskStatus(taskId, TaskStatusResult.fail(taskId, "拆分失败: " + e.getMessage()));
        }
    }

    @Async("taskExecutor")
    public void processPdfPageManage(String taskId, String sourceFileId, String originalFileName, String pagesJson, String pageRange, Integer rotation) {
        Path tempInput = null;
        Path tempOutput = null;
        try {
            taskService.updateTaskStatus(taskId, TaskStatusResult.processing(taskId, 20));

            tempInput = Files.createTempFile("pdf_manage_in_", ".pdf");
            try (java.io.InputStream is = fileStorageService.downloadFile(sourceFileId)) {
                Files.copy(is, tempInput, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            }

            taskService.updateTaskStatus(taskId, TaskStatusResult.processing(taskId, 45));
            tempOutput = Files.createTempFile("pdf_manage_out_", ".pdf");

            if (pagesJson != null && !pagesJson.isBlank()) {
                applyPageManageByPreview(tempInput, tempOutput, pagesJson);
            } else {
                if (pageRange != null && !pageRange.isBlank()) {
                    pdfcpuRunner.collect(tempInput, tempOutput, pageRange);
                    if (rotation != null && rotation != 0) {
                        Path rotatedOutput = Files.createTempFile("pdf_manage_rot_", ".pdf");
                        pdfcpuRunner.rotate(tempOutput, rotatedOutput, rotation);
                        Files.deleteIfExists(tempOutput);
                        tempOutput = rotatedOutput;
                    }
                } else if (rotation != null && rotation != 0) {
                    pdfcpuRunner.rotate(tempInput, tempOutput, rotation);
                } else {
                    Files.copy(tempInput, tempOutput, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
                }
            }

            taskService.updateTaskStatus(taskId, TaskStatusResult.processing(taskId, 80));

            String resultFileName = "managed_" + originalFileName;
            String resultFileId = fileStorageService.uploadFile(
                resultFileName,
                Files.newInputStream(tempOutput),
                Files.size(tempOutput),
                "application/pdf"
            );
            String resultUrl = fileStorageService.getFileUrl(resultFileId, resultFileName);
            taskService.updateTaskStatus(taskId, TaskStatusResult.success(taskId, resultUrl, resultFileName));

            fileStorageService.deleteFile(sourceFileId);
        } catch (Exception e) {
            taskService.updateTaskStatus(taskId, TaskStatusResult.fail(taskId, "PDF 页面管理失败: " + e.getMessage()));
        } finally {
            try {
                if (tempInput != null) Files.deleteIfExists(tempInput);
                if (tempOutput != null) Files.deleteIfExists(tempOutput);
            } catch (Exception ignored) {}
        }
    }

    private void applyPageManageByPreview(Path tempInput, Path tempOutput, String pagesJson) throws Exception {
        JSONArray arr = new JSONArray(pagesJson);
        if (arr.length() == 0) {
            throw new IllegalArgumentException("页面列表不能为空");
        }

        try (PDDocument source = Loader.loadPDF(tempInput.toFile());
             PDDocument output = new PDDocument()) {
            int total = source.getNumberOfPages();

            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.getJSONObject(i);
                if (obj.optBoolean("deleted", false)) continue;

                int pageNo = obj.optInt("pageNo", -1);
                if (pageNo < 1 || pageNo > total) {
                    throw new IllegalArgumentException("页码越界: " + pageNo);
                }

                int rotate = obj.optInt("rotation", 0);
                PDPage imported = output.importPage(source.getPage(pageNo - 1));
                imported.setRotation(normalizeQuarterRotation(rotate));
            }

            if (output.getNumberOfPages() <= 0) {
                throw new IllegalArgumentException("至少保留一页");
            }

            output.save(tempOutput.toFile());
        }
    }

    private int normalizeQuarterRotation(int degree) {
        int normalized = ((degree % 360) + 360) % 360;
        if (normalized % 90 != 0) {
            throw new IllegalArgumentException("旋转角度仅支持 0/90/180/270");
        }
        return normalized;
    }

    @Async("taskExecutor")
    public void processPdfAddWatermarkEnhanced(String taskId, String sourceFileId, String imageFileId, String originalFileName,
                                               String type, String layout, float x, float y, String watermarkText,
                                               float opacity, float rotation, float scale, int fontSize, String color) {
        try {
            taskService.updateTaskStatus(taskId, TaskStatusResult.processing(taskId, 20));
            
            byte[] fileData;
            try (java.io.InputStream is = fileStorageService.downloadFile(sourceFileId)) {
                fileData = is.readAllBytes();
            }

            byte[] imageData = null;
            if ("image".equals(type) && imageFileId != null) {
                try (java.io.InputStream is = fileStorageService.downloadFile(imageFileId)) {
                    imageData = is.readAllBytes();
                }
            }
            
            try (PDDocument document = Loader.loadPDF(fileData)) {
                org.apache.pdfbox.pdmodel.font.PDFont font = null;
                PDImageXObject pdImage = null;

                if ("text".equals(type)) {
                    try {
                        File fontFile = new File("C:/Windows/Fonts/simhei.ttf");
                        font = fontFile.exists() ? PDType0Font.load(document, fontFile) : new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
                    } catch (Exception e) {
                        font = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
                    }
                } else if ("image".equals(type) && imageData != null) {
                    pdImage = PDImageXObject.createFromByteArray(document, imageData, "watermark");
                }

                for (PDPage page : document.getPages()) {
                    float pageWidth = page.getMediaBox().getWidth();
                    float pageHeight = page.getMediaBox().getHeight();

                    try (PDPageContentStream contentStream = new PDPageContentStream(document, page, PDPageContentStream.AppendMode.APPEND, true, true)) {
                        PDExtendedGraphicsState gs = new PDExtendedGraphicsState();
                        gs.setNonStrokingAlphaConstant(opacity);
                        contentStream.setGraphicsStateParameters(gs);

                        if ("tile".equals(layout)) {
                            renderTiledWatermark(contentStream, type, font, pdImage, watermarkText, fontSize, color, rotation, scale, pageWidth, pageHeight);
                        } else {
                            float targetX = x;
                            float targetY = y;
                            if ("center".equals(layout)) {
                                targetX = pageWidth / 2;
                                targetY = pageHeight / 2;
                            }
                            targetX = Math.max(0, Math.min(targetX, pageWidth));
                            targetY = Math.max(0, Math.min(targetY, pageHeight));
                            renderSingleWatermark(contentStream, type, font, pdImage, watermarkText, fontSize, color, rotation, scale, targetX, targetY);
                        }
                    }
                }
                
                try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
                    document.save(baos);
                    byte[] resultData = baos.toByteArray();
                    String resultFileName = "watermarked_" + originalFileName;
                    String resultFileId = fileStorageService.uploadFile(resultFileName, new ByteArrayInputStream(resultData), resultData.length, "application/pdf");
                    String resultUrl = fileStorageService.getFileUrl(resultFileId, resultFileName);
                    taskService.updateTaskStatus(taskId, TaskStatusResult.success(taskId, resultUrl, resultFileName));
                }
            }
            
            fileStorageService.deleteFile(sourceFileId);
            if (imageFileId != null) fileStorageService.deleteFile(imageFileId);
        } catch (Exception e) {
            taskService.updateTaskStatus(taskId, TaskStatusResult.fail(taskId, "加水印失败: " + e.getMessage()));
        }
    }

    @Async("taskExecutor")
    public void processCsvToExcel(String taskId, String sourceFileId, String originalFileName) {
        try {
            taskService.updateTaskStatus(taskId, TaskStatusResult.processing(taskId, 20));

            byte[] fileData;
            try (java.io.InputStream is = fileStorageService.downloadFile(sourceFileId)) {
                fileData = is.readAllBytes();
            }

            taskService.updateTaskStatus(taskId, TaskStatusResult.processing(taskId, 50));

            // 使用 Hutool 读取 CSV 并写入 Excel
            cn.hutool.core.text.csv.CsvReader reader = cn.hutool.core.text.csv.CsvUtil.getReader();
            cn.hutool.core.text.csv.CsvData csvData = reader.read(new java.io.InputStreamReader(new ByteArrayInputStream(fileData), StandardCharsets.UTF_8));
            
            try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
                Sheet sheet = workbook.createSheet("Sheet1");
                List<cn.hutool.core.text.csv.CsvRow> rows = csvData.getRows();
                for (int i = 0; i < rows.size(); i++) {
                    org.apache.poi.ss.usermodel.Row row = sheet.createRow(i);
                    List<String> rawRow = rows.get(i).getRawList();
                    for (int j = 0; j < rawRow.size(); j++) {
                        row.createCell(j).setCellValue(rawRow.get(j));
                    }
                }
                
                // 自动调整列宽
                if (!rows.isEmpty()) {
                    int colCount = rows.get(0).getRawList().size();
                    for (int i = 0; i < colCount; i++) {
                        sheet.autoSizeColumn(i);
                    }
                }

                workbook.write(baos);
                byte[] excelBytes = baos.toByteArray();

                taskService.updateTaskStatus(taskId, TaskStatusResult.processing(taskId, 80));

                String resultFileName = buildXlsxFileName(originalFileName);
                String resultFileId = fileStorageService.uploadFile(
                    resultFileName,
                    new ByteArrayInputStream(excelBytes),
                    excelBytes.length,
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                );
                String resultUrl = fileStorageService.getFileUrl(resultFileId, resultFileName);
                taskService.updateTaskStatus(taskId, TaskStatusResult.success(taskId, resultUrl, resultFileName));
            }

            fileStorageService.deleteFile(sourceFileId);
        } catch (Exception e) {
            taskService.updateTaskStatus(taskId, TaskStatusResult.fail(taskId, "CSV 转 Excel 失败: " + e.getMessage()));
        }
    }

    @Async("taskExecutor")
    public void processExcelToCsv(String taskId, String sourceFileId, String originalFileName) {
        try {
            taskService.updateTaskStatus(taskId, TaskStatusResult.processing(taskId, 10));

            byte[] fileData;
            try (java.io.InputStream is = fileStorageService.downloadFile(sourceFileId)) {
                fileData = is.readAllBytes();
            }

            taskService.updateTaskStatus(taskId, TaskStatusResult.processing(taskId, 30));

            // 使用 POI 加载 Workbook 以获取所有 Sheet
            try (Workbook workbook = org.apache.poi.ss.usermodel.WorkbookFactory.create(new ByteArrayInputStream(fileData))) {
                int sheetCount = workbook.getNumberOfSheets();
                
                if (sheetCount <= 1) {
                    // 只有一个 Sheet，保持原有逻辑，输出单个 CSV
                    cn.hutool.poi.excel.ExcelReader reader = cn.hutool.poi.excel.ExcelUtil.getReader(new ByteArrayInputStream(fileData));
                    List<List<Object>> readAll = reader.read();
                    
                    ByteArrayOutputStream baos = new ByteArrayOutputStream();
                    cn.hutool.core.text.csv.CsvWriter writer = cn.hutool.core.text.csv.CsvUtil.getWriter(new java.io.OutputStreamWriter(baos, StandardCharsets.UTF_8));
                    writer.write(readAll);
                    writer.flush();
                    writer.close();
                    
                    byte[] csvBytes = baos.toByteArray();
                    String resultFileName = buildCsvFileName(originalFileName);
                    String resultFileId = fileStorageService.uploadFile(
                        resultFileName,
                        new ByteArrayInputStream(csvBytes),
                        csvBytes.length,
                        "text/csv"
                    );
                    String resultUrl = fileStorageService.getFileUrl(resultFileId, resultFileName);
                    taskService.updateTaskStatus(taskId, TaskStatusResult.success(taskId, resultUrl, resultFileName));
                } else {
                    // 多个 Sheet，打包为 ZIP
                    ByteArrayOutputStream zipBaos = new ByteArrayOutputStream();
                    try (java.util.zip.ZipOutputStream zos = new java.util.zip.ZipOutputStream(zipBaos)) {
                        for (int i = 0; i < sheetCount; i++) {
                            String sheetName = workbook.getSheetName(i);
                            cn.hutool.poi.excel.ExcelReader reader = cn.hutool.poi.excel.ExcelUtil.getReader(new ByteArrayInputStream(fileData), i);
                            List<List<Object>> readAll = reader.read();
                            
                            ByteArrayOutputStream csvBaos = new ByteArrayOutputStream();
                            cn.hutool.core.text.csv.CsvWriter writer = cn.hutool.core.text.csv.CsvUtil.getWriter(new java.io.OutputStreamWriter(csvBaos, StandardCharsets.UTF_8));
                            writer.write(readAll);
                            writer.flush();
                            writer.close();
                            
                            java.util.zip.ZipEntry entry = new java.util.zip.ZipEntry(sheetName + ".csv");
                            zos.putNextEntry(entry);
                            zos.write(csvBaos.toByteArray());
                            zos.closeEntry();
                        }
                    }
                    
                    byte[] zipBytes = zipBaos.toByteArray();
                    String resultFileName = buildZipFileName(originalFileName);
                    String resultFileId = fileStorageService.uploadFile(
                        resultFileName,
                        new ByteArrayInputStream(zipBytes),
                        zipBytes.length,
                        "application/zip"
                    );
                    String resultUrl = fileStorageService.getFileUrl(resultFileId, resultFileName);
                    taskService.updateTaskStatus(taskId, TaskStatusResult.success(taskId, resultUrl, resultFileName));
                }
            }

            fileStorageService.deleteFile(sourceFileId);
        } catch (Exception e) {
            taskService.updateTaskStatus(taskId, TaskStatusResult.fail(taskId, "Excel 转 CSV 失败: " + e.getMessage()));
        }
    }

    @Async("taskExecutor")
    public void processQrGenerate(String taskId, String content, int size) {
        try {
            taskService.updateTaskStatus(taskId, TaskStatusResult.processing(taskId, 30));

            Map<EncodeHintType, Object> hints = new HashMap<>();
            hints.put(EncodeHintType.CHARACTER_SET, "UTF-8");
            hints.put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.H);
            hints.put(EncodeHintType.MARGIN, 1);

            BitMatrix bitMatrix = new MultiFormatWriter().encode(content, BarcodeFormat.QR_CODE, size, size, hints);
            
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "png", baos);
            byte[] qrBytes = baos.toByteArray();

            taskService.updateTaskStatus(taskId, TaskStatusResult.processing(taskId, 80));

            String resultFileName = "qrcode_" + System.currentTimeMillis() + ".png";
            String resultFileId = fileStorageService.uploadFile(
                resultFileName,
                new ByteArrayInputStream(qrBytes),
                qrBytes.length,
                "image/png"
            );
            String resultUrl = fileStorageService.getFileUrl(resultFileId, resultFileName);
            taskService.updateTaskStatus(taskId, TaskStatusResult.success(taskId, resultUrl, resultFileName));
        } catch (Exception e) {
            taskService.updateTaskStatus(taskId, TaskStatusResult.fail(taskId, "二维码生成失败: " + e.getMessage()));
        }
    }

    @Async("taskExecutor")
    public void processQrDecode(String taskId, String sourceFileId) {
        try {
            taskService.updateTaskStatus(taskId, TaskStatusResult.processing(taskId, 30));

            byte[] fileData;
            try (java.io.InputStream is = fileStorageService.downloadFile(sourceFileId)) {
                fileData = is.readAllBytes();
            }

            BufferedImage image = ImageIO.read(new ByteArrayInputStream(fileData));
            if (image == null) {
                throw new IllegalArgumentException("无法解析图片文件");
            }

            LuminanceSource source = new BufferedImageLuminanceSource(image);
            BinaryBitmap bitmap = new BinaryBitmap(new HybridBinarizer(source));

            Map<DecodeHintType, Object> hints = new HashMap<>();
            hints.put(DecodeHintType.CHARACTER_SET, "UTF-8");

            com.google.zxing.Result result = new MultiFormatReader().decode(bitmap, hints);
            String decodedText = result.getText();

            taskService.updateTaskStatus(taskId, TaskStatusResult.processing(taskId, 80));

            // 生成一个包含识别结果的文本文件供下载
            byte[] resultBytes = decodedText.getBytes(StandardCharsets.UTF_8);
            String resultFileName = "qr_result.txt";
            String resultFileId = fileStorageService.uploadFile(
                resultFileName,
                new ByteArrayInputStream(resultBytes),
                resultBytes.length,
                "text/plain"
            );
            String resultUrl = fileStorageService.getFileUrl(resultFileId, resultFileName);

            // 在 extraData 中带上识别出的内容，方便前端直接展示
            taskService.updateTaskStatus(taskId, TaskStatusResult.success(taskId, resultUrl, resultFileName, decodedText));

            fileStorageService.deleteFile(sourceFileId);
        } catch (Exception e) {
            taskService.updateTaskStatus(taskId, TaskStatusResult.fail(taskId, "二维码识别失败: " + e.getMessage()));
        }
    }

    @Async("taskExecutor")
    public void processKingScoreOcr(String taskId, String sourceFileId, String originalFileName) {
        try {
            taskService.updateTaskStatus(taskId, TaskStatusResult.processing(taskId, 20));

            byte[] fileData;
            try (java.io.InputStream is = fileStorageService.downloadFile(sourceFileId)) {
                fileData = is.readAllBytes();
            }

            taskService.updateTaskStatus(taskId, TaskStatusResult.processing(taskId, 45));
            String recognizedText = performImageOcr(taskId, fileData);
            if (recognizedText == null || recognizedText.isBlank()) {
                throw new IllegalStateException("未识别到可用文字");
            }

            taskService.updateTaskStatus(taskId, TaskStatusResult.processing(taskId, 85));
            byte[] resultBytes = recognizedText.getBytes(StandardCharsets.UTF_8);
            String resultFileName = buildOcrResultFileName(originalFileName);
            String resultFileId = fileStorageService.uploadFile(
                resultFileName,
                new ByteArrayInputStream(resultBytes),
                resultBytes.length,
                "text/plain"
            );
            String resultUrl = fileStorageService.getFileUrl(resultFileId, resultFileName);
            taskService.updateTaskStatus(taskId, TaskStatusResult.success(taskId, resultUrl, resultFileName, recognizedText));

            fileStorageService.deleteFile(sourceFileId);
        } catch (Exception e) {
            taskService.updateTaskStatus(taskId, TaskStatusResult.fail(taskId, "截图识别失败: " + e.getMessage()));
        }
    }

    private String buildZipFileName(String originalFileName) {
        if (originalFileName == null || originalFileName.isBlank()) {
            return "converted.zip";
        }
        int dotIndex = originalFileName.lastIndexOf('.');
        String baseName = dotIndex > 0 ? originalFileName.substring(0, dotIndex) : originalFileName;
        return baseName + ".zip";
    }

    private String buildCsvFileName(String originalFileName) {
        if (originalFileName == null || originalFileName.isBlank()) {
            return "converted.csv";
        }
        int dotIndex = originalFileName.lastIndexOf('.');
        String baseName = dotIndex > 0 ? originalFileName.substring(0, dotIndex) : originalFileName;
        return baseName + ".csv";
    }

    private void renderSingleWatermark(PDPageContentStream cs, String type, org.apache.pdfbox.pdmodel.font.PDFont font,
                                       PDImageXObject image, String text, int fontSize, String color,
                                       float rotation, float scale, float x, float y) throws java.io.IOException {
        cs.saveGraphicsState();
        if ("text".equals(type)) {
            cs.beginText();
            cs.setFont(font, fontSize);
            if (color != null && color.startsWith("#")) {
                float r = Integer.parseInt(color.substring(1, 3), 16) / 255.0f;
                float g = Integer.parseInt(color.substring(3, 5), 16) / 255.0f;
                float b = Integer.parseInt(color.substring(5, 7), 16) / 255.0f;
                cs.setNonStrokingColor(r, g, b);
            }
            float textWidth = font.getStringWidth(text) / 1000 * fontSize;
            cs.setTextMatrix(org.apache.pdfbox.util.Matrix.getRotateInstance(Math.toRadians(rotation), x, y));
            cs.newLineAtOffset(-textWidth / 2 * scale, 0);
            cs.showText(text);
            cs.endText();
        } else if (image != null) {
            float w = image.getWidth() * scale;
            float h = image.getHeight() * scale;
            cs.transform(org.apache.pdfbox.util.Matrix.getRotateInstance(Math.toRadians(rotation), x, y));
            cs.drawImage(image, -w / 2, -h / 2, w, h);
        }
        cs.restoreGraphicsState();
    }

    private void renderTiledWatermark(PDPageContentStream cs, String type, org.apache.pdfbox.pdmodel.font.PDFont font,
                                      PDImageXObject image, String text, int fontSize, String color,
                                      float rotation, float scale, float pageWidth, float pageHeight) throws java.io.IOException {
        float stepX = 200, stepY = 200;
        for (float x = 0; x < pageWidth + stepX; x += stepX) {
            for (float y = 0; y < pageHeight + stepY; y += stepY) {
                renderSingleWatermark(cs, type, font, image, text, fontSize, color, rotation, scale, x, y);
            }
        }
    }



    private String extractPdfTextWithOcr(String taskId, byte[] fileData) throws Exception {
        try (PDDocument document = Loader.loadPDF(fileData)) {
            String text = extractPdfTextWithLayout(document);

            // 如果提取出的文本为空或长度极短，则判定为扫描件，启动 OCR
            // 增加逻辑：如果文本中包含大量乱码（不可见字符比例高），也触发 OCR
            if (isScanOrCorrupted(text)) {
                return performOcrOnPdf(taskId, document);
            }
            return text;
        }
    }

    private String extractPdfTextWithLayout(PDDocument document) throws Exception {
        LayoutAwarePdfTextStripper stripper = new LayoutAwarePdfTextStripper();
        stripper.setSortByPosition(true);
        return stripper.getText(document);
    }

    private boolean isScanOrCorrupted(String text) {
        if (text == null || text.trim().length() < 20) {
            return true;
        }
        // 简单判断：如果文本中中文字符和英文字符比例过低，可能是乱码或扫描件
        long validChars = text.chars().filter(c -> Character.isLetterOrDigit(c) || Character.isSpaceChar(c)).count();
        return (double) validChars / text.length() < 0.5;
    }

    private String performOcrOnPdf(String taskId, PDDocument document) throws Exception {
        if (baiduOcrEnabled && !baiduApiKey.isEmpty()) {
            return performBaiduOcr(taskId, document);
        }

        Tesseract tesseract = new Tesseract();
        tesseract.setLanguage("chi_sim+eng");

        StringBuilder sb = new StringBuilder();
        PDFRenderer pdfRenderer = new PDFRenderer(document);
        int pageCount = document.getNumberOfPages();

        for (int i = 0; i < pageCount; i++) {
            int progress = 30 + (int) (((double) (i + 1) / pageCount) * 40);
            taskService.updateTaskStatus(taskId, TaskStatusResult.processing(taskId, progress));

            BufferedImage image = pdfRenderer.renderImageWithDPI(i, 300, org.apache.pdfbox.rendering.ImageType.GRAY);
            String pageText = tesseract.doOCR(image);

            if (pageText != null) {
                pageText = pageText.replaceAll("(?m)^\\s*$", "").trim();
            }

            sb.append("--- 第 ").append(i + 1).append(" 页 ---\n");
            sb.append(pageText).append("\n\n");
        }
        return sb.toString();
    }

    private String performImageOcr(String taskId, byte[] fileData) throws Exception {
        BufferedImage image = ImageIO.read(new ByteArrayInputStream(fileData));
        if (image == null) {
            throw new IllegalArgumentException("无法解析图片文件");
        }

        List<BufferedImage> candidates = buildKingScoreOcrCandidates(image);
        String bestText = "";
        int bestScore = -1;

        if (baiduOcrEnabled && !baiduApiKey.isBlank() && !baiduSecretKey.isBlank()) {
            AipOcr client = new AipOcr(baiduAppId, baiduApiKey, baiduSecretKey);
            for (BufferedImage candidate : candidates) {
                OcrServiceDecision decision = decideBaiduOcrService(candidate, 1);
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                ImageIO.write(candidate, "jpg", baos);
                JSONObject res = invokeBaiduOcr(client, baos.toByteArray(), decision);
                String text = buildPageTextFromBaiduResult(res);
                int score = scoreOcrText(text);
                if (score > bestScore) {
                    bestScore = score;
                    bestText = text == null ? "" : text.trim();
                }
            }
            if (!bestText.isBlank()) {
                return bestText;
            }
        }

        taskService.updateTaskStatus(taskId, TaskStatusResult.processing(taskId, 65));
        Tesseract tesseract = new Tesseract();
        tesseract.setLanguage("chi_sim+eng");
        for (BufferedImage candidate : candidates) {
            String text = tesseract.doOCR(candidate);
            text = text == null ? "" : text.replaceAll("(?m)^\\s*$", "").trim();
            int score = scoreOcrText(text);
            if (score > bestScore) {
                bestScore = score;
                bestText = text;
            }
        }
        return bestText;
    }

    private List<BufferedImage> buildKingScoreOcrCandidates(BufferedImage source) {
        List<BufferedImage> candidates = new ArrayList<>();
        BufferedImage full = ensureRgb(source);
        candidates.add(full);

        BufferedImage battleArea = cropKingScoreBattleArea(full);
        addCandidate(candidates, enhanceForOcr(battleArea, 1.6, 1.18f, 8));
        addCandidate(candidates, enhanceForOcr(battleArea, 2.0, 1.28f, 14));
        addCandidate(candidates, enhanceForOcr(full, 1.4, 1.12f, 6));
        return candidates;
    }

    private void addCandidate(List<BufferedImage> candidates, BufferedImage image) {
        if (image != null) {
            candidates.add(image);
        }
    }

    private BufferedImage ensureRgb(BufferedImage source) {
        if (source.getType() == BufferedImage.TYPE_INT_RGB) {
            return source;
        }
        BufferedImage converted = new BufferedImage(source.getWidth(), source.getHeight(), BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = converted.createGraphics();
        try {
            graphics.setColor(Color.WHITE);
            graphics.fillRect(0, 0, converted.getWidth(), converted.getHeight());
            graphics.drawImage(source, 0, 0, null);
        } finally {
            graphics.dispose();
        }
        return converted;
    }

    private BufferedImage cropKingScoreBattleArea(BufferedImage source) {
        int width = source.getWidth();
        int height = source.getHeight();
        int left = Math.max(0, (int) (width * 0.08));
        int top = Math.max(0, (int) (height * 0.14));
        int cropWidth = Math.min(width - left, (int) (width * 0.84));
        int cropHeight = Math.min(height - top, (int) (height * 0.70));
        if (cropWidth <= 0 || cropHeight <= 0) {
            return source;
        }
        return source.getSubimage(left, top, cropWidth, cropHeight);
    }

    private BufferedImage enhanceForOcr(BufferedImage source, double scale, float contrast, int brightnessOffset) {
        int width = Math.max(1, (int) Math.round(source.getWidth() * scale));
        int height = Math.max(1, (int) Math.round(source.getHeight() * scale));
        BufferedImage scaled = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = scaled.createGraphics();
        try {
            graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            graphics.drawImage(source, 0, 0, width, height, null);
        } finally {
            graphics.dispose();
        }

        BufferedImage enhanced = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                int rgb = scaled.getRGB(x, y);
                int r = (rgb >> 16) & 0xff;
                int g = (rgb >> 8) & 0xff;
                int b = rgb & 0xff;
                int gray = (int) (0.299 * r + 0.587 * g + 0.114 * b);
                int adjusted = Math.max(0, Math.min(255, Math.round((gray - 128) * contrast + 128 + brightnessOffset)));
                int value = (adjusted << 16) | (adjusted << 8) | adjusted;
                enhanced.setRGB(x, y, value);
            }
        }
        return enhanced;
    }

    private int scoreOcrText(String text) {
        if (text == null || text.isBlank()) {
            return 0;
        }
        int score = text.replaceAll("\\s+", "").length();
        score += countMatches(text, Pattern.compile("\\d+\\s*/\\s*\\d+\\s*/\\s*\\d+")) * 20;
        score += countMatches(text, Pattern.compile("MVP", Pattern.CASE_INSENSITIVE)) * 10;
        score += countMatches(text, Pattern.compile("胜利|失败")) * 8;
        score += countMatches(text, Pattern.compile("\\d{1,2}:\\d{2}")) * 6;
        score -= countMatches(text, Pattern.compile("[«»<>]+")) * 2;
        return score;
    }

    private int countMatches(String text, Pattern pattern) {
        Matcher matcher = pattern.matcher(text);
        int count = 0;
        while (matcher.find()) {
            count++;
        }
        return count;
    }

    private String buildOcrResultFileName(String originalFileName) {
        String baseName = "king_score_ocr";
        if (originalFileName != null && !originalFileName.isBlank()) {
            int dotIndex = originalFileName.lastIndexOf('.');
            baseName = dotIndex > 0 ? originalFileName.substring(0, dotIndex) : originalFileName;
        }
        return baseName + "_ocr.txt";
    }

    private String performBaiduOcr(String taskId, PDDocument document) throws Exception {
        AipOcr client = new AipOcr(baiduAppId, baiduApiKey, baiduSecretKey);
        StringBuilder sb = new StringBuilder();
        PDFRenderer pdfRenderer = new PDFRenderer(document);
        int pageCount = document.getNumberOfPages();

        for (int i = 0; i < pageCount; i++) {
            int progress = 30 + (int) (((double) (i + 1) / pageCount) * 50);
            taskService.updateTaskStatus(taskId, TaskStatusResult.processing(taskId, progress));

            BufferedImage image = pdfRenderer.renderImageWithDPI(i, 300);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(image, "jpg", baos);
            byte[] imgData = baos.toByteArray();

            OcrServiceDecision decision = decideBaiduOcrService(image, pageCount);
            JSONObject res = invokeBaiduOcr(client, imgData, decision);
            sb.append("--- 第 ").append(i + 1).append(" 页 ---\n");
            sb.append(buildPageTextFromBaiduResult(res)).append("\n\n");
        }
        return sb.toString();
    }

    private OcrServiceDecision decideBaiduOcrService(BufferedImage image, int pageCount) {
        int width = Math.max(image.getWidth(), 1);
        int height = Math.max(image.getHeight(), 1);
        boolean verySmallPage = width < 1200 || height < 1200;
        boolean simpleSinglePage = pageCount == 1 && width * height < 1_500_000;

        if (verySmallPage && simpleSinglePage) {
            return new OcrServiceDecision("basicAccurateGeneral", false, true);
        }
        return new OcrServiceDecision("accurateGeneral", true, true);
    }

    private JSONObject invokeBaiduOcr(AipOcr client, byte[] imgData, OcrServiceDecision decision) {
        HashMap<String, String> options = new HashMap<>();
        options.put("probability", "true");
        if (decision.withPosition()) {
            options.put("recognize_granularity", "small");
            options.put("vertexes_location", "true");
        }

        return switch (decision.methodName()) {
            case "basicGeneral" -> client.basicGeneral(imgData, options);
            case "basicAccurateGeneral" -> client.basicAccurateGeneral(imgData, options);
            case "enhancedGeneral" -> client.enhancedGeneral(imgData, options);
            default -> client.accurateGeneral(imgData, options);
        };
    }

    private byte[] callBaiduImageMatting(byte[] imageBytes) throws Exception {
        String accessToken = fetchBaiduAccessToken();
        String imageBase64 = Base64.getEncoder().encodeToString(imageBytes);
        String body = "image=" + URLEncoder.encode(imageBase64, StandardCharsets.UTF_8)
            + "&return_form=rgba"
            + "&refine_mask=true";

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://aip.baidubce.com/rest/2.0/image-process/v1/segment?access_token=" + URLEncoder.encode(accessToken, StandardCharsets.UTF_8)))
            .timeout(Duration.ofSeconds(60))
            .header("Content-Type", "application/x-www-form-urlencoded")
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IllegalStateException("百度智能抠图请求失败: HTTP " + response.statusCode());
        }

        JSONObject json = new JSONObject(response.body());
        if (json.has("error_msg")) {
            throw new IllegalStateException(json.optString("error_msg", "百度智能抠图失败"));
        }

        String image = json.optString("image", "");
        if (image.isBlank()) {
            throw new IllegalStateException("百度智能抠图未返回图片结果");
        }
        return Base64.getDecoder().decode(image);
    }

    private String fetchBaiduAccessToken() throws Exception {
        String body = "grant_type=client_credentials"
            + "&client_id=" + URLEncoder.encode(baiduImageMattingApiKey, StandardCharsets.UTF_8)
            + "&client_secret=" + URLEncoder.encode(baiduImageMattingSecretKey, StandardCharsets.UTF_8);

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://aip.baidubce.com/oauth/2.0/token"))
            .timeout(Duration.ofSeconds(30))
            .header("Content-Type", "application/x-www-form-urlencoded")
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IllegalStateException("获取百度 access_token 失败: HTTP " + response.statusCode());
        }

        JSONObject json = new JSONObject(response.body());
        if (json.has("error_description")) {
            throw new IllegalStateException(json.optString("error_description", "获取百度 access_token 失败"));
        }

        String accessToken = json.optString("access_token", "");
        if (accessToken.isBlank()) {
            throw new IllegalStateException("百度 access_token 为空");
        }
        return accessToken;
    }

    private byte[] mergeForegroundWithSolidBackground(byte[] foregroundBytes, String bgColor) throws Exception {
        BufferedImage foreground = ImageIO.read(new ByteArrayInputStream(foregroundBytes));
        if (foreground == null) {
            throw new IllegalStateException("抠图结果无法解析为图片");
        }

        BufferedImage result = new BufferedImage(foreground.getWidth(), foreground.getHeight(), BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = result.createGraphics();
        try {
            graphics.setColor(resolveIdPhotoBgColor(bgColor));
            graphics.fillRect(0, 0, result.getWidth(), result.getHeight());
            graphics.setComposite(AlphaComposite.SrcOver);
            graphics.drawImage(foreground, 0, 0, null);
        } finally {
            graphics.dispose();
        }

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        ImageIO.write(result, "png", outputStream);
        return outputStream.toByteArray();
    }

    private Color resolveIdPhotoBgColor(String bgColor) {
        return switch (bgColor) {
            case "red" -> new Color(237, 25, 65);
            case "blue" -> new Color(67, 142, 219);
            default -> Color.WHITE;
        };
    }

    private String buildIdPhotoBgFileName(String bgColor) {
        String colorLabel = switch (bgColor) {
            case "red" -> "红底";
            case "blue" -> "蓝底";
            default -> "白底";
        };
        String timestamp = LocalDateTime.now().format(FILE_NAME_TIME_FORMATTER);
        return "证件照_" + colorLabel + "_" + timestamp + ".png";
    }

    private String buildPageTextFromBaiduResult(JSONObject res) {
        if (!res.has("words_result")) {
            return "";
        }

        JSONArray array = res.getJSONArray("words_result");
        List<OcrChar> chars = extractChars(array);
        if (!chars.isEmpty()) {
            return buildTextFromChars(chars);
        }
        return buildTextFromWords(array);
    }

    private List<OcrChar> extractChars(JSONArray array) {
        List<OcrChar> chars = new ArrayList<>();
        for (int i = 0; i < array.length(); i++) {
            JSONObject item = array.getJSONObject(i);
            JSONArray charArray = item.optJSONArray("chars");
            if (charArray == null) {
                continue;
            }
            for (int j = 0; j < charArray.length(); j++) {
                JSONObject charItem = charArray.optJSONObject(j);
                if (charItem == null) {
                    continue;
                }
                String text = charItem.optString("char", "");
                if (text.isBlank()) {
                    continue;
                }
                JSONObject location = charItem.optJSONObject("location");
                if (location == null) {
                    continue;
                }
                int left = location.optInt("left", 0);
                int top = location.optInt("top", 0);
                int width = Math.max(location.optInt("width", 0), 1);
                int height = Math.max(location.optInt("height", 0), 1);
                chars.add(new OcrChar(text, left, top, width, height));
            }
        }
        return chars;
    }

    private String buildTextFromChars(List<OcrChar> chars) {
        List<ReconstructedLine> lines = reconstructLines(chars);
        if (lines.isEmpty()) {
            return "";
        }

        int minLeft = lines.stream().mapToInt(ReconstructedLine::left).min().orElse(0);
        int medianCharWidth = median(chars.stream().map(OcrChar::width).toList(), 12);
        int medianCharHeight = median(chars.stream().map(OcrChar::height).toList(), 16);
        StringBuilder sb = new StringBuilder();
        ReconstructedLine previous = null;

        for (ReconstructedLine line : lines) {
            if (previous != null) {
                int verticalGap = line.top() - previous.bottom();
                int blankLineThreshold = Math.max(medianCharHeight, Math.max(previous.height(), line.height()));
                sb.append(verticalGap > blankLineThreshold ? "\n\n" : "\n");
            }

            int indentUnit = Math.max(8, medianCharWidth);
            int indent = Math.max(0, (line.left() - minLeft) / indentUnit);
            if (indent > 0) {
                sb.append(" ".repeat(indent));
            }
            sb.append(buildLineText(line.chars(), medianCharWidth));
            previous = line;
        }

        return sb.toString().trim();
    }

    private List<ReconstructedLine> reconstructLines(List<OcrChar> chars) {
        List<OcrChar> sortedChars = new ArrayList<>(chars);
        sortedChars.sort(Comparator.comparingInt(OcrChar::centerY).thenComparingInt(OcrChar::left));

        int medianCharHeight = median(sortedChars.stream().map(OcrChar::height).toList(), 16);
        List<List<OcrChar>> groups = new ArrayList<>();
        List<OcrChar> currentGroup = new ArrayList<>();
        double currentCenterY = 0;
        int currentHeight = medianCharHeight;

        for (OcrChar ocrChar : sortedChars) {
            if (currentGroup.isEmpty()) {
                currentGroup.add(ocrChar);
                currentCenterY = ocrChar.centerY();
                currentHeight = ocrChar.height();
                continue;
            }

            int lineThreshold = Math.max(4, Math.max(medianCharHeight, Math.max(currentHeight, ocrChar.height())) / 2);
            if (Math.abs(ocrChar.centerY() - currentCenterY) <= lineThreshold) {
                currentGroup.add(ocrChar);
                currentCenterY = currentGroup.stream().mapToInt(OcrChar::centerY).average().orElse(ocrChar.centerY());
                currentHeight = Math.max(currentHeight, ocrChar.height());
                continue;
            }

            groups.add(new ArrayList<>(currentGroup));
            currentGroup.clear();
            currentGroup.add(ocrChar);
            currentCenterY = ocrChar.centerY();
            currentHeight = ocrChar.height();
        }

        if (!currentGroup.isEmpty()) {
            groups.add(new ArrayList<>(currentGroup));
        }

        List<ReconstructedLine> lines = new ArrayList<>();
        for (List<OcrChar> group : groups) {
            group.sort(Comparator.comparingInt(OcrChar::left));
            int left = group.stream().mapToInt(OcrChar::left).min().orElse(0);
            int top = group.stream().mapToInt(OcrChar::top).min().orElse(0);
            int height = group.stream().mapToInt(OcrChar::height).max().orElse(medianCharHeight);
            lines.add(new ReconstructedLine(group, left, top, height));
        }
        lines.sort(Comparator.comparingInt(ReconstructedLine::top).thenComparingInt(ReconstructedLine::left));
        return lines;
    }

    private String buildLineText(List<OcrChar> chars, int medianCharWidth) {
        StringBuilder sb = new StringBuilder();
        OcrChar previous = null;
        int splitThreshold = Math.max(18, medianCharWidth * 2);
        for (OcrChar current : chars) {
            if (previous == null) {
                sb.append("«").append(current.left()).append("»");
            } else {
                int gap = current.left() - previous.right();
                if (gap >= splitThreshold) {
                    sb.append("\t«").append(current.left()).append("»");
                }
            }
            sb.append(current.text());
            previous = current;
        }
        return sb.toString().trim();
    }

    private String buildTextFromWords(JSONArray array) {
        List<OcrLine> words = new ArrayList<>();
        for (int i = 0; i < array.length(); i++) {
            JSONObject item = array.getJSONObject(i);
            String text = item.optString("words", "").trim();
            if (text.isEmpty()) {
                continue;
            }

            JSONObject location = item.optJSONObject("location");
            int left = location != null ? location.optInt("left", 0) : 0;
            int top = location != null ? location.optInt("top", 0) : 0;
            int width = location != null ? location.optInt("width", 0) : 0;
            int height = location != null ? Math.max(location.optInt("height", 0), 1) : 1;
            words.add(new OcrLine(text, left, top, width, height));
        }

        if (words.isEmpty()) {
            return "";
        }

        words.sort(Comparator.comparingInt(OcrLine::top).thenComparingInt(OcrLine::left));
        int minLeft = words.stream().mapToInt(OcrLine::left).min().orElse(0);
        int medianWordWidth = median(words.stream().map(OcrLine::width).toList(), 24);
        StringBuilder sb = new StringBuilder();
        List<OcrLine> currentRow = new ArrayList<>();
        OcrLine previousRowAnchor = null;

        for (OcrLine word : words) {
            if (currentRow.isEmpty()) {
                currentRow.add(word);
                continue;
            }

            OcrLine anchor = currentRow.get(0);
            int sameLineThreshold = Math.max(4, Math.max(anchor.height(), word.height()) / 2);
            if (Math.abs(word.top() - anchor.top()) <= sameLineThreshold) {
                currentRow.add(word);
                continue;
            }

            appendWordRow(sb, currentRow, minLeft, medianWordWidth, previousRowAnchor);
            previousRowAnchor = currentRow.get(0);
            currentRow = new ArrayList<>();
            currentRow.add(word);
        }

        appendWordRow(sb, currentRow, minLeft, medianWordWidth, previousRowAnchor);
        return sb.toString().trim();
    }

    private void appendWordRow(StringBuilder sb, List<OcrLine> row, int minLeft, int medianWordWidth, OcrLine previousRowAnchor) {
        if (row.isEmpty()) {
            return;
        }
        row.sort(Comparator.comparingInt(OcrLine::left));
        OcrLine first = row.get(0);
        if (previousRowAnchor != null) {
            int verticalGap = first.top() - previousRowAnchor.top();
            int blankLineThreshold = Math.max(previousRowAnchor.height(), first.height()) * 2;
            sb.append(verticalGap > blankLineThreshold ? "\n\n" : "\n");
        }

        int indent = Math.max(0, (first.left() - minLeft) / 24);
        if (indent > 0) {
            sb.append(" ".repeat(indent));
        }

        OcrLine previous = null;
        int splitThreshold = Math.max(20, medianWordWidth);
        for (OcrLine current : row) {
            if (previous == null) {
                sb.append("«").append(current.left()).append("»");
            } else {
                int gap = current.left() - previous.right();
                if (gap >= splitThreshold) {
                    sb.append("\t«").append(current.left()).append("»");
                }
            }
            sb.append(current.words());
            previous = current;
        }
    }

    private int median(List<Integer> values, int fallback) {
        if (values.isEmpty()) {
            return fallback;
        }
        List<Integer> sorted = new ArrayList<>(values);
        sorted.sort(Integer::compareTo);
        return sorted.get(sorted.size() / 2);
    }

    private static class LayoutAwarePdfTextStripper extends PDFTextStripper {
        private float previousX = -1;
        private float previousEndX = -1;
        private float previousY = -1;
        private float previousHeight = -1;

        private LayoutAwarePdfTextStripper() throws java.io.IOException {
            super();
        }

        @Override
        protected void writeString(String text, List<TextPosition> textPositions) throws java.io.IOException {
            if (textPositions == null || textPositions.isEmpty()) {
                return;
            }

            // 核心改进：逐个字符检查间距，因为 PDFBox 可能会将多个列的文本合并到一个 writeString 调用中
            for (TextPosition current : textPositions) {
                float currentY = current.getYDirAdj();
                float currentX = current.getXDirAdj();
                float currentHeight = current.getHeightDir();

                if (previousY >= 0) {
                    float lineThreshold = Math.max(4f, Math.max(previousHeight, currentHeight) / 2f);
                    if (Math.abs(currentY - previousY) > lineThreshold) {
                        writeLineSeparator();
                        previousX = -1;
                        previousEndX = -1;
                    } else if (previousEndX >= 0) {
                        float gap = currentX - previousEndX;
                        float currentWidth = Math.max(current.getWidthDirAdj(), 1f);
                        float splitThreshold = Math.max(4f, Math.max(previousHeight, currentHeight) * 0.45f + currentWidth * 0.35f);
                        if (gap >= splitThreshold) {
                            output.write("\t«" + (int)(currentX * 10) + "»");
                        }
                    }
                }

                if (previousX == -1) {
                    output.write("«" + (int)(currentX * 10) + "»");
                }
                output.write(current.getUnicode());

                previousX = currentX;
                previousEndX = currentX + current.getWidthDirAdj();
                previousY = currentY;
                previousHeight = currentHeight;
            }
        }

        @Override
        protected void startPage(org.apache.pdfbox.pdmodel.PDPage page) throws java.io.IOException {
            super.startPage(page);
            previousX = -1;
            previousEndX = -1;
            previousY = -1;
            previousHeight = -1;
        }
    }

    private record OcrChar(String text, int left, int top, int width, int height) {
        private int right() {
            return left + width;
        }

        private int centerY() {
            return top + height / 2;
        }
    }

    private record ReconstructedLine(List<OcrChar> chars, int left, int top, int height) {
        private int bottom() {
            return top + height;
        }
    }

    private record OcrLine(String words, int left, int top, int width, int height) {
        private int right() {
            return left + width;
        }
    }

    private record OcrServiceDecision(String methodName, boolean withPosition, boolean highAccuracy) {
    }

    private byte[] createWordDocument(String text) throws Exception {
        WordprocessingMLPackage wordPackage = WordprocessingMLPackage.createPackage();
        ObjectFactory factory = new ObjectFactory();
        String[] paragraphs = text.split("\\R{2,}");
        for (String paragraphText : paragraphs) {
            P paragraph = factory.createP();
            R run = factory.createR();
            Text wordText = factory.createText();
            wordText.setValue(paragraphText == null || paragraphText.isBlank() ? " " : paragraphText.trim());
            run.getContent().add(wordText);
            paragraph.getContent().add(run);
            wordPackage.getMainDocumentPart().addObject(paragraph);
        }
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            wordPackage.save(outputStream);
            return outputStream.toByteArray();
        }
    }

    private byte[] createExcelDocument(String text) throws Exception {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Sheet1");
            List<String> lines = collectTableLines(text);
            List<Integer> anchors = buildGlobalColumnAnchors(lines);
            List<List<String>> rows = new ArrayList<>();
            List<List<String>> headerRows = new ArrayList<>();
            String currentMajor = "";
            for (String line : lines) {
                String cleanLine = stripCoordinateMarkers(line);
                List<String> splitLines = splitCompoundMajorAndDataLine(line);
                if (!splitLines.isEmpty()) {
                    currentMajor = stripCoordinateMarkers(splitLines.get(0));
                    line = splitLines.get(1);
                    cleanLine = stripCoordinateMarkers(line);
                }

                if (isMajorGroupLine(cleanLine)) {
                    currentMajor = cleanLine;
                    continue;
                }

                boolean headerLike = looksLikeHeaderRow(cleanLine) && !looksLikeDataRow(cleanLine);
                if (headerLike) {
                    List<String> headerCells = mapLineToCells(line, anchors);
                    if (!headerCells.isEmpty()) {
                        headerRows.add(headerCells);
                    }
                    continue;
                }
                boolean isTitle = cleanLine.length() > 20 && !looksLikeDataRow(cleanLine) && line.chars().filter(c -> c == '\t').count() < 3;
                if (isTitle) {
                    rows.add(List.of(cleanLine));
                    continue;
                }

                List<String> cells = mapLineToCells(line, anchors);
                if (!cells.isEmpty()) {
                    if (looksLikeRecordRow(cleanLine, cells)) {
                        rows.add(applyMajorToRecord(cells, currentMajor));
                    } else {
                        rows.add(cells);
                    }
                }
            }

            rows = mergeContinuationRows(rows);
            rows = mergeHeaderRows(rows);
            rows = carryForwardLeadingCells(rows);
            rows = prependExtractedHeaderRow(rows, headerRows);

            int rowIndex = 0;
            int maxColumnCount = 1;
            for (List<String> rowData : rows) {
                if (isEffectivelyEmptyRow(rowData)) {
                    continue;
                }
                org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowIndex++);
                for (int columnIndex = 0; columnIndex < rowData.size(); columnIndex++) {
                    String value = normalizeCellValue(rowData.get(columnIndex));
                    if (value.isEmpty()) {
                        continue;
                    }
                    Cell cell = row.createCell(columnIndex);
                    cell.setCellValue(value);
                }
                maxColumnCount = Math.max(maxColumnCount, rowData.size());
            }
            if (rowIndex == 0) {
                sheet.createRow(0).createCell(0).setCellValue("");
            }
            for (int columnIndex = 0; columnIndex < maxColumnCount; columnIndex++) {
                sheet.autoSizeColumn(columnIndex);
            }
            workbook.write(outputStream);
            return outputStream.toByteArray();
        }
    }

    private boolean isPageMarkerLine(String line) {
        if (line == null) return false;
        String trimmed = line.trim();
        // 使用更通用的模式匹配页码，不依赖特定业务词汇
        return trimmed.matches("---\\s*.*\\s*\\d+\\s*.*\\s*---") || // --- 第 1 页 --- 或 --- Page 1 ---
               trimmed.matches(".*[\\(\\[【].*\\d+.*[\\)\\]】].*") && (trimmed.contains("页") || trimmed.toLowerCase().contains("page")) || // 【第 1 页】
               trimmed.matches("(?i).*page\\s*\\d+.*") || // Page 1
               trimmed.matches(".*\\d+\\s*/\\s*\\d+.*") || // 1 / 12
               trimmed.matches("^第\\s*\\d+\\s*页$");
    }

    private List<String> collectTableLines(String text) {
        String[] sourceLines = text == null ? new String[0] : text.split("\\R");
        List<String> normalizedLines = new ArrayList<>();
        Map<String, Integer> frequencies = new LinkedHashMap<>();
        for (String rawLine : sourceLines) {
            String line = normalizeRawLine(rawLine);
            String cleanLine = stripCoordinateMarkers(line);
            if (cleanLine.isEmpty() || isPageMarkerLine(cleanLine)) {
                continue;
            }
            normalizedLines.add(line);
            String fingerprint = cleanLine.replaceAll("\\d", "#").trim();
            if (fingerprint.length() >= 2) {
                frequencies.merge(fingerprint, 1, Integer::sum);
            }
        }

        Set<String> repeatedNoise = new HashSet<>();
        for (Map.Entry<String, Integer> entry : frequencies.entrySet()) {
            if (entry.getValue() >= 2 && !looksLikeDataRow(entry.getKey())) {
                repeatedNoise.add(entry.getKey());
            }
        }

        List<String> lines = new ArrayList<>();
        String previous = null;
        for (String line : normalizedLines) {
            if (isRepeatedHeaderFooter(line, repeatedNoise)) {
                continue;
            }
            if (previous != null && isContinuationHeader(line, previous)) {
                continue;
            }
            lines.add(line);
            previous = line;
        }
        return lines;
    }

    private String normalizeRawLine(String line) {
        if (line == null) {
            return "";
        }
        return line.replace('\u00A0', ' ')
            .replace('\u2003', ' ')
            .replace('\u3000', '　')
            .replaceAll("[ \t　]+$", "")
            .trim();
    }

    private boolean isRepeatedHeaderFooter(String line, Set<String> repeatedNoise) {
        String trimmed = normalizeRawLine(line);
        if (trimmed.isEmpty()) {
            return true;
        }

        if (trimmed.matches("[-—=_*]{3,}")) {
            return true;
        }

        String cleanLine = stripCoordinateMarkers(trimmed);
        String fingerprint = cleanLine.replaceAll("\\d", "#");
        if (repeatedNoise.contains(fingerprint) && !looksLikeDataRow(cleanLine)) {
            return true;
        }

        String normalizedFingerprint = normalizeDataFingerprint(trimmed);
        return repeatedNoise.contains(normalizedFingerprint) && looksLikeHeaderRow(cleanLine) && !looksLikeRecordRow(cleanLine, splitLineToCells(cleanLine));
    }

    private boolean isContinuationHeader(String current, String previous) {
        String currentLine = normalizeRawLine(current);
        String previousLine = normalizeRawLine(previous);
        if (currentLine.isEmpty() || previousLine.isEmpty()) {
            return false;
        }
        if (normalizeHeaderText(currentLine).equals(normalizeHeaderText(previousLine))) {
            return true;
        }
        if (!looksLikeHeaderRow(currentLine) || !looksLikeHeaderRow(previousLine)) {
            return false;
        }
        List<String> currentCells = normalizeHeaderCells(splitLineToCells(currentLine));
        List<String> previousCells = normalizeHeaderCells(splitLineToCells(previousLine));
        return !currentCells.isEmpty() && currentCells.equals(previousCells);
    }

    private List<Integer> buildGlobalColumnAnchors(List<String> lines) {
        Map<Integer, Integer> positionFrequencies = new HashMap<>();
        int sampleRowCount = 0;
        for (String line : lines) {
            String cleanLine = stripCoordinateMarkers(line);
            boolean recordLike = looksLikeRecordRow(cleanLine, splitLineToCells(cleanLine));
            boolean headerLike = looksLikeHeaderRow(cleanLine) && !looksLikeDataRow(cleanLine);
            if (!recordLike && !headerLike) {
                continue;
            }
            List<Integer> linePositions = findCoordinatePositions(line);
            if (linePositions.size() <= 1) {
                continue;
            }
            for (int i = 0; i < linePositions.size(); i++) {
                positionFrequencies.merge(linePositions.get(i), 1, Integer::sum);
            }
            sampleRowCount++;
        }

        if (positionFrequencies.isEmpty() || sampleRowCount == 0) {
            return List.of();
        }

        int minOccurrence = Math.max(2, (int)(sampleRowCount * 0.08));

        List<Integer> potentialAnchors = new ArrayList<>();
        for (Map.Entry<Integer, Integer> entry : positionFrequencies.entrySet()) {
            if (entry.getValue() >= minOccurrence) {
                potentialAnchors.add(entry.getKey());
            }
        }
        Collections.sort(potentialAnchors);

        List<Integer> anchors = new ArrayList<>();
        if (potentialAnchors.isEmpty()) return anchors;

        List<Integer> currentCluster = new ArrayList<>();
        currentCluster.add(potentialAnchors.get(0));

        for (int i = 1; i < potentialAnchors.size(); i++) {
            int pos = potentialAnchors.get(i);
            if (pos - currentCluster.get(currentCluster.size() - 1) <= 36) {
                currentCluster.add(pos);
            } else {
                anchors.add(median(currentCluster, currentCluster.get(0)));
                currentCluster.clear();
                currentCluster.add(pos);
            }
        }
        if (!currentCluster.isEmpty()) {
            anchors.add(median(currentCluster, currentCluster.get(0)));
        }

        return anchors;
    }

    private List<List<String>> prependExtractedHeaderRow(List<List<String>> rows, List<List<String>> headerRows) {
        if (rows.isEmpty()) {
            return rows;
        }
        List<String> header = buildDynamicHeader(headerRows, rows.get(0).size());
        if (header.isEmpty()) {
            return rows;
        }
        List<List<String>> normalized = new ArrayList<>();
        normalized.add(header);
        normalized.addAll(rows);
        return normalized;
    }

    private List<String> buildDynamicHeader(List<List<String>> headerRows, int targetSize) {
        if (headerRows == null || headerRows.isEmpty() || targetSize <= 0) {
            return List.of();
        }
        List<List<String>> mergedHeaders = mergeHeaderRows(headerRows);
        List<String> header = new ArrayList<>(Collections.nCopies(targetSize, ""));
        for (List<String> row : mergedHeaders) {
            int limit = Math.min(targetSize, row.size());
            for (int i = 0; i < limit; i++) {
                String normalizedCell = normalizeHeaderLabel(row.get(i));
                if (normalizedCell.isEmpty()) {
                    continue;
                }
                String existing = header.get(i);
                if (existing.isEmpty()) {
                    header.set(i, normalizedCell);
                } else if (!existing.contains(normalizedCell)) {
                    header.set(i, existing + "/" + normalizedCell);
                }
            }
        }
        return trimTrailingEmptyCells(header);
    }

    private String normalizeHeaderLabel(String text) {
        String value = stripCoordinateMarkers(text == null ? "" : text)
            .replaceAll("[ \t　]+", "")
            .trim();
        if (value.isEmpty()) {
            return "";
        }
        return value;
    }

    private List<Integer> findCoordinatePositions(String line) {
        List<Integer> positions = new ArrayList<>();
        Matcher matcher = Pattern.compile("«(\\d+)»").matcher(line);
        while (matcher.find()) {
            positions.add(Integer.parseInt(matcher.group(1)));
        }
        return positions;
    }

    private List<String> mapLineToCells(String line, List<Integer> anchors) {
        if (anchors == null || anchors.isEmpty()) {
            return splitLineToCells(stripCoordinateMarkers(line));
        }
        List<LineSegment> segments = splitLineToSegments(line);
        if (segments.isEmpty()) {
            return splitLineToCells(stripCoordinateMarkers(line));
        }
        List<String> anchoredCells = new ArrayList<>(Collections.nCopies(anchors.size(), ""));
        for (LineSegment segment : segments) {
            int index = resolveAnchorIndex(segment.x(), anchors);
            String existing = anchoredCells.get(index);
            anchoredCells.set(index, existing.isEmpty() ? segment.text() : existing + " " + segment.text());
        }
        return trimTrailingEmptyCells(anchoredCells);
    }

    private int resolveAnchorIndex(int x, List<Integer> anchors) {
        if (anchors.isEmpty()) {
            return 0;
        }
        int bestIndex = 0;
        int bestDistance = Math.abs(x - anchors.get(0));
        for (int i = 1; i < anchors.size(); i++) {
            int distance = Math.abs(x - anchors.get(i));
            if (distance < bestDistance) {
                bestDistance = distance;
                bestIndex = i;
            }
        }
        return bestIndex;
    }

    private List<LineSegment> splitLineToSegments(String line) {
        List<LineSegment> segments = new ArrayList<>();
        // 匹配 «坐标»文本
        Matcher matcher = Pattern.compile("«(\\d+)»([^«\\t\\r\\n]+)").matcher(line);
        while (matcher.find()) {
            int x = Integer.parseInt(matcher.group(1));
            String text = matcher.group(2).trim();
            if (!text.isEmpty()) {
                segments.add(new LineSegment(x, text));
            }
        }
        return segments;
    }

    private List<String> trimTrailingEmptyCells(List<String> cells) {
        int lastIndex = cells.size() - 1;
        while (lastIndex >= 0 && cells.get(lastIndex).isBlank()) {
            lastIndex--;
        }
        if (lastIndex < 0) {
            return List.of();
        }
        List<String> trimmed = new ArrayList<>();
        for (int i = 0; i <= lastIndex; i++) {
            trimmed.add(cells.get(i).trim());
        }
        return trimmed;
    }

    private boolean isEffectivelyEmptyRow(List<String> row) {
        for (String cell : row) {
            if (cell != null && !cell.isBlank()) {
                return false;
            }
        }
        return true;
    }

    private List<String> splitLineToCells(String line) {
        String cleanLine = stripCoordinateMarkers(line);
        String normalized = cleanLine.replaceAll("\\s+$", "");
        if (normalized.isBlank()) {
            return List.of();
        }

        String content = removeLeadingIndent(normalized);
        if (content.contains("\t")) {
            return filterCells(content.split("\\t+"), false);
        }
        return filterCells(content.split("[ 　]{2,}"), false);
    }

    private String stripCoordinateMarkers(String text) {
        if (text == null) return "";
        return text.replaceAll("«\\d+»", "");
    }

    private String removeLeadingIndent(String line) {
        return line == null ? "" : line.replaceFirst("^[ 　]+", "");
    }

    private List<String> filterCells(String[] rawCells, boolean preserveEmptyCells) {
        List<String> cells = new ArrayList<>();
        for (String rawCell : rawCells) {
            if (rawCell == null) {
                if (preserveEmptyCells) {
                    cells.add("");
                }
                continue;
            }
            String trimmed = rawCell.trim();
            if (!trimmed.isEmpty() || preserveEmptyCells) {
                cells.add(trimmed);
            }
        }
        return trimTrailingEmptyCells(cells);
    }

    private String normalizeHeaderText(String line) {
        if (line == null) {
            return "";
        }
        return stripCoordinateMarkers(line)
            .replaceAll("[ \\t　]+", "")
            .replaceAll("[：:、，,；;（）()【】\\[\\]\\-—_/]", "")
            .trim();
    }

    private List<String> normalizeHeaderCells(List<String> cells) {
        List<String> normalized = new ArrayList<>();
        for (String cell : cells) {
            String value = normalizeHeaderText(cell);
            if (!value.isEmpty()) {
                normalized.add(value);
            }
        }
        return normalized;
    }

    private boolean isMajorGroupLine(String line) {
        if (line == null) {
            return false;
        }
        String cleanLine = stripCoordinateMarkers(line).trim();
        if (cleanLine.isEmpty()) {
            return false;
        }
        if (cleanLine.matches(".*\\d{10,}.*")) {
            return false;
        }
        return cleanLine.matches("^\\d{6,}\\S{2,}.*") || cleanLine.matches("^[一二三四五六七八九十A-Za-z0-9]+.+(专业|方向|工程|科学|学院).*");
    }

    private List<String> splitCompoundMajorAndDataLine(String line) {
        if (line == null) {
            return List.of();
        }
        String cleanLine = stripCoordinateMarkers(line).trim();
        Matcher plainMatcher = Pattern.compile("^(\\d{6,}\\S*?)\\s+(\\d{10,}.*)$").matcher(cleanLine);
        if (!plainMatcher.matches()) {
            return List.of();
        }

        String major = plainMatcher.group(1).trim();
        String dataStart = plainMatcher.group(2).trim();
        int dataIndex = cleanLine.indexOf(dataStart);
        if (dataIndex < 0) {
            return List.of();
        }

        String original = line.trim();
        int originalIndex = locateDataStartInOriginal(original, dataStart);
        if (originalIndex < 0) {
            return List.of();
        }

        String data = original.substring(originalIndex).trim();
        if (major.isEmpty() || data.isEmpty()) {
            return List.of();
        }
        return List.of(major, data);
    }

    private int locateDataStartInOriginal(String original, String dataStart) {
        Matcher matcher = Pattern.compile("«\\d+»").matcher(original);
        int lastMarker = -1;
        while (matcher.find()) {
            lastMarker = matcher.start();
            String candidate = stripCoordinateMarkers(original.substring(lastMarker)).trim();
            if (candidate.startsWith(dataStart)) {
                return lastMarker;
            }
        }
        return -1;
    }

    private List<List<String>> mergeContinuationRows(List<List<String>> rows) {
        List<List<String>> merged = new ArrayList<>();
        for (List<String> row : rows) {
            if (merged.isEmpty()) {
                merged.add(new ArrayList<>(row));
                continue;
            }
            List<String> previous = merged.get(merged.size() - 1);
            if (!shouldMergeContinuationRow(previous, row)) {
                merged.add(new ArrayList<>(row));
                continue;
            }
            int targetColumn = findPrimaryContinuationColumn(previous, row);
            List<String> combined = new ArrayList<>(previous);
            ensureRowSize(combined, Math.max(previous.size(), row.size()));
            for (int i = 0; i < row.size(); i++) {
                String current = row.get(i);
                if (current == null || current.isBlank()) {
                    continue;
                }
                if (i == targetColumn || combined.get(i).isBlank()) {
                    combined.set(i, appendCellText(combined.get(i), current));
                }
            }
            merged.set(merged.size() - 1, trimTrailingEmptyCells(combined));
        }
        return merged;
    }

    private boolean shouldMergeContinuationRow(List<String> previous, List<String> current) {
        int previousFilled = countFilledCells(previous);
        int currentFilled = countFilledCells(current);
        if (previousFilled < 2 || currentFilled == 0 || currentFilled > Math.max(2, previousFilled / 2 + 1)) {
            return false;
        }
        if (looksLikeHeaderRow(joinCells(current)) || looksLikeDataRow(joinCells(current))) {
            return false;
        }
        int firstFilled = firstFilledIndex(current);
        return firstFilled >= 0 && firstFilled < current.size();
    }

    private int findPrimaryContinuationColumn(List<String> previous, List<String> current) {
        for (int i = 0; i < Math.min(previous.size(), current.size()); i++) {
            if (!current.get(i).isBlank() && !previous.get(i).isBlank()) {
                return i;
            }
        }
        return Math.max(0, firstFilledIndex(current));
    }

    private List<List<String>> mergeHeaderRows(List<List<String>> rows) {
        if (rows.size() < 2) {
            return rows;
        }
        List<List<String>> merged = new ArrayList<>();
        int index = 0;
        while (index < rows.size()) {
            if (index < rows.size() - 1 && shouldMergeHeaderRows(rows.get(index), rows.get(index + 1))) {
                merged.add(mergeTwoRows(rows.get(index), rows.get(index + 1)));
                index += 2;
                continue;
            }
            merged.add(new ArrayList<>(rows.get(index)));
            index++;
        }
        return merged;
    }

    private boolean shouldMergeHeaderRows(List<String> first, List<String> second) {
        String firstText = joinCells(first);
        String secondText = joinCells(second);
        if (!looksLikeHeaderRow(firstText) || !looksLikeHeaderRow(secondText)) {
            return false;
        }
        int firstFilled = countFilledCells(first);
        int secondFilled = countFilledCells(second);
        return Math.abs(firstFilled - secondFilled) <= 1 && Math.max(firstFilled, secondFilled) >= 2;
    }

    private List<String> mergeTwoRows(List<String> first, List<String> second) {
        int size = Math.max(first.size(), second.size());
        List<String> merged = new ArrayList<>(Collections.nCopies(size, ""));
        for (int i = 0; i < size; i++) {
            String top = i < first.size() ? first.get(i) : "";
            String bottom = i < second.size() ? second.get(i) : "";
            if (!top.isBlank() && !bottom.isBlank() && !top.equals(bottom)) {
                merged.set(i, top + " / " + bottom);
            } else {
                merged.set(i, top.isBlank() ? bottom : top);
            }
        }
        return trimTrailingEmptyCells(merged);
    }

    private List<List<String>> carryForwardLeadingCells(List<List<String>> rows) {
        List<List<String>> normalized = new ArrayList<>();
        List<String> previous = null;
        for (List<String> row : rows) {
            List<String> current = new ArrayList<>(row);
            if (previous != null && shouldCarryForwardLeadingCell(previous, current)) {
                ensureRowSize(current, previous.size());
                current.set(0, previous.get(0));
            }
            normalized.add(current);
            previous = current;
        }
        return normalized;
    }

    private boolean shouldCarryForwardLeadingCell(List<String> previous, List<String> current) {
        if (previous.isEmpty() || current.isEmpty() || previous.get(0).isBlank() || !current.get(0).isBlank()) {
            return false;
        }
        if (countFilledCells(previous) < 2 || countFilledCells(current) < 2) {
            return false;
        }
        int alignedColumns = 0;
        for (int i = 1; i < Math.min(previous.size(), current.size()); i++) {
            if (!previous.get(i).isBlank() && !current.get(i).isBlank()) {
                alignedColumns++;
            }
        }
        return alignedColumns >= 1;
    }

    private List<String> applyMajorToRecord(List<String> cells, String major) {
        List<String> row = new ArrayList<>(cells);
        if (row.isEmpty()) {
            return row;
        }
        if (row.get(0) == null || row.get(0).isBlank()) {
            row.set(0, major == null ? "" : major.trim());
        }
        return row;
    }

    private boolean looksLikeRecordRow(String line, List<String> cells) {
        String cleanLine = stripCoordinateMarkers(line).trim();
        if (cleanLine.matches(".*\\d{10,}.*")) {
            return true;
        }
        if (cells.isEmpty()) {
            return false;
        }
        if (!cells.get(0).matches("\\d{10,}")) {
            return false;
        }
        return cells.size() >= 3;
    }

    private String normalizeDataFingerprint(String line) {
        String cleanLine = stripCoordinateMarkers(normalizeRawLine(line));
        return cleanLine
            .replaceAll("\\d+", "#")
            .replaceAll("[ \\t　]+", "")
            .trim();
    }

    private String normalizeCellValue(String value) {
        String trimmed = value == null ? "" : value.trim();
        if (trimmed.isEmpty()) {
            return "";
        }
        String normalized = normalizeOcrDate(trimmed);
        return normalizeOcrValue(normalized);
    }

    private String normalizeOcrValue(String value) {
        if (!value.matches("[0-9OIlBSozZ,.:/%+\\-]+")) {
            return value;
        }
        return value
            .replace('O', '0')
            .replace('o', '0')
            .replace('I', '1')
            .replace('l', '1')
            .replace('S', '5')
            .replace('B', '8')
            .replace('z', '2')
            .replace('Z', '2');
    }

    private String normalizeOcrDate(String value) {
        if (!value.matches("[0-9OIl./\\-年\u6708\u65e5]+")) {
            return value;
        }
        String normalized = value.replace('O', '0').replace('o', '0').replace('I', '1').replace('l', '1');
        // 移除将点号替换为横杠的逻辑，保留数字成绩中的小数点（如 16.9）
        return normalized.replace('/', '-');
    }

    private boolean looksLikeDataRow(String line) {
        if (line == null || line.length() < 5) return false;

        String cleanLine = stripCoordinateMarkers(line);
        List<String> cells = splitLineToCells(cleanLine);
        if (looksLikeRecordRow(cleanLine, cells)) {
            return true;
        }

        if (looksLikeHeaderRow(cleanLine)) {
            return false;
        }

        if (countCoordinateMarkers(line) >= 4 && cells.size() >= 4) return true;

        long digitCount = cleanLine.chars().filter(Character::isDigit).count();
        double digitRatio = cleanLine.isEmpty() ? 0 : (double) digitCount / cleanLine.length();
        return digitRatio > 0.35 && digitCount >= 6;
    }

    private boolean looksLikeHeaderRow(String line) {
        String cleanLine = stripCoordinateMarkers(line);
        List<String> cells = splitLineToCells(cleanLine);
        if (cells.size() < 2) {
            return false;
        }
        long digitCount = cleanLine.chars().filter(Character::isDigit).count();
        return digitCount <= Math.max(2, cleanLine.length() / 8);
    }

    private int countCoordinateMarkers(String line) {
        if (line == null) return 0;
        int count = 0;
        Matcher m = Pattern.compile("«\\d+»").matcher(line);
        while (m.find()) count++;
        return count;
    }

    private int countFilledCells(List<String> row) {
        int count = 0;
        for (String cell : row) {
            if (cell != null && !cell.isBlank()) {
                count++;
            }
        }
        return count;
    }

    private int firstFilledIndex(List<String> row) {
        for (int i = 0; i < row.size(); i++) {
            if (row.get(i) != null && !row.get(i).isBlank()) {
                return i;
            }
        }
        return -1;
    }

    private void ensureRowSize(List<String> row, int size) {
        while (row.size() < size) {
            row.add("");
        }
    }

    private String appendCellText(String original, String addition) {
        if (original == null || original.isBlank()) {
            return addition.trim();
        }
        // 使用空格而不是换行符来合并，防止单元格内换行
        return original + " " + addition.trim();
    }

    private String joinCells(List<String> row) {
        return String.join(" ", row).trim();
    }

    private record LineSegment(int x, String text) {
    }

    private String buildDocxFileName(String originalFileName) {
        if (originalFileName == null || originalFileName.isBlank()) {
            return "converted.docx";
        }
        int dotIndex = originalFileName.lastIndexOf('.');
        String baseName = dotIndex > 0 ? originalFileName.substring(0, dotIndex) : originalFileName;
        return baseName + ".docx";
    }

    private String buildPdfFileName(String originalFileName) {
        if (originalFileName == null || originalFileName.isBlank()) {
            return "converted.pdf";
        }
        int dotIndex = originalFileName.lastIndexOf('.');
        String baseName = dotIndex > 0 ? originalFileName.substring(0, dotIndex) : originalFileName;
        return baseName + ".pdf";
    }

    private String buildXlsxFileName(String originalFileName) {
        if (originalFileName == null || originalFileName.isBlank()) {
            return "converted.xlsx";
        }
        int dotIndex = originalFileName.lastIndexOf('.');
        String baseName = dotIndex > 0 ? originalFileName.substring(0, dotIndex) : originalFileName;
        return baseName + ".xlsx";
    }

    private String buildRemoteOutputObjectKey(String resultFileName) {
        String fileName = resultFileName == null || resultFileName.isBlank()
            ? "converted.pdf"
            : resultFileName;
        String randomName = java.util.UUID.randomUUID().toString().replace("-", "") + "-" + fileName;
        String prefix = tencentCiProperties.getOutputPrefix();
        if (prefix == null || prefix.isBlank()) {
            return randomName;
        }
        return prefix.endsWith("/") ? prefix + randomName : prefix + "/" + randomName;
    }

    private String resolveWordContentType(String extension) {
        return "doc".equalsIgnoreCase(extension)
            ? "application/msword"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    }

    private String extractExtension(String fileName, String defaultValue) {
        if (fileName == null || !fileName.contains(".")) {
            return defaultValue;
        }
        return fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase();
    }

    private void safeDeleteRemoteObject(String objectKey) {
        if (objectKey == null || objectKey.isBlank()) {
            return;
        }
        try {
            tencentCosObjectService.deleteObject(objectKey);
        } catch (Exception ignored) {
        }
    }
}
