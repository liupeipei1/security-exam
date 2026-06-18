package com.exam.question.controller;

import com.exam.question.entity.ExamGuideEntity;
import com.exam.question.service.GuideService;
import com.exam.common.api.ApiResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 考试指南控制器
 */
@Slf4j
@RestController
@RequestMapping("/api/guide")
public class GuideController {

    @Autowired
    private  GuideService guideService;

    /**
     * 获取考试指南
     * GET /api/guide
     */
    @GetMapping("")
    public ApiResult<?> getGuide(@RequestParam(value = "exam_code", required = false) String examCode) {
        log.info("========== /api/guide 接口被调用 =========="+examCode );

        if (examCode == null || examCode.isEmpty()) {
            return ApiResult.fail("缺少必要参数 exam_code");
        }
        ExamGuideEntity result = guideService.getGuide(examCode);
        return ApiResult.ok(result);
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