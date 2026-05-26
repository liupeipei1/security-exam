package com.exam.exam.service;

import com.exam.exam.entity.ExamRecordEntity;
import com.exam.exam.repository.ExamRecordRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class ExamService {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final Duration SESSION_TTL = Duration.ofHours(24);
    private static final String SESSION_PREFIX = "exam:session:";
    private static final String PROGRESS_PREFIX = "exam:progress:";

    private final ExamRecordRepository recordRepository;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public ExamService(ExamRecordRepository recordRepository, StringRedisTemplate redisTemplate) {
        this.recordRepository = recordRepository;
        this.redisTemplate = redisTemplate;
        this.objectMapper = new ObjectMapper();
    }

    /**
     * 获取考试记录列表
     */
    public List<Map<String, Object>> getExamHistory(String openid) {
        List<ExamRecordEntity> records = recordRepository.findByOpenidOrderByCreatedAtDesc(openid);
        return records.stream().map(this::toRecordMap).toList();
    }

    /**
     * 获取考试记录详情
     */
    public Map<String, Object> getExamDetail(String openid, Long recordId) {
        return recordRepository.findById(recordId)
                .filter(r -> r.getOpenid().equals(openid))
                .map(this::toRecordMap)
                .orElse(null);
    }

    /**
     * 保存考试记录
     */
    @Transactional
    public Map<String, Object> saveExamRecord(String openid, Map<String, Object> data) {
        ExamRecordEntity record = new ExamRecordEntity();
        record.setOpenid(openid);
        record.setBankCode((String) data.get("bank_code"));
        record.setQuestionIds((String) data.get("question_ids"));
        record.setUserAnswers((String) data.get("user_answers"));
        record.setCorrectAnswers((String) data.get("correct_answers"));
        record.setScore((Integer) data.get("score"));
        record.setTotalCount((Integer) data.get("total_count"));
        record.setCorrectCount((Integer) data.get("correct_count"));
        
        String startTimeStr = (String) data.get("start_time");
        if (startTimeStr != null) {
            record.setStartTime(LocalDateTime.parse(startTimeStr, FMT));
        }
        
        String endTimeStr = (String) data.get("end_time");
        if (endTimeStr != null) {
            record.setEndTime(LocalDateTime.parse(endTimeStr, FMT));
        }
        
        record.setDuration((Integer) data.get("duration"));
        
        ExamRecordEntity saved = recordRepository.save(record);
        return toRecordMap(saved);
    }

    /**
     * 删除考试记录
     */
    @Transactional
    public boolean deleteExamRecord(String openid, Long recordId) {
        return recordRepository.findById(recordId)
                .filter(r -> r.getOpenid().equals(openid))
                .map(record -> {
                    recordRepository.delete(record);
                    return true;
                })
                .orElse(false);
    }

    /**
     * 保存考试进度到缓存
     */
    public void saveProgress(String sessionId, Map<String, Object> progress) {
        try {
            String json = objectMapper.writeValueAsString(progress);
            redisTemplate.opsForValue().set(PROGRESS_PREFIX + sessionId, json, SESSION_TTL);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("保存进度失败", e);
        }
    }

    /**
     * 获取考试进度
     */
    public Map<String, Object> getProgress(String sessionId) {
        String json = redisTemplate.opsForValue().get(PROGRESS_PREFIX + sessionId);
        if (json == null) {
            return null;
        }
        try {
            return objectMapper.readValue(json, Map.class);
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    /**
     * 删除考试进度
     */
    public void deleteProgress(String sessionId) {
        redisTemplate.delete(PROGRESS_PREFIX + sessionId);
    }

    /**
     * 保存考试会话到缓存
     */
    public void saveSession(String sessionId, Map<String, Object> sessionData) {
        try {
            String json = objectMapper.writeValueAsString(sessionData);
            redisTemplate.opsForValue().set(SESSION_PREFIX + sessionId, json, SESSION_TTL);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("保存会话失败", e);
        }
    }

    /**
     * 获取考试会话
     */
    public Map<String, Object> getSession(String sessionId) {
        String json = redisTemplate.opsForValue().get(SESSION_PREFIX + sessionId);
        if (json == null) {
            return null;
        }
        try {
            return objectMapper.readValue(json, Map.class);
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    /**
     * 删除考试会话
     */
    public void deleteSession(String sessionId) {
        redisTemplate.delete(SESSION_PREFIX + sessionId);
    }

    /**
     * 清理所有会话（管理接口）
     */
    public long clearAllSessions() {
        Set<String> keys = redisTemplate.keys(SESSION_PREFIX + "*");
        if (keys == null || keys.isEmpty()) {
            return 0;
        }
        redisTemplate.delete(keys);
        return keys.size();
    }

    /**
     * 获取会话数量（管理接口）
     */
    public long getSessionCount() {
        Set<String> keys = redisTemplate.keys(SESSION_PREFIX + "*");
        return keys != null ? keys.size() : 0;
    }

    private Map<String, Object> toRecordMap(ExamRecordEntity record) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", record.getId());
        map.put("openid", record.getOpenid());
        map.put("bank_code", record.getBankCode());
        map.put("question_ids", record.getQuestionIds());
        map.put("user_answers", record.getUserAnswers());
        map.put("correct_answers", record.getCorrectAnswers());
        map.put("score", record.getScore());
        map.put("total_count", record.getTotalCount());
        map.put("correct_count", record.getCorrectCount());
        map.put("start_time", record.getStartTime() != null ? record.getStartTime().format(FMT) : null);
        map.put("end_time", record.getEndTime() != null ? record.getEndTime().format(FMT) : null);
        map.put("duration", record.getDuration());
        map.put("created_at", record.getCreatedAt() != null ? record.getCreatedAt().format(FMT) : null);
        return map;
    }
}