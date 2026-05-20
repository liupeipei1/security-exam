package com.exam.question.controller;

import com.exam.common.api.ApiResult;
import com.exam.question.service.QuestionService;
import com.exam.question.service.VipGuardService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/questions")
public class QuestionController {

    private final QuestionService questionService;
    private final VipGuardService vipGuardService;

    public QuestionController(QuestionService questionService, VipGuardService vipGuardService) {
        this.questionService = questionService;
        this.vipGuardService = vipGuardService;
    }

    @GetMapping
    public ApiResult<List<Map<String, Object>>> list(
            @RequestParam(required = false) String openid,
            @RequestParam(name = "bank_code", required = false) String bankCode) {
        vipGuardService.requireVip(openid);
        return ApiResult.ok(questionService.listAll(bankCode, true));
    }

    @GetMapping("/random")
    public ApiResult<Map<String, Object>> randomOne(
            @RequestParam(required = false) String openid,
            @RequestParam(name = "bank_code", required = false) String bankCode) {
        vipGuardService.requireVip(openid);
        Map<String, Object> q = questionService.randomOne(bankCode);
        if (q == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "没有找到题目");
        }
        return ApiResult.ok(q);
    }

    @GetMapping("/random/{count}")
    public ApiResult<List<Map<String, Object>>> randomMany(
            @RequestParam(required = false) String openid,
            @RequestParam(name = "bank_code", required = false) String bankCode,
            @PathVariable int count) {
        vipGuardService.requireVip(openid);
        return ApiResult.ok(questionService.random(bankCode, count <= 0 ? 10 : count));
    }

    @GetMapping("/type/{type}")
    public ApiResult<List<Map<String, Object>>> byType(
            @RequestParam(required = false) String openid,
            @RequestParam(name = "bank_code", required = false) String bankCode,
            @PathVariable String type) {
        vipGuardService.requireVip(openid);
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
}
