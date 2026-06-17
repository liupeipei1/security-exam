package com.exam.gateway.filter;

import com.exam.common.api.ApiResult;
import com.exam.common.security.JwtService;
import com.exam.gateway.config.JwtGatewayProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.util.List;

@Component
public class JwtAuthGatewayFilterFactory extends AbstractGatewayFilterFactory<Object> {

    private static final List<String> PUBLIC_PATHS = List.of(
            "/api/auth/login",
            "/api/auth/qrcode",
            "/api/auth/qrcode/callback",
            "/api/auth/qrcode/check",
          //  "/api/banks",
          //  "/api/banks/**",
            "/api/questions/types",
            "/api/questions/count",
            "/api/user/pay/notify",
            "/api/knowledge",
            "/api/knowledge/**",
            "/api/guide",
            "/api/guide/**"
    );

    private static final List<String> VIP_PATH_PREFIXES = List.of(
            "/api/questions/**",
            "/api/exams/**",
            "/api/question"
    );

    private final JwtService jwtService;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final AntPathMatcher matcher = new AntPathMatcher();

    public JwtAuthGatewayFilterFactory(JwtGatewayProperties properties) {
        super(Object.class);
        this.jwtService = new JwtService(properties.getSecret(), properties.getExpirationHours());
    }

    @Override
    public GatewayFilter apply(Object config) {
        return (exchange, chain) -> {
            String path = exchange.getRequest().getURI().getPath();
            if (isPublic(path)) {
                return chain.filter(exchange);
            }
            if (!requiresVip(path)) {
                return chain.filter(exchange);
            }

            String openid = resolveOpenid(exchange);
            if (openid == null || openid.isBlank()) {
                return unauthorized(exchange, "请先登录");
            }

            ServerWebExchange mutated = exchange.mutate()
                    .request(r -> r.header(JwtService.HEADER_OPENID, openid))
                    .build();
            return chain.filter(mutated);
        };
    }

    private String resolveOpenid(ServerWebExchange exchange) {
        String auth = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (auth != null && auth.startsWith("Bearer ")) {
            try {
                return jwtService.parseOpenid(auth.substring(7).trim());
            } catch (Exception ignored) {
                return null;
            }
        }
        return exchange.getRequest().getQueryParams().getFirst("openid");
    }

    private boolean isPublic(String path) {
        return PUBLIC_PATHS.stream().anyMatch(p -> matcher.match(p, path));
    }

    private boolean requiresVip(String path) {
        if (path.startsWith("/api/user/vip-status")
                || path.startsWith("/api/user/buy-vip")
                || path.startsWith("/api/user/pay/")
                || path.startsWith("/api/user/update")) {
            return false;
        }
        return VIP_PATH_PREFIXES.stream().anyMatch(path::startsWith);
    }

    private Mono<Void> unauthorized(ServerWebExchange exchange, String message) {
        exchange.getResponse().setStatusCode(HttpStatus.FORBIDDEN);
        exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
        try {
            byte[] body = objectMapper.writeValueAsBytes(ApiResult.needVip(message));
            return exchange.getResponse().writeWith(Mono.just(exchange.getResponse()
                    .bufferFactory()
                    .wrap(body)));
        } catch (Exception e) {
            byte[] body = ("{\"success\":false,\"message\":\"" + message + "\"}")
                    .getBytes(StandardCharsets.UTF_8);
            return exchange.getResponse().writeWith(Mono.just(exchange.getResponse()
                    .bufferFactory()
                    .wrap(body)));
        }
    }
}
