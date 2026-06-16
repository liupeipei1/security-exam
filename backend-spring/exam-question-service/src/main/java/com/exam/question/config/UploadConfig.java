package com.exam.question.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * 文件上传配置- 文件存储到数据库，无需上传路径配置
 */
@Configuration
@ConfigurationProperties(prefix = "upload")
public class UploadConfig {

    private List<String> allowedTypes = List.of(
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel"
    );

    public List<String> getAllowedTypes() {
        return allowedTypes;
    }

    public void setAllowedTypes(List<String> allowedTypes) {
        this.allowedTypes = allowedTypes;
    }

    public boolean isAllowed(String contentType) {
        return allowedTypes.contains(contentType);
    }
}
