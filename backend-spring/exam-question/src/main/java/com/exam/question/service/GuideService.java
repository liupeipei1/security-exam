package com.exam.question.service;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.TypeReference;
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
    public ExamGuideEntity getGuide(String examCode) {
        // 首先尝试按exam_code查询
        Optional<ExamGuideEntity> guideOpt = guideRepository.findByExamCode(examCode);
        if (guideOpt.isPresent()) {
            return guideOpt.get();
        }
        return null;
    }

    /**
     * 获取所有考试指南列表
     */
    public List<ExamGuideEntity> getGuideList() {
        return guideRepository.findAll();
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
            // 使用 FastJSON 将 Map 转换为 ExamGuideEntity 对象
            String jsonStr = JSON.toJSONString(updateData);
            guide = JSON.parseObject(jsonStr, new TypeReference<>() {
            });
            guideRepository.save(guide);
            result.put("success", true);
            result.put("message", "更新成功");
        } else {
            result.put("success", false);
            result.put("message", "指南不存在");
        }

        return result;
    }
}