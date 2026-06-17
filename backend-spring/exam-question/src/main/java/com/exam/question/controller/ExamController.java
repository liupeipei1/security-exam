package com.exam.question.controller;

import com.exam.common.api.ApiResult;
import com.exam.question.service.ExamCacheService;
import com.exam.question.util.OpenidContext;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/exam")
public class ExamController {

    @Autowired
    private  ExamCacheService examCacheService;


    @GetMapping("/records")
    public ApiResult<List<Map<String, Object>>> records(HttpServletRequest request,
                                                       @RequestParam(required = false) String openid) throws Exception {
        return ApiResult.ok(examCacheService.getRecords(OpenidContext.resolve(request, openid)));
    }

    @PostMapping("/record")
    public ApiResult<String> saveRecord(HttpServletRequest request, @RequestBody Map<String, Object> body) throws Exception {
        String openid = OpenidContext.resolve(request, (String) body.get("openid"));
        @SuppressWarnings("unchecked")
        Map<String, Object> record = (Map<String, Object>) body.get("record");
        if (openid == null || record == null) {
            throw new IllegalArgumentException("缺少必要参数");
        }
        examCacheService.saveRecord(openid, record);
        return ApiResult.okMessage("保存成功");
    }

    @DeleteMapping("/records")
    public ApiResult<String> deleteRecords(HttpServletRequest request,
                                           @RequestParam(required = false) String openid) {
        examCacheService.deleteRecords(OpenidContext.resolve(request, openid));
        return ApiResult.okMessage("删除成功");
    }

    @GetMapping("/progress")
    public ApiResult<Map<String, Object>> getProgress(
            HttpServletRequest request,
            @RequestParam(required = false) String openid,
            @RequestParam(name = "exam_code", required = false) String examCode) throws Exception {
        return ApiResult.ok(examCacheService.getProgress(OpenidContext.resolve(request, openid), examCode));
    }

    @PostMapping("/progress")
    public ApiResult<String> saveProgress(HttpServletRequest request, @RequestBody Map<String, Object> body) throws Exception {
        String openid = OpenidContext.resolve(request, (String) body.get("openid"));
        String examCode = (String) body.get("exam_code");
        @SuppressWarnings("unchecked")
        Map<String, Object> progress = (Map<String, Object>) body.get("progress");
        if (openid == null || progress == null) {
            throw new IllegalArgumentException("缺少必要参数");
        }
        examCacheService.saveProgress(openid, examCode, progress);
        return ApiResult.okMessage("保存成功");
    }

    @GetMapping("/session")
    public ApiResult<Map<String, Object>> getSession(HttpServletRequest request,
                                                    @RequestParam(required = false) String openid) throws Exception {
        return ApiResult.ok(examCacheService.getSession(OpenidContext.resolve(request, openid)));
    }

    @PostMapping("/session")
    public ApiResult<String> saveSession(HttpServletRequest request, @RequestBody Map<String, Object> body) throws Exception {
        String openid = OpenidContext.resolve(request, (String) body.get("openid"));
        @SuppressWarnings("unchecked")
        Map<String, Object> session = (Map<String, Object>) body.get("session");
        if (openid == null || session == null) {
            throw new IllegalArgumentException("缺少必要参数");
        }
        examCacheService.saveSession(openid, session);
        return ApiResult.okMessage("保存成功");
    }

    @DeleteMapping("/session")
    public ApiResult<String> deleteSession(HttpServletRequest request,
                                           @RequestParam(required = false) String openid) {
        examCacheService.deleteSession(OpenidContext.resolve(request, openid));
        return ApiResult.okMessage("删除成功");
    }
}
