package com.exam.question.service;

import com.exam.question.entity.ExamGuideEntity;
import com.exam.question.repository.GuideRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 考试指南服务类
 * 处理考试指南相关的业务逻辑
 */
@Service
public class GuideService {

    @Autowired
    private GuideRepository guideRepository;

    /**
     * 根据考试代码获取指南详情
     * 支持别名查询
     */
    public Map<String, Object> getGuide(String examCode) {
        Map<String, Object> result = new HashMap<>();

        // 首先尝试按exam_code查询
        Optional<ExamGuideEntity> guideOpt = guideRepository.findByExamCode(examCode);

        // 如果没找到，尝试按别名查询
        if (guideOpt.isEmpty()) {
            guideOpt = guideRepository.findByAlias(examCode);
        }

        if (guideOpt.isPresent()) {
            ExamGuideEntity guide = guideOpt.get();
            result.put("success", true);
            result.put("guide", convertToGuideMap(guide));
        } else {
            // 如果数据库中没有，返回默认指南
            result.put("success", true);
            result.put("guide", getDefaultGuide(examCode));
        }

        return result;
    }

    /**
     * 获取所有考试指南列表
     */
    public Map<String, Object> getGuideList() {
        Map<String, Object> result = new HashMap<>();
        List<ExamGuideEntity> guides = guideRepository.findAll();
        
        List<Map<String, Object>> guideList = guides.stream()
                .map(this::convertToListMap)
                .toList();
        
        result.put("success", true);
        result.put("guides", guideList);
        return result;
    }

    /**
     * 更新考试指南
     */
    @Transactional
    public Map<String, Object> updateGuide(String examCode, Map<String, Object> updateData) {
        Map<String, Object> result = new HashMap<>();

        Optional<ExamGuideEntity> guideOpt = guideRepository.findByExamCode(examCode);

        if (guideOpt.isPresent()) {
            ExamGuideEntity guide = guideOpt.get();

            // 更新字段
            if (updateData.containsKey("exam_name")) {
                guide.setExamName((String) updateData.get("exam_name"));
            }
            if (updateData.containsKey("description")) {
                guide.setDescription((String) updateData.get("description"));
            }
            if (updateData.containsKey("outline")) {
                guide.setOutline((String) updateData.get("outline"));
            }
            if (updateData.containsKey("question_types")) {
                guide.setQuestionTypes((String) updateData.get("question_types"));
            }
            if (updateData.containsKey("suggestions")) {
                guide.setSuggestions((String) updateData.get("suggestions"));
            }
            if (updateData.containsKey("alias")) {
                guide.setAlias((String) updateData.get("alias"));
            }

            guideRepository.save(guide);
            result.put("success", true);
            result.put("message", "更新成功");
        } else {
            result.put("success", false);
            result.put("message", "指南不存在");
        }

        return result;
    }

    /**
     * 将实体转换为指南详情Map
     */
    private Map<String, Object> convertToGuideMap(ExamGuideEntity guide) {
        Map<String, Object> guideMap = new HashMap<>();
        guideMap.put("exam_code", guide.getExamCode());
        guideMap.put("exam_name", guide.getExamName());
        guideMap.put("description", guide.getDescription());
        guideMap.put("outline", guide.getOutline());
        guideMap.put("question_types", guide.getQuestionTypes());
        guideMap.put("suggestions", guide.getSuggestions());
        guideMap.put("alias", guide.getAlias());
        guideMap.put("created_at", guide.getCreatedAt());
        guideMap.put("updated_at", guide.getUpdatedAt());
        return guideMap;
    }

    /**
     * 将实体转换为列表项Map
     */
    private Map<String, Object> convertToListMap(ExamGuideEntity guide) {
        Map<String, Object> guideMap = new HashMap<>();
        guideMap.put("exam_code", guide.getExamCode());
        guideMap.put("exam_name", guide.getExamName());
        guideMap.put("alias", guide.getAlias());
        return guideMap;
    }

    /**
     * 获取默认指南（当数据库中找不到时使用）
     */
    private Map<String, Object> getDefaultGuide(String examCode) {
        Map<String, Object> guide = new HashMap<>();
        guide.put("exam_code", examCode);
        guide.put("exam_name", "考试指南");
        guide.put("description", "暂无详细描述");
        guide.put("outline", "[]");
        guide.put("question_types", "{}");
        guide.put("suggestions", "暂无备考建议");
        guide.put("alias", null);
        return guide;
    }
}