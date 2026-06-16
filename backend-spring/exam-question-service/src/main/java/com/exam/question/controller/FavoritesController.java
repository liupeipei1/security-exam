package com.exam.question.controller;

import com.exam.common.api.ApiResult;
import com.exam.question.service.FavoritesService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 收藏夹控制器
 */
@RestController
@RequestMapping("/api/favorites")
public class FavoritesController {

    @Autowired
    private  FavoritesService favoritesService;

    /**
     * 添加收藏
     * POST /api/favorites/add
     */
    @PostMapping("/add")
    public ResponseEntity<?> addFavorite(@RequestBody Map<String, Object> body) {
        String openid = (String) body.get("openid");
        String examCode = (String) body.get("exam_code");
        String bankCode = (String) body.get("bank_code");
        Object questionIdObj = body.get("question_id");

        // 兼容 bank_code 和 exam_code 两种参数名
        examCode = examCode != null && !examCode.isEmpty() ? examCode : bankCode;

        Long questionId = null;
        if (questionIdObj != null) {
            if (questionIdObj instanceof Number) {
                questionId = ((Number) questionIdObj).longValue();
            } else {
                questionId = Long.parseLong(questionIdObj.toString());
            }
        }

        if (openid == null || openid.isEmpty() || examCode == null || examCode.isEmpty() || questionId == null) {
            return ResponseEntity.status(400).body(ApiResult.fail("缺少必要参数"));
        }

        Map<String, Object> result = favoritesService.addFavorite(openid, examCode, questionId);

        if ((Boolean) result.get("success")) {
            return ResponseEntity.ok(ApiResult.okMessage((String) result.get("message")));
        } else {
            return ResponseEntity.status(500).body(ApiResult.fail((String) result.get("message")));
        }
    }

    /**
     * 取消收藏
     * POST /api/favorites/remove
     */
    @PostMapping("/remove")
    public ResponseEntity<?> removeFavorite(@RequestBody Map<String, Object> body) {
        String openid = (String) body.get("openid");
        String examCode = (String) body.get("exam_code");
        String bankCode = (String) body.get("bank_code");
        Object questionIdObj = body.get("question_id");

        // 兼容 bank_code 和 exam_code 两种参数名
        examCode = examCode != null && !examCode.isEmpty() ? examCode : bankCode;

        Long questionId = null;
        if (questionIdObj != null) {
            if (questionIdObj instanceof Number) {
                questionId = ((Number) questionIdObj).longValue();
            } else {
                questionId = Long.parseLong(questionIdObj.toString());
            }
        }

        if (openid == null || openid.isEmpty() || examCode == null || examCode.isEmpty() || questionId == null) {
            return ResponseEntity.status(400).body(ApiResult.fail("缺少必要参数"));
        }

        Map<String, Object> result = favoritesService.removeFavorite(openid, examCode, questionId);

        if ((Boolean) result.get("success")) {
            return ResponseEntity.ok(ApiResult.okMessage((String) result.get("message")));
        } else {
            return ResponseEntity.status(500).body(ApiResult.fail((String) result.get("message")));
        }
    }

    /**
     * 获取收藏列表
     * GET /api/favorites?openid=xxx&exam_code=xxx
     */
    @GetMapping
    public ResponseEntity<?> getFavorites(
            @RequestParam String openid,
            @RequestParam(required = false) String exam_code,
            @RequestParam(required = false) String bank_code) {

        if (openid == null || openid.isEmpty()) {
            return ResponseEntity.status(400).body(ApiResult.fail("缺少必要参数 openid"));
        }

        // 兼容 bank_code 和 exam_code 两种参数名
        String examCode = exam_code != null && !exam_code.isEmpty() ? exam_code : bank_code;

        List<Map<String, Object>> favorites = favoritesService.getFavorites(openid, examCode);
        return ResponseEntity.ok(ApiResult.ok(favorites));
    }

    /**
     * 检查题目是否已收藏
     * GET /api/favorites/check?openid=xxx&exam_code=xxx&question_id=xxx
     */
    @GetMapping("/check")
    public ResponseEntity<?> checkFavorite(
            @RequestParam String openid,
            @RequestParam(required = false) String exam_code,
            @RequestParam(required = false) String bank_code,
            @RequestParam Long question_id) {

        // 兼容 bank_code 和 exam_code 两种参数名
        String examCode = exam_code != null && !exam_code.isEmpty() ? exam_code : bank_code;

        if (openid == null || openid.isEmpty() || examCode == null || examCode.isEmpty() || question_id == null) {
            return ResponseEntity.status(400).body(ApiResult.fail("缺少必要参数"));
        }

        boolean isFavorite = favoritesService.checkFavorite(openid, examCode, question_id);
        
        Map<String, Object> result = new HashMap<>();
        result.put("is_favorite", isFavorite);
        
        return ResponseEntity.ok(ApiResult.ok(result));
    }
}