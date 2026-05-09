package com.wechat.tools.common;

/**
 * 业务异常：抛出后由 GlobalExceptionHandler 统一捕获并转成 Result.error。
 * <p>
 * 适用场景：参数校验失败、业务规则不通过、外部调用返回业务错误等。
 * 不要用它来包装系统级异常（IOException、SQLException 等），那些应交由 Exception 兜底。
 */
public class BizException extends RuntimeException {

    private final int code;

    public BizException(String message) {
        this(400, message);
    }

    public BizException(int code, String message) {
        super(message);
        this.code = code;
    }

    public BizException(int code, String message, Throwable cause) {
        super(message, cause);
        this.code = code;
    }

    public int getCode() {
        return code;
    }
}
