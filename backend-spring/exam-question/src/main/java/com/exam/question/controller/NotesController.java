package com.exam.question.controller;

import com.exam.common.api.ApiResult;
import com.exam.question.entity.QuestionNotesEntity;
import com.exam.question.service.NotesService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 笔记控制器
 */
@RestController
@RequestMapping("/api/notes")
public class NotesController {

    private final NotesService notesService;

    public NotesController(NotesService notesService) {
        this.notesService = notesService;
    }

    /**
     * 获取题目备注列表
     * GET /api/notes?openid=xxx&exam_code=xxx&question_id=xxx
     */
    @GetMapping
    public ResponseEntity<?> getNotes(
            @RequestParam String openid,
            @RequestParam String exam_code,
            @RequestParam(required = false) Integer question_id) {
        
        if (openid == null || openid.isEmpty() || exam_code == null || exam_code.isEmpty()) {
            return ResponseEntity.status(400).body(ApiResult.fail("缺少必要参数"));
        }

        List<QuestionNotesEntity> notes = notesService.getNotes(openid, exam_code, question_id);
        return ResponseEntity.ok(ApiResult.ok(notes));
    }

    /**
     * 保存或更新题目备注
     * POST /api/notes
     */
    @PostMapping
    public ResponseEntity<?> saveNote(@RequestBody Map<String, Object> body) {
        String openid = (String) body.get("openid");
        String examCode = (String) body.get("exam_code");
        Integer questionId = (Integer) body.get("question_id");
        String note = (String) body.get("note");

        if (openid == null || openid.isEmpty() || examCode == null || examCode.isEmpty() || questionId == null) {
            return ResponseEntity.status(400).body(ApiResult.fail("缺少必要参数"));
        }

        Map<String, Object> result = notesService.saveNote(openid, examCode, questionId, note);
        
        if ((Boolean) result.get("success")) {
            return ResponseEntity.ok(ApiResult.okMessage((String) result.get("message")));
        } else {
            return ResponseEntity.status(500).body(ApiResult.fail((String) result.get("message")));
        }
    }

    /**
     * 删除题目备注
     * DELETE /api/notes?openid=xxx&exam_code=xxx&question_id=xxx
     */
    @DeleteMapping
    public ResponseEntity<?> deleteNote(
            @RequestParam String openid,
            @RequestParam String exam_code,
            @RequestParam Long question_id) {
        
        if (openid == null || openid.isEmpty() || exam_code == null || exam_code.isEmpty() || question_id == null) {
            return ResponseEntity.status(400).body(ApiResult.fail("缺少必要参数"));
        }

        notesService.deleteNote(openid, exam_code, question_id);
        return ResponseEntity.ok(ApiResult.okMessage("删除成功"));
    }
}