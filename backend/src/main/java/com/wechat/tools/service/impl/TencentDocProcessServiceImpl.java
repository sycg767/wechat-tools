package com.wechat.tools.service.impl;

import com.qcloud.cos.COSClient;
import com.qcloud.cos.ClientConfig;
import com.qcloud.cos.auth.BasicCOSCredentials;
import com.qcloud.cos.auth.COSCredentials;
import com.qcloud.cos.model.ciModel.common.MediaOutputObject;
import com.qcloud.cos.model.ciModel.job.DocJobDetail;
import com.qcloud.cos.model.ciModel.job.DocJobObject;
import com.qcloud.cos.model.ciModel.job.DocJobRequest;
import com.qcloud.cos.model.ciModel.job.DocJobResponse;
import com.qcloud.cos.model.ciModel.job.DocProcessObject;
import com.qcloud.cos.region.Region;
import com.wechat.tools.config.TencentCiProperties;
import com.wechat.tools.config.TencentCosProperties;
import com.wechat.tools.service.TencentDocProcessService;
import org.springframework.stereotype.Service;

@Service
public class TencentDocProcessServiceImpl implements TencentDocProcessService {

    private final TencentCosProperties cosProperties;
    private final TencentCiProperties ciProperties;

    public TencentDocProcessServiceImpl(TencentCosProperties cosProperties, TencentCiProperties ciProperties) {
        this.cosProperties = cosProperties;
        this.ciProperties = ciProperties;
    }

    @Override
    public String submitWordToPdf(String sourceObjectKey, String sourceExtension, String outputObjectKey) {
        COSClient client = createClient();
        try {
            DocJobRequest request = new DocJobRequest();
            request.setBucketName(cosProperties.getBucket());

            DocJobObject docJobObject = request.getDocJobObject();
            docJobObject.setTag("DocProcess");
            docJobObject.getInput().setObject(sourceObjectKey);
            if (ciProperties.getQueueId() != null && !ciProperties.getQueueId().isBlank()) {
                docJobObject.setQueueId(ciProperties.getQueueId());
            }

            DocProcessObject docProcessObject = docJobObject.getOperation().getDocProcessObject();
            docProcessObject.setSrcType(normalizeExtension(sourceExtension));
            docProcessObject.setTgtType("pdf");

            MediaOutputObject output = docJobObject.getOperation().getOutput();
            output.setRegion(cosProperties.getRegion());
            output.setBucket(cosProperties.getBucket());
            output.setObject(outputObjectKey);

            DocJobResponse response = client.createDocProcessJobs(request);
            DocJobDetail detail = response.getJobsDetail();
            if (detail == null || detail.getJobId() == null || detail.getJobId().isBlank()) {
                throw new IllegalStateException("腾讯云 CI 未返回有效任务 ID");
            }
            return detail.getJobId();
        } catch (Exception e) {
            throw new RuntimeException("提交腾讯云文档转码任务失败: " + e.getMessage(), e);
        } finally {
            client.shutdown();
        }
    }

    @Override
    public DocProcessResult waitForCompletion(String jobId, String expectedOutputObjectKey) throws InterruptedException {
        long deadline = System.currentTimeMillis() + ciProperties.getTimeoutSeconds() * 1000;
        while (System.currentTimeMillis() < deadline) {
            DocProcessResult result = queryJob(jobId, expectedOutputObjectKey);
            if (isFinished(result.state())) {
                return result;
            }
            Thread.sleep(ciProperties.getPollIntervalMillis());
        }
        return new DocProcessResult(jobId, expectedOutputObjectKey, "TIMEOUT", "腾讯云转码超时");
    }

    private DocProcessResult queryJob(String jobId, String expectedOutputObjectKey) {
        COSClient client = createClient();
        try {
            DocJobRequest request = new DocJobRequest();
            request.setBucketName(cosProperties.getBucket());
            request.setJobId(jobId);

            DocJobResponse response = client.describeDocProcessJob(request);
            DocJobDetail detail = response.getJobsDetail();
            if (detail == null) {
                throw new IllegalStateException("腾讯云 CI 未返回任务详情");
            }

            String state = safeUpper(detail.getState());
            String message = detail.getMessage();
            String outputObjectKey = expectedOutputObjectKey;
            if (detail.getOperation() != null && detail.getOperation().getOutput() != null && detail.getOperation().getOutput().getObject() != null && !detail.getOperation().getOutput().getObject().isBlank()) {
                outputObjectKey = detail.getOperation().getOutput().getObject();
            }
            return new DocProcessResult(jobId, outputObjectKey, state, message);
        } catch (Exception e) {
            throw new RuntimeException("查询腾讯云文档转码任务失败: " + e.getMessage(), e);
        } finally {
            client.shutdown();
        }
    }

    private COSClient createClient() {
        validateConfig();
        COSCredentials credentials = new BasicCOSCredentials(cosProperties.getSecretId(), cosProperties.getSecretKey());
        ClientConfig clientConfig = new ClientConfig(new Region(cosProperties.getRegion()));
        return new COSClient(credentials, clientConfig);
    }

    private void validateConfig() {
        if (isBlank(cosProperties.getSecretId()) || isBlank(cosProperties.getSecretKey()) || isBlank(cosProperties.getRegion()) || isBlank(cosProperties.getBucket())) {
            throw new IllegalStateException("腾讯云 COS 配置不完整，请检查 TENCENT_COS_SECRET_ID/TENCENT_COS_SECRET_KEY/TENCENT_COS_REGION/TENCENT_COS_BUCKET");
        }
        if (isBlank(ciProperties.getQueueId())) {
            throw new IllegalStateException("腾讯云 CI 队列未配置，请检查 TENCENT_CI_QUEUE_ID");
        }
    }

    private boolean isFinished(String state) {
        return "SUCCESS".equals(state) || "FAILED".equals(state) || "FAIL".equals(state) || "TIMEOUT".equals(state) || "PAUSE".equals(state) || "CANCEL".equals(state);
    }

    private String normalizeExtension(String extension) {
        if (extension == null || extension.isBlank()) {
            return "docx";
        }
        return extension.replace(".", "").toLowerCase();
    }

    private String safeUpper(String value) {
        return value == null ? "UNKNOWN" : value.toUpperCase();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
