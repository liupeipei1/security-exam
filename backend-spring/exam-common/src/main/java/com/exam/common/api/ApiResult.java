package com.exam.common.api;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Data
public class ApiResult<T> {

    private boolean success;
    private String message;
    private T data;
    private Boolean need_vip;


    public static <T> ApiResult<T> ok(T data) {
        ApiResult<T> r = new ApiResult<>();
        r.success = true;
        r.data = data;
        return r;
    }

    public static <T> ApiResult<T> ok(T data, String message) {
        ApiResult<T> r = ok(data);
        r.message = message;
        return r;
    }

    public static <T> ApiResult<T> okMessage(String message) {
        ApiResult<T> r = new ApiResult<>();
        r.success = true;
        r.message = message;
        return r;
    }

    public static <T> ApiResult<T> fail(String message) {
        ApiResult<T> r = new ApiResult<>();
        r.success = false;
        r.message = message;
        return r;
    }

    public static <T> ApiResult<T> needVip(String message) {
        ApiResult<T> r = new ApiResult<>();
        r.success = false;
        r.message = message;
        r.need_vip = true;
        return r;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public T getData() {
        return data;
    }

    public void setData(T data) {
        this.data = data;
    }

    public Boolean getNeed_vip() {
        return need_vip;
    }

    public void setNeed_vip(Boolean need_vip) {
        this.need_vip = need_vip;
    }
}
