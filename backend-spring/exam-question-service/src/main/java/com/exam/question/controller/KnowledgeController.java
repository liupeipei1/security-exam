package com.exam.question.controller;

import com.exam.common.api.ApiResult;
import com.exam.question.entity.KnowledgePointsEntity;
import com.exam.question.service.KnowledgeService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 知识要点控制器
 */
@RestController
@RequestMapping("/api")
public class KnowledgeController {

    private final KnowledgeService knowledgeService;

    public KnowledgeController(KnowledgeService knowledgeService) {
        this.knowledgeService = knowledgeService;
    }

    /**
     * 获取知识要点列表
     * GET /api/knowledge
     */
    @GetMapping("/knowledge")
    public ApiResult<List<KnowledgePointsEntity>> getKnowledge(@RequestParam String bank_code) {
        System.out.println("========== /api/knowledge 接口被调用 ==========");
        System.out.println("请求参数 bank_code: " + bank_code);

        if (bank_code == null || bank_code.isEmpty()) {
            return ApiResult.fail("缺少必要参数 bank_code");
        }

        List<KnowledgePointsEntity> points = knowledgeService.getKnowledgePoints(bank_code);
        System.out.println("查询到知识要点数量: " + points.size());

        return ApiResult.ok(points);
    }
}