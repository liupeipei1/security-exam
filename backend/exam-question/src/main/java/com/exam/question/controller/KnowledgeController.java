package com.exam.question.controller;
import com.exam.common.api.ApiResult;
import com.exam.question.entity.KnowledgePointsEntity;
import com.exam.question.service.KnowledgeService;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 知识要点控制器
 * 处理知识要点相关的API请求
 */
@RestController
@RequestMapping("/api/knowledge")
@Tag(name = "知识要点", description = "知识要点相关接口")
public class KnowledgeController {

    @Autowired
    private KnowledgeService knowledgeService;


    /**
     * 获取知识要点列表
     * GET /api/knowledge/list?exam_code=xxx
     * @param examCode 考试代码（可选）
     * @return 知识要点列表
     */
    @GetMapping("/list")
    public ResponseEntity<Map<String, Object>> getKnowledgeList(
            @RequestParam(value = "exam_code", required = false) String examCode) {

        Map<String, Object> response = new HashMap<>();

        try {
            List<KnowledgePointsEntity> knowledgeList = knowledgeService.getKnowledgePointsByExamCode(examCode);

            response.put("success", true);
            response.put("data", knowledgeList);
            response.put("message", "获取成功");
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "获取失败: " + e.getMessage());
        }

        return ResponseEntity.ok(response);
    }

}