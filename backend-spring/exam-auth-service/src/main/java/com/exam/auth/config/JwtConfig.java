package com.exam.auth.config;

import com.exam.common.security.JwtService;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class JwtConfig {

    @Bean
    @ConfigurationProperties(prefix = "exam.jwt")
    public JwtProperties jwtProperties() {
        return new JwtProperties();
    }

    @Bean
    public JwtService jwtService(JwtProperties props) {
        return new JwtService(props.getSecret(), props.getExpirationHours());
    }

    public static class JwtProperties {
        private String secret = "change-me-exam-jwt-secret-key-32bytes-min";
        private long expirationHours = 168;

        public String getSecret() {
            return secret;
        }

        public void setSecret(String secret) {
            this.secret = secret;
        }

        public long getExpirationHours() {
            return expirationHours;
        }

        public void setExpirationHours(long expirationHours) {
            this.expirationHours = expirationHours;
        }
    }
}
