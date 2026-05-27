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
}
