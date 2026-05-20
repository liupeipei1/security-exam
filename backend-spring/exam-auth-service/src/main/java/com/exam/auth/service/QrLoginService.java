package com.exam.auth.service;

import com.exam.auth.config.WeChatProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class QrLoginService {

    private static final Duration QR_TTL = Duration.ofMinutes(5);
    private static final String KEY_PREFIX = "exam:qr:";

    private final WeChatProperties weChatProperties;
    private final StringRedisTemplate redisTemplate;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public QrLoginService(WeChatProperties weChatProperties, StringRedisTemplate redisTemplate) {
        this.weChatProperties = weChatProperties;
        this.redisTemplate = redisTemplate;
    }

    public Map<String, String> createQrTicket() {
        String ticket = "qr_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8);
        String redirect = URLEncoder.encode(weChatProperties.getQrRedirectUri(), StandardCharsets.UTF_8);
        String qrcodeUrl = "https://open.weixin.qq.com/connect/qrconnect?appid="
                + weChatProperties.getAppId()
                + "&redirect_uri=" + redirect
                + "&response_type=code&scope=snsapi_login&state=" + ticket
                + "#wechat_redirect";

        Map<String, String> state = new HashMap<>();
        state.put("status", "waiting");
        redisTemplate.opsForValue().set(KEY_PREFIX + ticket, toJson(state), QR_TTL);

        Map<String, String> result = new HashMap<>();
        result.put("ticket", ticket);
        result.put("qrcode", qrcodeUrl);
        return result;
    }

    public String handleCallback(String code, String ticket) {
        try {
            String url = UriComponentsBuilder
                    .fromHttpUrl("https://api.weixin.qq.com/sns/oauth2/access_token")
                    .queryParam("appid", weChatProperties.getAppId())
                    .queryParam("secret", weChatProperties.getAppSecret())
                    .queryParam("code", code)
                    .queryParam("grant_type", "authorization_code")
                    .toUriString();
            ResponseEntity<String> resp = restTemplate.getForEntity(url, String.class);
            JsonNode node = objectMapper.readTree(resp.getBody());
            if (node.has("errcode") && node.get("errcode").asInt() != 0) {
                return errorHtml("授权失败");
            }
            Map<String, String> state = new HashMap<>();
            state.put("status", "confirmed");
            state.put("code", code);
            state.put("openid", node.path("openid").asText(""));
            redisTemplate.opsForValue().set(KEY_PREFIX + ticket, toJson(state), QR_TTL);
            return successHtml();
        } catch (Exception e) {
            return errorHtml("登录失败");
        }
    }

    public Map<String, String> checkTicket(String ticket) {
        String json = redisTemplate.opsForValue().get(KEY_PREFIX + ticket);
        if (json == null) {
            return Map.of("status", "expired");
        }
        try {
            JsonNode node = objectMapper.readTree(json);
            String status = node.path("status").asText("expired");
            Map<String, String> result = new HashMap<>();
            result.put("status", status);
            if ("confirmed".equals(status)) {
                result.put("code", node.path("code").asText(null));
            }
            return result;
        } catch (Exception e) {
            return Map.of("status", "expired");
        }
    }

    private String toJson(Map<String, String> map) {
        try {
            return objectMapper.writeValueAsString(map);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private static String successHtml() {
        return "<script>alert('登录成功'); window.close();</script>";
    }

    private static String errorHtml(String msg) {
        return "<script>alert('" + msg + "'); window.close();</script>";
    }
}
