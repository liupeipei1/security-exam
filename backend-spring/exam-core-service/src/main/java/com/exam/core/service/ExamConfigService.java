package com.exam.core.service;

import com.exam.common.entity.ExamConfigEntity;
import com.exam.common.repository.ExamConfigRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class ExamConfigService {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Autowired
    private  ExamConfigRepository configRepository;


    /**
     * 获取所有考试配置
     */
    public List<Map<String, Object>> getAllExams() {
        List<ExamConfigEntity> configs = configRepository.findAllByOrderBySortOrderAsc();
        return configs.stream().map(this::toConfigMap).toList();
    }

    /**
     * 根据考试代码获取考试配置
     */
    public Map<String, Object> getExamByCode(String examCode) {
        Optional<ExamConfigEntity> config = configRepository.findByExamCode(examCode);
        return config.map(this::toConfigMap).orElse(null);
    }

    /**
     * 新增考试配置
     */
    @Transactional
    public Map<String, Object> createExam(Map<String, Object> data) {
        String examCode = (String) data.get("exam_code");
        String examName = (String) data.get("exam_name");
        String tableName = (String) data.get("table_name");

        if (examCode == null || examCode.isBlank() || examName == null || examName.isBlank() || 
            tableName == null || tableName.isBlank()) {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", false);
            result.put("message", "缺少必填字段：exam_code、exam_name、table_name");
            return result;
        }

        if (configRepository.existsByExamCode(examCode)) {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", false);
            result.put("message", "考试代码已存在");
            return result;
        }

        ExamConfigEntity config = new ExamConfigEntity();
        config.setExamCode(examCode);
        config.setExamName(examName);
        config.setExamDescription((String) data.get("exam_description"));
        config.setExamDescDetail((String) data.get("exam_desc_detail"));
        config.setDescription((String) data.get("description"));
        config.setIcon((String) data.get("icon"));
        config.setTableName(tableName);
        config.setTotalQuestions(getIntValue(data, "total_questions", 0));
        config.setJudgmentCount(getIntValue(data, "judgment_count", 0));
        config.setSingleCount(getIntValue(data, "single_count", 0));
        config.setMultipleCount(getIntValue(data, "multiple_count", 0));
        config.setEnabled((Boolean) data.get("enabled"));
        config.setSortOrder(getIntValue(data, "sort_order", 0));

        ExamConfigEntity saved = configRepository.save(config);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        result.put("message", "考试配置添加成功");
        result.put("data", toConfigMap(saved));
        return result;
    }

    /**
     * 更新考试配置
     */
    @Transactional
    public Map<String, Object> updateExam(String examCode, Map<String, Object> data) {
        Optional<ExamConfigEntity> optional = configRepository.findByExamCode(examCode);
        
        if (optional.isEmpty()) {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", false);
            result.put("message", "考试不存在");
            return result;
        }

        ExamConfigEntity config = optional.get();

        if (data.containsKey("exam_name")) {
            config.setExamName((String) data.get("exam_name"));
        }
        if (data.containsKey("exam_description")) {
            config.setExamDescription((String) data.get("exam_description"));
        }
        if (data.containsKey("exam_desc_detail")) {
            config.setExamDescDetail((String) data.get("exam_desc_detail"));
        }
        if (data.containsKey("description")) {
            config.setDescription((String) data.get("description"));
        }
        if (data.containsKey("icon")) {
            config.setIcon((String) data.get("icon"));
        }
        if (data.containsKey("table_name")) {
            config.setTableName((String) data.get("table_name"));
        }
        if (data.containsKey("total_questions")) {
            config.setTotalQuestions(getIntValue(data, "total_questions", 0));
        }
        if (data.containsKey("judgment_count")) {
            config.setJudgmentCount(getIntValue(data, "judgment_count", 0));
        }
        if (data.containsKey("single_count")) {
            config.setSingleCount(getIntValue(data, "single_count", 0));
        }
        if (data.containsKey("multiple_count")) {
            config.setMultipleCount(getIntValue(data, "multiple_count", 0));
        }
        if (data.containsKey("enabled")) {
            config.setEnabled((Boolean) data.get("enabled"));
        }
        if (data.containsKey("sort_order")) {
            config.setSortOrder(getIntValue(data, "sort_order", 0));
        }

        ExamConfigEntity saved = configRepository.save(config);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        result.put("message", "考试配置更新成功");
        result.put("data", toConfigMap(saved));
        return result;
    }

    /**
     * 删除考试配置
     */
    @Transactional
    public Map<String, Object> deleteExam(String examCode) {
        if (!configRepository.existsByExamCode(examCode)) {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", false);
            result.put("message", "考试配置不存在");
            return result;
        }

        configRepository.deleteById(examCode);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        result.put("message", "考试配置删除成功");
        return result;
    }

    private Map<String, Object> toConfigMap(ExamConfigEntity config) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("exam_code", config.getExamCode());
        map.put("exam_name", config.getExamName());
        map.put("exam_description", config.getExamDescription());
        map.put("exam_desc_detail", config.getExamDescDetail());
        map.put("description", config.getDescription());
        map.put("icon", config.getIcon());
        map.put("table_name", config.getTableName());
        map.put("total_questions", config.getTotalQuestions());
        map.put("judgment_count", config.getJudgmentCount());
        map.put("single_count", config.getSingleCount());
        map.put("multiple_count", config.getMultipleCount());
        map.put("enabled", config.getEnabled());
        map.put("sort_order", config.getSortOrder());
        return map;
    }

    private Integer getIntValue(Map<String, Object> data, String key, Integer defaultValue) {
        Object value = data.get(key);
        if (value == null) {
            return defaultValue;
        }
        if (value instanceof Integer) {
            return (Integer) value;
        }
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        return defaultValue;
    }
}