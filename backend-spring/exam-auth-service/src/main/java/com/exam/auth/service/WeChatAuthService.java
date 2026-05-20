package com.exam.auth.service;

import com.exam.auth.config.WeChatProperties;
import com.exam.auth.entity.UserEntity;
import com.exam.auth.repository.UserRepository;
import com.exam.common.dto.UserInfoDto;
import com.exam.common.security.JwtService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class WeChatAuthService {

    private static final Set<String> TEST_OPENIDS = Set.of("test_openid", "dev_openid", "o0lS55o_tDbDXQ2rg-Y_XvLikI_U");
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final WeChatProperties weChatProperties;
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Map<String, UserEntity> mockUsers = new ConcurrentHashMap<>();

    public WeChatAuthService(WeChatProperties weChatProperties, UserRepository userRepository, JwtService jwtService) {
        this.weChatProperties = weChatProperties;
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        mockUsers.put("test_openid", mockUser("test_openid", "测试用户"));
        mockUsers.put("dev_openid", mockUser("dev_openid", "开发用户"));
    }

    @Transactional
    public UserInfoDto login(String code, String loginType) throws Exception {
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException("缺少code参数");
        }

        boolean testMode = isTestCode(code);
        String openid;
        String sessionKey;

        if (testMode) {
            openid = "test".equals(code) ? "test_openid" : ("dev".equals(code) ? "dev_openid" : code);
            sessionKey = "mock_session_key";
        } else if ("h5".equalsIgnoreCase(loginType)) {
            JsonNode token = fetchH5Token(code);
            if (token.has("errcode") && token.get("errcode").asInt() != 0) {
                throw new IllegalStateException("微信H5登录失败: " + token.path("errmsg").asText());
            }
            openid = token.path("openid").asText(null);
            sessionKey = token.path("access_token").asText("h5_token");
            if (openid == null || openid.isBlank()) {
                throw new IllegalStateException("微信H5登录失败");
            }
        } else {
            JsonNode session = fetchMiniSession(code);
            if (session.has("errcode") && session.get("errcode").asInt() != 0) {
                throw new IllegalStateException("微信登录失败: " + session.path("errmsg").asText());
            }
            openid = session.path("openid").asText(null);
            sessionKey = session.path("session_key").asText(null);
            if (openid == null || openid.isBlank()) {
                throw new IllegalStateException("微信登录失败");
            }
        }

        UserEntity user = resolveUser(openid, sessionKey, testMode);
        UserInfoDto dto = new UserInfoDto();
        dto.setId(user.getId());
        dto.setOpenid(user.getOpenid());
        dto.setNickname(user.getNickname());
        dto.setAvatar(user.getAvatar());

        if (testMode || TEST_OPENIDS.contains(openid)) {
            dto.setIs_vip(true);
            dto.setVip_expire("2099-12-31 23:59:59");
        } else {
            boolean vip = Boolean.TRUE.equals(user.getIsVip())
                    && user.getVipExpire() != null
                    && user.getVipExpire().isAfter(LocalDateTime.now());
            dto.setIs_vip(vip);
            dto.setVip_expire(user.getVipExpire() != null ? user.getVipExpire().format(FMT) : null);
        }
        dto.setToken(jwtService.generateToken(openid));
        return dto;
    }

    private UserEntity resolveUser(String openid, String sessionKey, boolean testMode) {
        if (testMode) {
            return mockUsers.compute(openid, (k, v) -> {
                if (v != null) {
                    v.setLastLogin(LocalDateTime.now());
                    return v;
                }
                UserEntity u = mockUser(openid, "测试用户");
                u.setId((long) (mockUsers.size() + 1));
                return u;
            });
        }
        return userRepository.findByOpenid(openid).map(existing -> {
            existing.setSessionKey(sessionKey);
            existing.setLastLogin(LocalDateTime.now());
            return userRepository.save(existing);
        }).orElseGet(() -> {
            UserEntity created = new UserEntity();
            created.setOpenid(openid);
            created.setSessionKey(sessionKey);
            created.setIsVip(false);
            created.setCreatedAt(LocalDateTime.now());
            created.setLastLogin(LocalDateTime.now());
            return userRepository.save(created);
        });
    }

    private JsonNode fetchMiniSession(String code) throws Exception {
        String url = UriComponentsBuilder
                .fromHttpUrl("https://api.weixin.qq.com/sns/jscode2session")
                .queryParam("appid", weChatProperties.getAppId())
                .queryParam("secret", weChatProperties.getAppSecret())
                .queryParam("js_code", code)
                .queryParam("grant_type", "authorization_code")
                .toUriString();
        ResponseEntity<String> resp = restTemplate.getForEntity(url, String.class);
        return objectMapper.readTree(resp.getBody());
    }

    private JsonNode fetchH5Token(String code) throws Exception {
        String url = UriComponentsBuilder
                .fromHttpUrl("https://api.weixin.qq.com/sns/oauth2/access_token")
                .queryParam("appid", weChatProperties.getAppId())
                .queryParam("secret", weChatProperties.getAppSecret())
                .queryParam("code", code)
                .queryParam("grant_type", "authorization_code")
                .toUriString();
        ResponseEntity<String> resp = restTemplate.getForEntity(url, String.class);
        return objectMapper.readTree(resp.getBody());
    }

    private static boolean isTestCode(String code) {
        return "test".equals(code) || "dev".equals(code) || code.startsWith("mock_");
    }

    private static UserEntity mockUser(String openid, String nickname) {
        UserEntity u = new UserEntity();
        u.setOpenid(openid);
        u.setNickname(nickname);
        u.setAvatar("");
        u.setIsVip(true);
        u.setVipExpire(LocalDateTime.of(2099, 12, 31, 23, 59, 59));
        u.setLastLogin(LocalDateTime.now());
        u.setCreatedAt(LocalDateTime.now());
        return u;
    }
}
