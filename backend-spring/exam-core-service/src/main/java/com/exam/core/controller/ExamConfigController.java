package com.exam.core.controller;

import com.exam.common.api.ApiResult;
import com.exam.core.service.ExamConfigService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/exams")
public class ExamConfigController {

    private final ExamConfigService examConfigService;

    public ExamConfigController(ExamConfigService examConfigService) {
        this.examConfigService = examConfigService;
    }

    /**
     * 获取所有考试配置列表
     * GET /api/exams
     */
    @GetMapping
    public ResponseEntity<?> getAllExams() {
        List<Map<String, Object>> exams = examConfigService.getAllExams();
        return ResponseEntity.ok(ApiResult.ok(exams));
    }

    /**
     * 获取考试配置详情
     * GET /api/exams/{examCode}
     */
    @GetMapping("/{examCode}")
    public ResponseEntity<?> getExamByCode(@PathVariable String examCode) {
        Map<String, Object> exam = examConfigService.getExamByCode(examCode);
        if (exam == null) {
            return ResponseEntity.status(404).body(ApiResult.fail("考试配置不存在"));
        }
        return ResponseEntity.ok(ApiResult.ok(exam));
    }

    /**
     * 新增考试配置（管理接口）
     * POST /api/exams
     */
    @PostMapping
    public ResponseEntity<?> createExam(@RequestBody Map<String, Object> body) {
        Map<String, Object> result = examConfigService.createExam(body);
        
        if ((Boolean) result.get("success")) {
            return ResponseEntity.ok(ApiResult.ok(result.get("data")));
        } else {
            return ResponseEntity.status(400).body(ApiResult.fail((String) result.get("message")));
        }
    }

    /**
     * 更新考试配置（管理接口）
     * PUT /api/exams/{examCode}
     */
    @PutMapping("/{examCode}")
    public ResponseEntity<?> updateExam(@PathVariable String examCode, @RequestBody Map<String, Object> body) {
        Map<String, Object> result = examConfigService.updateExam(examCode, body);
        
        if ((Boolean) result.get("success")) {
            return ResponseEntity.ok(ApiResult.ok(result.get("data")));
        } else {
            return ResponseEntity.status(404).body(ApiResult.fail((String) result.get("message")));
        }
    }

    /**
     * 删除考试配置（管理接口）
     * DELETE /api/exams/{examCode}
     */
    @DeleteMapping("/{examCode}")
    public ResponseEntity<?> deleteExam(@PathVariable String examCode) {
        Map<String, Object> result = examConfigService.deleteExam(examCode);
        
        if ((Boolean) result.get("success")) {
            return ResponseEntity.ok(ApiResult.okMessage((String) result.get("message")));
        } else {
            return ResponseEntity.status(404).body(ApiResult.fail((String) result.get("message")));
        }
    }
}