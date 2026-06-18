package com.exam.question.controller;

import com.exam.common.api.ApiResult;
import com.exam.question.service.QuestionNoteService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/questions/note")
public class QuestionNoteController {

    private final QuestionNoteService questionNoteService;

    public QuestionNoteController(QuestionNoteService questionNoteService) {
        this.questionNoteService = questionNoteService;
    }

    /**
     * 保存或更新题目备注
     * POST /api/questions/note/save
     */
    @PostMapping("/save")
    public ResponseEntity<?> saveNote(@RequestBody Map<String, Object> body) {
        String openid = (String) body.get("openid");
        Integer questionId = (Integer) body.get("question_id");
        String exam_code = (String) body.get("exam_code");
        String content = (String) body.get("content");

        if (openid == null || openid.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "缺少openid参数"));
        }
        if (questionId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "缺少question_id参数"));
        }

        Map<String, Object> saved = questionNoteService.saveNote(openid, questionId, exam_code, content);
        return ResponseEntity.ok(ApiResult.ok(saved));
    }

    /**
     * 获取题目备注
     * GET /api/questions/note/get?openid=xxx&question_id=xxx
     */
    @GetMapping("/get")
    public ResponseEntity<?> getNote(@RequestParam String openid, @RequestParam Integer question_id) {
        if (openid == null || openid.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "缺少openid参数"));
        }
        if (question_id == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "缺少question_id参数"));
        }

        Map<String, Object> note = questionNoteService.getNote(openid, question_id);
        if (note == null) {
            return ResponseEntity.ok(ApiResult.ok(null));
        }
        return ResponseEntity.ok(ApiResult.ok(note));
    }

    /**
     * 删除题目备注
     * DELETE /api/questions/note/delete?openid=xxx&question_id=xxx
     */
    @DeleteMapping("/delete")
    public ResponseEntity<?> deleteNote(@RequestParam String openid, @RequestParam Integer question_id) {
        if (openid == null || openid.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "缺少openid参数"));
        }
        if (question_id == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "缺少question_id参数"));
        }

        boolean deleted = questionNoteService.deleteNote(openid, question_id);
        if (!deleted) {
            return ResponseEntity.ok(ApiResult.okMessage("备注不存在"));
        }
        return ResponseEntity.ok(ApiResult.okMessage("删除成功"));
    }

    /**
     * 获取用户备注列表（支持按题库筛选）
     * GET /api/questions/note/list?openid=xxx&exam_code=xxx
     */
    @GetMapping("/list")
    public ResponseEntity<?> listNotes(@RequestParam String openid, @RequestParam(required = false) String exam_code) {
        if (openid == null || openid.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "缺少openid参数"));
        }

        List<?> notes;
        if (exam_code == null || exam_code.isBlank()) {
            notes = questionNoteService.getNotesByOpenid(openid);
        } else {
            notes = questionNoteService.getNotesByOpenidAndExamCode(openid, exam_code);
        }
        return ResponseEntity.ok(ApiResult.ok(notes));
    }
}