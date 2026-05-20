package com.exam.question.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class ExamCacheService {

    private static final Duration RECORD_TTL = Duration.ofDays(7);
    private static final Duration PROGRESS_TTL = Duration.ofDays(30);
    private static final Duration SESSION_TTL = Duration.ofDays(1);

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ExamCacheService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public List<Map<String, Object>> getRecords(String openid) throws Exception {
        String json = redisTemplate.opsForValue().get("exam:record:" + openid);
        if (json == null) {
            return List.of();
        }
        return objectMapper.readValue(json, new TypeReference<>() {});
    }

    public boolean saveRecord(String openid, Map<String, Object> record) throws Exception {
        List<Map<String, Object>> records = new ArrayList<>(getRecords(openid));
        record.put("createdAt", java.time.Instant.now().toString());
        records.add(0, record);
        if (records.size() > 100) {
            records = records.subList(0, 100);
        }
        redisTemplate.opsForValue().set(
                "exam:record:" + openid,
                objectMapper.writeValueAsString(records),
                RECORD_TTL
        );
        return true;
    }

    public boolean deleteRecords(String openid) {
        return Boolean.TRUE.equals(redisTemplate.delete("exam:record:" + openid));
    }

    public Map<String, Object> getProgress(String openid, String bankCode) throws Exception {
        String json = redisTemplate.opsForValue().get(progressKey(openid, bankCode));
        if (json == null) {
            return null;
        }
        return objectMapper.readValue(json, new TypeReference<>() {});
    }

    public boolean saveProgress(String openid, String bankCode, Map<String, Object> progress) throws Exception {
        progress.put("updatedAt", java.time.Instant.now().toString());
        redisTemplate.opsForValue().set(
                progressKey(openid, bankCode),
                objectMapper.writeValueAsString(progress),
                PROGRESS_TTL
        );
        return true;
    }

    public Map<String, Object> getSession(String openid) throws Exception {
        String json = redisTemplate.opsForValue().get("exam:session:" + openid);
        if (json == null) {
            return null;
        }
        return objectMapper.readValue(json, new TypeReference<>() {});
    }

    public boolean saveSession(String openid, Map<String, Object> session) throws Exception {
        session.put("createdAt", java.time.Instant.now().toString());
        redisTemplate.opsForValue().set(
                "exam:session:" + openid,
                objectMapper.writeValueAsString(session),
                SESSION_TTL
        );
        return true;
    }

    public boolean deleteSession(String openid) {
        return Boolean.TRUE.equals(redisTemplate.delete("exam:session:" + openid));
    }

    private static String progressKey(String openid, String bankCode) {
        return "exam:progress:" + openid + ":" + (bankCode == null ? "default" : bankCode);
    }
}
