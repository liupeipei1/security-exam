package com.exam.common.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Configuration
public class JwtService {

    public static final String HEADER_OPENID = "X-Openid";
    public static final String CLAIM_OPENID = "openid";

    private final SecretKey key;
    private final long expirationMs;

    public JwtService(
            @Value("${jwt.secret:exam-secret-key-2024}") String secret,
            @Value("${jwt.expiration:86400000}") long expirationMs) {
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            byte[] padded = new byte[32];
            System.arraycopy(bytes, 0, padded, 0, Math.min(bytes.length, 32));
            bytes = padded;
        }
        this.key = Keys.hmacShaKeyFor(bytes);
        this.expirationMs = expirationMs;
    }

    public String generateToken(String openid) {
        Date now = new Date();
        return Jwts.builder()
                .subject(openid)
                .claim(CLAIM_OPENID, openid)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expirationMs))
                .signWith(key)
                .compact();
    }

    public String parseOpenid(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        String openid = claims.get(CLAIM_OPENID, String.class);
        return openid != null ? openid : claims.getSubject();
    }
}
