package com.exam.auth.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "exam.wechat")
public class WeChatProperties {

    private String appId;
    private String appSecret;
    private String qrRedirectUri;

    public String getAppId() {
        return appId;
    }

    public void setAppId(String appId) {
        this.appId = appId;
    }

    public String getAppSecret() {
        return appSecret;
    }

    public void setAppSecret(String appSecret) {
        this.appSecret = appSecret;
    }

    public String getQrRedirectUri() {
        return qrRedirectUri;
    }

    public void setQrRedirectUri(String qrRedirectUri) {
        this.qrRedirectUri = qrRedirectUri;
    }
}
