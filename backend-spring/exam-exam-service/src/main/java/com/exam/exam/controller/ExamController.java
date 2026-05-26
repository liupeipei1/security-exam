package com.exam.exam.controller;

import com.exam.common.api.ApiResult;
import com.exam.exam.service.ExamService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/exam")
public class ExamController {

    private final ExamService examService;

    public ExamController(ExamService examService) {
        this.examService = examService;
    }

    /**
     * 获取考试历史记录
     * GET /api/exam/history?openid=xxx
     */
    @GetMapping("/history")
    public ResponseEntity<?> getExamHistory(@RequestParam String openid) {
        if (openid == null || openid.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "缺少openid参数"));
        }
        List<Map<String, Object>> history = examService.getExamHistory(openid);
        return ResponseEntity.ok(ApiResult.ok(history));
    }

    /**
     * 获取考试记录详情
     * GET /api/exam/detail?openid=xxx&record_id=xxx
     */
    @GetMapping("/detail")
    public ResponseEntity<?> getExamDetail(@RequestParam String openid, @RequestParam Long record_id) {
        if (openid == null || openid.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "缺少openid参数"));
        }
        Map<String, Object> detail = examService.getExamDetail(openid, record_id);
        if (detail == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(ApiResult.ok(detail));
    }

    /**
     * 保存考试记录
     * POST /api/exam/save
     */
    @PostMapping("/save")
    public ResponseEntity<?> saveExamRecord(@RequestBody Map<String, Object> body) {
        String openid = (String) body.get("openid");
        if (openid == null || openid.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "缺少openid参数"));
        }
        Map<String, Object> saved = examService.saveExamRecord(openid, body);
        return ResponseEntity.ok(ApiResult.ok(saved));
    }

    /**
     * 删除考试记录
     * DELETE /api/exam/delete?openid=xxx&record_id=xxx
     */
    @DeleteMapping("/delete")
    public ResponseEntity<?> deleteExamRecord(@RequestParam String openid, @RequestParam Long record_id) {
        if (openid == null || openid.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "缺少openid参数"));
        }
        boolean deleted = examService.deleteExamRecord(openid, record_id);
        if (!deleted) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(ApiResult.okMessage("删除成功"));
    }

    /**
     * 保存考试进度
     * POST /api/exam/progress/save
     */
    @PostMapping("/progress/save")
    public ResponseEntity<?> saveProgress(@RequestBody Map<String, Object> body) {
        String sessionId = (String) body.get("session_id");
        if (sessionId == null || sessionId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "缺少session_id参数"));
        }
        examService.saveProgress(sessionId, body);
        return ResponseEntity.ok(ApiResult.okMessage("保存成功"));
    }

    /**
     * 获取考试进度
     * GET /api/exam/progress/get?session_id=xxx
     */
    @GetMapping("/progress/get")
    public ResponseEntity<?> getProgress(@RequestParam String session_id) {
        if (session_id == null || session_id.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "缺少session_id参数"));
        }
        Map<String, Object> progress = examService.getProgress(session_id);
        if (progress == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(ApiResult.ok(progress));
    }

    /**
     * 删除考试进度
     * DELETE /api/exam/progress/delete?session_id=xxx
     */
    @DeleteMapping("/progress/delete")
    public ResponseEntity<?> deleteProgress(@RequestParam String session_id) {
        if (session_id == null || session_id.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "缺少session_id参数"));
        }
        examService.deleteProgress(session_id);
        return ResponseEntity.ok(ApiResult.okMessage("删除成功"));
    }

    /**
     * 保存考试会话
     * POST /api/exam/session/save
     */
    @PostMapping("/session/save")
    public ResponseEntity<?> saveSession(@RequestBody Map<String, Object> body) {
        String sessionId = (String) body.get("session_id");
        if (sessionId == null || sessionId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "缺少session_id参数"));
        }
        examService.saveSession(sessionId, body);
        return ResponseEntity.ok(ApiResult.okMessage("保存成功"));
    }

    /**
     * 获取考试会话
     * GET /api/exam/session/get?session_id=xxx
     */
    @GetMapping("/session/get")
    public ResponseEntity<?> getSession(@RequestParam String session_id) {
        if (session_id == null || session_id.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "缺少session_id参数"));
        }
        Map<String, Object> session = examService.getSession(session_id);
        if (session == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(ApiResult.ok(session));
    }

    /**
     * 删除考试会话
     * DELETE /api/exam/session/delete?session_id=xxx
     */
    @DeleteMapping("/session/delete")
    public ResponseEntity<?> deleteSession(@RequestParam String session_id) {
        if (session_id == null || session_id.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "缺少session_id参数"));
        }
        examService.deleteSession(session_id);
        return ResponseEntity.ok(ApiResult.okMessage("删除成功"));
    }

    /**
     * 清理所有会话（管理接口）
     * DELETE /api/exam/session/clear
     */
    @DeleteMapping("/session/clear")
    public ResponseEntity<?> clearAllSessions() {
        long count = examService.clearAllSessions();
        return ResponseEntity.ok(ApiResult.ok(Map.of("cleared", count)));
    }

    /**
     * 获取会话数量（管理接口）
     * GET /api/exam/session/count
     */
    @GetMapping("/session/count")
    public ResponseEntity<?> getSessionCount() {
        long count = examService.getSessionCount();
        return ResponseEntity.ok(ApiResult.ok(Map.of("count", count)));
    }
}