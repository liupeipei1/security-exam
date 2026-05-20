package com.exam.common.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

public class JwtService {

    public static final String HEADER_OPENID = "X-Openid";
    public static final String CLAIM_OPENID = "openid";

    private final SecretKey key;
    private final long expirationMs;

    public JwtService(String secret, long expirationHours) {
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            byte[] padded = new byte[32];
            System.arraycopy(bytes, 0, padded, 0, Math.min(bytes.length, 32));
            bytes = padded;
        }
        this.key = Keys.hmacShaKeyFor(bytes);
        this.expirationMs = expirationHours * 3600_000L;
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
