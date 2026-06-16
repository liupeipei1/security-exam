package com.exam.account.auth.service;
import com.exam.account.auth.config.WeChatProperties;
import com.exam.account.auth.entity.UserEntity;
import com.exam.account.auth.repository.UserRepository;
import com.exam.common.dto.UserInfoDto;
import com.exam.common.security.JwtService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class QrLoginService {

    private static final Duration QR_TTL = Duration.ofMinutes(5);
    private static final String KEY_PREFIX = "exam:qr:";
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Autowired
    private final WeChatProperties weChatProperties;
    @Autowired
    private final StringRedisTemplate redisTemplate;
    @Autowired
    private final UserRepository userRepository;
    @Autowired
    private final JwtService jwtService;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public QrLoginService(WeChatProperties weChatProperties, StringRedisTemplate redisTemplate,
                          UserRepository userRepository, JwtService jwtService) {
        this.weChatProperties = weChatProperties;
        this.redisTemplate = redisTemplate;
        this.userRepository = userRepository;
        this.jwtService = jwtService;
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

    @Transactional
    public UserInfoDto qrLogin(String code) throws Exception {
        // 获取access_token
        String tokenUrl = UriComponentsBuilder
                .fromHttpUrl("https://api.weixin.qq.com/sns/oauth2/access_token")
                .queryParam("appid", weChatProperties.getAppId())
                .queryParam("secret", weChatProperties.getAppSecret())
                .queryParam("code", code)
                .queryParam("grant_type", "authorization_code")
                .toUriString();
        
        ResponseEntity<String> tokenResp = restTemplate.getForEntity(tokenUrl, String.class);
        JsonNode tokenNode = objectMapper.readTree(tokenResp.getBody());
        
        if (tokenNode.has("errcode") && tokenNode.get("errcode").asInt() != 0) {
            throw new IllegalStateException("获取access_token失败: " + tokenNode.path("errmsg").asText());
        }
        
        String accessToken = tokenNode.path("access_token").asText();
        String openid = tokenNode.path("openid").asText();
        
        // 获取用户信息
        String userInfoUrl = UriComponentsBuilder
                .fromHttpUrl("https://api.weixin.qq.com/sns/userinfo")
                .queryParam("access_token", accessToken)
                .queryParam("openid", openid)
                .queryParam("lang", "zh_CN")
                .toUriString();
        
        ResponseEntity<String> userResp = restTemplate.getForEntity(userInfoUrl, String.class);
        JsonNode userNode = objectMapper.readTree(userResp.getBody());
        
        if (userNode.has("errcode") && userNode.get("errcode").asInt() != 0) {
            throw new IllegalStateException("获取用户信息失败: " + userNode.path("errmsg").asText());
        }
        
        // 获取或创建用
           UserEntity user = userRepository.findByOpenid(openid).map(existing -> {
            existing.setNickname(userNode.path("nickname").asText(existing.getNickname()));
            existing.setAvatar(userNode.path("headimgurl").asText(existing.getAvatar()));
            existing.setLastLogin(LocalDateTime.now());
            return userRepository.save(existing);
        }).orElseGet(() -> {
            UserEntity created = new UserEntity();
            created.setOpenid(openid);
            created.setNickname(userNode.path("nickname").asText(""));
            created.setAvatar(userNode.path("headimgurl").asText(""));
            created.setIsVip(false);
            created.setCreatedAt(LocalDateTime.now());
            created.setLastLogin(LocalDateTime.now());
            return userRepository.save(created);
        });
        
        // 构建返回结果
        UserInfoDto dto = new UserInfoDto();
        dto.setId(user.getId());
        dto.setOpenid(user.getOpenid());
        dto.setNickname(user.getNickname());
        dto.setAvatar(user.getAvatar());
        
        boolean vip = Boolean.TRUE.equals(user.getIsVip())
                && user.getVipExpire() != null
                && user.getVipExpire().isAfter(LocalDateTime.now());
        dto.setIs_vip(vip);
        dto.setVip_expire(user.getVipExpire() != null ? user.getVipExpire().format(FMT) : null);
        dto.setToken(jwtService.generateToken(openid));
        
        return dto;
    }

    private static String successHtml() {
        return "<script>alert('登录成功'); window.close();</script>";
    }

    private static String errorHtml(String msg) {
        return "<script>alert('" + msg + "'); window.close();</script>";
    }
}
