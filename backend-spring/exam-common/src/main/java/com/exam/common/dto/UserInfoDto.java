package com.exam.common.dto;

public class UserInfoDto {

    private Long id;
    private String openid;
    private Boolean is_vip;
    private String vip_expire;
    private String nickname;
    private String avatar;
    private String token;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getOpenid() {
        return openid;
    }

    public void setOpenid(String openid) {
        this.openid = openid;
    }

    public Boolean getIs_vip() {
        return is_vip;
    }

    public void setIs_vip(Boolean is_vip) {
        this.is_vip = is_vip;
    }

    public String getVip_expire() {
        return vip_expire;
    }

    public void setVip_expire(String vip_expire) {
        this.vip_expire = vip_expire;
    }

    public String getNickname() {
        return nickname;
    }

    public void setNickname(String nickname) {
        this.nickname = nickname;
    }

    public String getAvatar() {
        return avatar;
    }

    public void setAvatar(String avatar) {
        this.avatar = avatar;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }
}
