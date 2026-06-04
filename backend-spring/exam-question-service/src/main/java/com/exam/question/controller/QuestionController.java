package com.exam.question.controller;

import com.exam.common.api.ApiResult;
import com.exam.question.service.QuestionService;
import com.exam.question.service.VipGuardService;
import com.exam.question.util.OpenidContext;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/api/questions", "/api/question"})
public class QuestionController {

    private final QuestionService questionService;
    private final VipGuardService vipGuardService;

    public QuestionController(QuestionService questionService, VipGuardService vipGuardService) {
        this.questionService = questionService;
        this.vipGuardService = vipGuardService;
    }

    @GetMapping
    public ApiResult<List<Map<String, Object>>> list(
            HttpServletRequest request,
            @RequestParam(required = false) String openid,
            @RequestParam(name = "bank_code", required = false) String bankCode) {
        vipGuardService.requireVip(OpenidContext.resolve(request, openid));
        return ApiResult.ok(questionService.listAll(bankCode, true));
    }

    @GetMapping("/random")
    public ApiResult<Map<String, Object>> randomOne(
            HttpServletRequest request,
            @RequestParam(required = false) String openid,
            @RequestParam(name = "bank_code", required = false) String bankCode) {
        vipGuardService.requireVip(OpenidContext.resolve(request, openid));
        Map<String, Object> q = questionService.randomOne(bankCode);
        if (q == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "没有找到题目");
        }
        return ApiResult.ok(q);
    }

    @GetMapping("/random/{count}")
    public ApiResult<List<Map<String, Object>>> randomMany(
            HttpServletRequest request,
            @RequestParam(required = false) String openid,
            @RequestParam(name = "bank_code", required = false) String bankCode,
            @PathVariable int count) {
        vipGuardService.requireVip(OpenidContext.resolve(request, openid));
        return ApiResult.ok(questionService.random(bankCode, count <= 0 ? 10 : count));
    }

    @GetMapping("/type/{type}")
    public ApiResult<List<Map<String, Object>>> byType(
            HttpServletRequest request,
            @RequestParam(required = false) String openid,
            @RequestParam(name = "bank_code", required = false) String bankCode,
            @PathVariable String type) {
        vipGuardService.requireVip(OpenidContext.resolve(request, openid));
        return ApiResult.ok(questionService.byType(bankCode, type));
    }

    @GetMapping("/types")
    public ApiResult<List<String>> types(@RequestParam(name = "bank_code", required = false) String bankCode) {
        return ApiResult.ok(questionService.types(bankCode));
    }

    @GetMapping("/count")
    public ApiResult<Map<String, Object>> count(@RequestParam(name = "bank_code", required = false) String bankCode) {
        return ApiResult.ok(questionService.countStats(bankCode));
    }

    /**
     * 保存题目解析
     * POST /api/question/explanation
     */
    @PostMapping("/explanation")
    public ApiResult<Void> saveExplanation(
            @RequestBody Map<String, Object> body) {
        System.out.println("========== /api/questions/explanation 接口被调用 ==========");
        
        String bankCode = (String) body.get("bank_code");
        Object questionIdObj = body.get("question_id");
        String explanation = (String) body.get("explanation");
        
        if (bankCode == null || bankCode.isEmpty() || questionIdObj == null) {
            return ApiResult.fail("缺少必要参数");
        }
        
        Long questionId;
        if (questionIdObj instanceof Number) {
            questionId = ((Number) questionIdObj).longValue();
        } else {
            questionId = Long.parseLong(questionIdObj.toString());
        }
        
        boolean success = questionService.saveExplanation(bankCode, questionId, explanation);
        
        if (success) {
            return ApiResult.okMessage("保存成功");
        } else {
            return ApiResult.fail("题目不存在");
        }
    }

    /**
     * 更新题目
     * PUT /api/questions/{exam_code}/{id}
     */
    @PutMapping("/{exam_code}/{id}")
    public ApiResult<Void> updateQuestion(
            @PathVariable("exam_code") String examCode,
            @PathVariable("id") Long id,
            @RequestBody Map<String, Object> body) {
        System.out.println("========== PUT /api/questions/" + examCode + "/" + id + " 接口被调用 ==========");
        
        String question = (String) body.get("question");
        String options = (String) body.get("options");
        String[] answer = JSON.parse((String) body.get("answer"));
        String analysis = (String) body.get("analysis");
        String type = (String) body.get("type");
        Object knowledgePointObj = body.get("knowledgePoint");
        
        Long knowledgePointId = null;
        if (knowledgePointObj instanceof Number) {
            knowledgePointId = ((Number) knowledgePointObj).longValue();
        } else if (knowledgePointObj != null) {
            try {
                knowledgePointId = Long.parseLong(knowledgePointObj.toString());
            } catch (NumberFormatException e) {
                // 忽略无效的知识要点ID
            }
        }
        
        boolean success = questionService.updateQuestion(examCode, id, question, options, answer, analysis, type, knowledgePointId);
        
        if (success) {
            return ApiResult.okMessage("更新成功");
        } else {
            return ApiResult.fail("题目不存在");
        }
    }

    /**
     * 删除题目
     * DELETE /api/questions/{exam_code}/{id}
     */
    @DeleteMapping("/{exam_code}/{id}")
    public ApiResult<Void> deleteQuestion(
            @PathVariable("exam_code") String examCode,
            @PathVariable("id") Long id) {
        System.out.println("========== DELETE /api/questions/" + examCode + "/" + id + " 接口被调用 ==========");
        
        boolean success = questionService.deleteQuestion(examCode, id);
        
        if (success) {
            return ApiResult.okMessage("删除成功");
        } else {
            return ApiResult.fail("题目不存在");
        }
    }

    /**
     * 导入题目
     */
    @PostMapping("/import")
    public ApiResult importQuestions(@RequestBody Map<String, Object> body) {
        String content = (String) body.get("content");
        String bankCode = (String) body.get("bank_code");
        String questionType = (String) body.get("question_type");
        Long guideId = body.get("guide_id") != null ? ((Number) body.get("guide_id")).longValue() : null;
        Long knowledgePointId = body.get("knowledge_point_id") != null ? ((Number) body.get("knowledge_point_id")).longValue() : null;
        
        if (content == null || content.trim().isEmpty()) {
            return ApiResult.fail("题目内容不能为空");
        }
        
        if (bankCode == null || bankCode.trim().isEmpty()) {
            return ApiResult.fail("题库代码不能为空");
        }
        
        Map<String, Object> result = questionService.importQuestions(content, bankCode, questionType, guideId, knowledgePointId);
        
        if ((Boolean) result.get("success")) {
            return ApiResult.success(result);
        } else {
            return ApiResult.fail((String) result.get("message"));
        }
    }
}
