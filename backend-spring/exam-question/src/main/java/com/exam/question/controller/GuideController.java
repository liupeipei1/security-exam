package com.exam.question.controller;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.TypeReference;
import com.exam.question.entity.ExamGuideEntity;
import com.exam.question.service.GuideService;
import com.exam.common.api.ApiResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 考试指南控制器
 */
@Slf4j
@RestController
@RequestMapping("/api/guide")
@Tag(name = "考试指南", description = "考试指南相关接口")
public class GuideController {

    @Autowired
    private  GuideService guideService;

    /**
     * 获取考试指南
     * GET /api/guide
     */
    @Operation(
        summary = "获取考试指南",
        description = "根据考试代码获取对应的考试指南信息，包括考试概述、考试内容、题型分布、备考建议等"
    )
    @GetMapping("")
    public ApiResult<?> getGuide(
            @Parameter(description = "考试代码", example = "banking_law")
            @RequestParam(value = "exam_code", required = false) String examCode) {
        log.info("========== /api/guide 接口被调用 =========="+examCode );

        if (examCode == null || examCode.isEmpty()) {
            return ApiResult.fail("缺少必要参数 exam_code");
        }
        ExamGuideEntity result = guideService.getGuide(examCode);
        
        if (result != null) {
            // 将字符串字段解析为 JSON 对象
            Map<String, Object> guideMap = convertGuideToMap(result);
            return ApiResult.ok(guideMap);
        }
        
        return ApiResult.ok(result);
    }
    
    /**
     * 将 ExamGuideEntity 转换为 Map，并解析 JSON 字符串字段
     */
    private Map<String, Object> convertGuideToMap(ExamGuideEntity guide) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", guide.getId());
        map.put("examCode", guide.getExamCode());
        map.put("title", guide.getTitle());
        map.put("examOverview", guide.getExam_overview());
        
        // 解析 exam_content（JSON 数组字符串）
        if (guide.getExam_content() != null && !guide.getExam_content().isEmpty()) {
            try {
                List<String> examContent = JSON.parseObject(guide.getExam_content(), new TypeReference<List<String>>() {});
                map.put("examContent", examContent);
            } catch (Exception e) {
                map.put("examContent", guide.getExam_content());
            }
        } else {
            map.put("examContent", new ArrayList<>());
        }
        
        // 解析 question_type_distribution（JSON 数组字符串）
        if (guide.getQuestion_type_distribution() != null && !guide.getQuestion_type_distribution().isEmpty()) {
            try {
                List<Map<String, Object>> distribution = JSON.parseObject(guide.getQuestion_type_distribution(), new TypeReference<List<Map<String, Object>>>() {});
                // 将内部字段也转换为驼峰命名
                List<Map<String, Object>> formattedDistribution = new ArrayList<>();
                for (Map<String, Object> item : distribution) {
                    Map<String, Object> formattedItem = new LinkedHashMap<>();
                    formattedItem.put("type", item.get("type"));
                    formattedItem.put("count", item.get("count"));
                    formattedItem.put("score", item.get("score"));
                    formattedDistribution.add(formattedItem);
                }
                map.put("questionTypeDistribution", formattedDistribution);
            } catch (Exception e) {
                map.put("questionTypeDistribution", guide.getQuestion_type_distribution());
            }
        } else {
            map.put("questionTypeDistribution", new ArrayList<>());
        }
        
        // 解析 preparation_tips（JSON 数组字符串）
        if (guide.getPreparation_tips() != null && !guide.getPreparation_tips().isEmpty()) {
            try {
                List<String> tips = JSON.parseObject(guide.getPreparation_tips(), new TypeReference<List<String>>() {});
                map.put("preparationTips", tips);
            } catch (Exception e) {
                map.put("preparationTips", guide.getPreparation_tips());
            }
        } else {
            map.put("preparationTips", new ArrayList<>());
        }
        map.put("content", guide.getContent());
        map.put("examTips", guide.getExam_tips());
        map.put("examDuration", guide.getExam_duration());
        map.put("totalScore", guide.getTotal_score());
        map.put("passScore", guide.getPass_score());
        map.put("enabled", guide.getEnabled());
        map.put("sortOrder", guide.getSort_order());
        map.put("createdAt", guide.getCreatedAt());
        map.put("updatedAt", guide.getUpdatedAt());
        
        return map;
    }

    /**
     * 获取考试指南列表
     * GET /api/guide/list
     */
    @GetMapping("/list")
    public ApiResult<?> getGuideList() {
        System.out.println("========== /api/guide/list 接口被调用 ==========");
        try {
            List<ExamGuideEntity> result = guideService.getGuideList();
            return ApiResult.ok(result);
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            return ApiResult.fail(e.getMessage());
        }

    }

    /**
     * 更新考试指南
     * PUT /api/guide
     */
    @PutMapping("")
    public ApiResult<?> updateGuide(@RequestBody Map<String, Object> requestBody) {
        System.out.println("========== /api/guide 接口被调用(更新) ==========");

        String examCode = (String) requestBody.get("exam_code");

        if (examCode == null || examCode.isEmpty()) {
            return ApiResult.fail("缺少必要参数 exam_code");
        }

        Map<String, Object> result = guideService.updateGuide(examCode, requestBody);

        if ((Boolean) result.get("success")) {
            return ApiResult.ok(result);
        } else {
            return ApiResult.fail((String) result.get("message"));
        }
    }
}