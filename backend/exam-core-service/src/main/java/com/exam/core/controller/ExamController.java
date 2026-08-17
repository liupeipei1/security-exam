package com.exam.core.controller;

import com.exam.common.api.ApiResult;
import com.exam.core.service.ExamService;
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

    @GetMapping("/records")
    public ResponseEntity<?> getRecords(@RequestParam(required = false) String openid) {
        if (openid == null || openid.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "缺少openid参数"));
        }
        List<Map<String, Object>> records = examService.getExamHistory(openid);
        return ResponseEntity.ok(ApiResult.ok(records));
    }

    @PostMapping("/record")
    public ResponseEntity<?> saveRecord(@RequestBody Map<String, Object> body) {
        String openid = (String) body.get("openid");
        @SuppressWarnings("unchecked")
        Map<String, Object> record = (Map<String, Object>) body.get("record");
        if (openid == null || record == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "缺少必要参数"));
        }
        examService.saveExamRecord(openid, record);
        return ResponseEntity.ok(ApiResult.okMessage("保存成功"));
    }

    @DeleteMapping("/records")
    public ResponseEntity<?> deleteRecords(@RequestParam(required = false) String openid) {
        if (openid == null || openid.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "缺少openid参数"));
        }
        List<Map<String, Object>> records = examService.getExamHistory(openid);
        records.forEach(r -> {
            Long id = (Long) r.get("id");
            examService.deleteExamRecord(openid, id);
        });
        return ResponseEntity.ok(ApiResult.okMessage("删除成功"));
    }

    @GetMapping("/progress")
    public ResponseEntity<?> getProgress(
            @RequestParam(required = false) String openid,
            @RequestParam(name = "exam_code", required = false) String examCode) {
        if (openid == null || openid.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "缺少openid参数"));
        }
        String sessionId = openid + ":" + (examCode != null ? examCode : "default");
        Map<String, Object> progress = examService.getProgress(sessionId);
        if (progress == null) {
            progress = Map.of();
        }
        return ResponseEntity.ok(ApiResult.ok(progress));
    }

    @PostMapping("/progress")
    public ResponseEntity<?> saveProgress(@RequestBody Map<String, Object> body) {
        String openid = (String) body.get("openid");
        String examCode = (String) body.get("exam_code");
        @SuppressWarnings("unchecked")
        Map<String, Object> progress = (Map<String, Object>) body.get("progress");
        if (openid == null || progress == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "缺少必要参数"));
        }
        String sessionId = openid + ":" + (examCode != null ? examCode : "default");
        examService.saveProgress(sessionId, progress);
        return ResponseEntity.ok(ApiResult.okMessage("保存成功"));
    }

    @GetMapping("/session")
    public ResponseEntity<?> getSession(@RequestParam(required = false) String openid) {
        if (openid == null || openid.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "缺少openid参数"));
        }
        Map<String, Object> session = examService.getSession(openid);
        if (session == null) {
            session = Map.of();
        }
        return ResponseEntity.ok(ApiResult.ok(session));
    }

    @PostMapping("/session")
    public ResponseEntity<?> saveSession(@RequestBody Map<String, Object> body) {
        String openid = (String) body.get("openid");
        @SuppressWarnings("unchecked")
        Map<String, Object> session = (Map<String, Object>) body.get("session");
        if (openid == null || session == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "缺少必要参数"));
        }
        examService.saveSession(openid, session);
        return ResponseEntity.ok(ApiResult.okMessage("保存成功"));
    }

    @DeleteMapping("/session")
    public ResponseEntity<?> deleteSession(@RequestParam(required = false) String openid) {
        if (openid == null || openid.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "缺少openid参数"));
        }
        examService.deleteSession(openid);
        return ResponseEntity.ok(ApiResult.okMessage("删除成功"));
    }

    @GetMapping("/history")
    public ResponseEntity<?> getExamHistory(@RequestParam(required = false) String openid) {
        if (openid == null || openid.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "缺少openid参数"));
        }
        List<Map<String, Object>> history = examService.getExamHistory(openid);
        return ResponseEntity.ok(ApiResult.ok(history));
    }

    @GetMapping("/detail")
    public ResponseEntity<?> getExamDetail(@RequestParam(required = false) String openid, @RequestParam Long record_id) {
        if (openid == null || openid.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "缺少openid参数"));
        }
        Map<String, Object> detail = examService.getExamDetail(openid, record_id);
        if (detail == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(ApiResult.ok(detail));
    }

    @PostMapping("/save")
    public ResponseEntity<?> saveExamRecord(@RequestBody Map<String, Object> body) {
        String openid = (String) body.get("openid");
        if (openid == null || openid.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "缺少openid参数"));
        }
        Map<String, Object> saved = examService.saveExamRecord(openid, body);
        return ResponseEntity.ok(ApiResult.ok(saved));
    }

    @DeleteMapping("/delete")
    public ResponseEntity<?> deleteExamRecord(@RequestParam(required = false) String openid, @RequestParam Long record_id) {
        if (openid == null || openid.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "缺少openid参数"));
        }
        boolean deleted = examService.deleteExamRecord(openid, record_id);
        if (!deleted) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(ApiResult.okMessage("删除成功"));
    }

    @DeleteMapping("/session/clear")
    public ResponseEntity<?> clearAllSessions() {
        long count = examService.clearAllSessions();
        return ResponseEntity.ok(ApiResult.ok(Map.of("cleared", count)));
    }

    @GetMapping("/session/count")
    public ResponseEntity<?> getSessionCount() {
        long count = examService.getSessionCount();
        return ResponseEntity.ok(ApiResult.ok(Map.of("count", count)));
    }
}