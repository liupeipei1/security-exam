package com.exam.common.dto;

public class VipStatusDto {

    private boolean is_vip;
    private String vip_expire;
    private String message;

    public VipStatusDto() {
    }

    public VipStatusDto(boolean is_vip, String vip_expire, String message) {
        this.is_vip = is_vip;
        this.vip_expire = vip_expire;
        this.message = message;
    }

    public boolean isIs_vip() {
        return is_vip;
    }

    public void setIs_vip(boolean is_vip) {
        this.is_vip = is_vip;
    }

    public String getVip_expire() {
        return vip_expire;
    }

    public void setVip_expire(String vip_expire) {
        this.vip_expire = vip_expire;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
