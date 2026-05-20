package com.exam.question.controller;

import com.exam.common.api.ApiResult;
import com.exam.question.service.ExamCacheService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/exam")
public class ExamController {

    private final ExamCacheService examCacheService;

    public ExamController(ExamCacheService examCacheService) {
        this.examCacheService = examCacheService;
    }

    @GetMapping("/records")
    public ApiResult<List<Map<String, Object>>> records(@RequestParam String openid) throws Exception {
        return ApiResult.ok(examCacheService.getRecords(openid));
    }

    @PostMapping("/record")
    public ApiResult<String> saveRecord(@RequestBody Map<String, Object> body) throws Exception {
        String openid = (String) body.get("openid");
        @SuppressWarnings("unchecked")
        Map<String, Object> record = (Map<String, Object>) body.get("record");
        if (openid == null || record == null) {
            throw new IllegalArgumentException("缺少必要参数");
        }
        examCacheService.saveRecord(openid, record);
        return ApiResult.okMessage("保存成功");
    }

    @DeleteMapping("/records")
    public ApiResult<String> deleteRecords(@RequestParam String openid) {
        examCacheService.deleteRecords(openid);
        return ApiResult.okMessage("删除成功");
    }

    @GetMapping("/progress")
    public ApiResult<Map<String, Object>> getProgress(
            @RequestParam String openid,
            @RequestParam(name = "bank_code", required = false) String bankCode) throws Exception {
        return ApiResult.ok(examCacheService.getProgress(openid, bankCode));
    }

    @PostMapping("/progress")
    public ApiResult<String> saveProgress(@RequestBody Map<String, Object> body) throws Exception {
        String openid = (String) body.get("openid");
        String bankCode = (String) body.get("bank_code");
        @SuppressWarnings("unchecked")
        Map<String, Object> progress = (Map<String, Object>) body.get("progress");
        if (openid == null || progress == null) {
            throw new IllegalArgumentException("缺少必要参数");
        }
        examCacheService.saveProgress(openid, bankCode, progress);
        return ApiResult.okMessage("保存成功");
    }

    @GetMapping("/session")
    public ApiResult<Map<String, Object>> getSession(@RequestParam String openid) throws Exception {
        return ApiResult.ok(examCacheService.getSession(openid));
    }

    @PostMapping("/session")
    public ApiResult<String> saveSession(@RequestBody Map<String, Object> body) throws Exception {
        String openid = (String) body.get("openid");
        @SuppressWarnings("unchecked")
        Map<String, Object> session = (Map<String, Object>) body.get("session");
        if (openid == null || session == null) {
            throw new IllegalArgumentException("缺少必要参数");
        }
        examCacheService.saveSession(openid, session);
        return ApiResult.okMessage("保存成功");
    }

    @DeleteMapping("/session")
    public ApiResult<String> deleteSession(@RequestParam String openid) {
        examCacheService.deleteSession(openid);
        return ApiResult.okMessage("删除成功");
    }
}
