package com.exam.question.controller;
import com.exam.common.api.ApiResult;
import com.exam.question.entity.KnowledgePointsEntity;
import com.exam.question.service.KnowledgeService;
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
@RequestMapping("/api")
public class KnowledgeController {

    @Autowired
    private KnowledgeService knowledgeService;


    /**
     * 获取知识要点列表
     * GET /api/knowledge/list?exam_code=xxx
     * @param examCode 考试代码（可选）
     * @return 知识要点列表
     */
    @GetMapping("/knowledge/list")
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

    /**
     * 获取知识要点列表
     * GET /api/knowledge
     * 和上面接口重复
     */
    @GetMapping("/knowledge")
    public ApiResult<List<KnowledgePointsEntity>> getKnowledge(@RequestParam String exam_code) {
        System.out.println("========== /api/knowledge 接口被调用 ==========");
        System.out.println("请求参数 exam_code: " + exam_code);

        if (exam_code == null || exam_code.isEmpty()) {
            return ApiResult.fail("缺少必要参数 exam_code");
        }

        List<KnowledgePointsEntity> points = knowledgeService.getKnowledgePointsByExamCode(exam_code);
        System.out.println("查询到知识要点数量: " + points.size());

        return ApiResult.ok(points);
    }
}