package com.exam.usercenter.controller;

import com.exam.common.api.ApiResult;
import com.exam.common.entity.FavoritesEntity;
import com.exam.common.security.JwtService;
import com.exam.usercenter.service.FavoritesService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 收藏控制 */
@RestController
@RequestMapping("/api/favorites")
public class FavoritesController {

    @Autowired
    private FavoritesService favoritesService;

    @Autowired
    private JwtService jwtService;

    /**
     * 获取用户收藏列表
     */
    @GetMapping
    public ApiResult<List<FavoritesEntity>> getFavorites(
            @RequestHeader("Authorization") String token,
            @RequestParam(value = "exam_code", required = false) String examCode) {
        String openid = jwtService.parseOpenid(token);
        return favoritesService.getFavorites(openid, examCode);
    }

    /**
     * 检查是否已收藏
     */
    @GetMapping("/check")
    public ApiResult<Boolean> isFavorited(
            @RequestHeader("Authorization") String token,
            @RequestParam("exam_code") String examCode,
            @RequestParam("question_id") Long questionId) {
        String openid = jwtService.parseOpenid(token);
        return favoritesService.isFavorited(openid, examCode, questionId);
    }

    /**
     * 添加收藏
     */
    @PostMapping
    public ApiResult<FavoritesEntity> addFavorite(
            @RequestHeader("Authorization") String token,
            @RequestBody Map<String, Object> data) {
        String openid = jwtService.parseOpenid(token);
        String examCode = (String) data.get("exam_code");
        Long questionId = ((Number) data.get("question_id")).longValue();
        return favoritesService.addFavorite(openid, examCode, questionId);
    }

    /**
     * 取消收藏
     */
    @DeleteMapping
    public ApiResult<Void> removeFavorite(
            @RequestHeader("Authorization") String token,
            @RequestParam("exam_code") String examCode,
            @RequestParam("question_id") Long questionId) {
        String openid = jwtService.parseOpenid(token);
        return favoritesService.removeFavorite(openid, examCode, questionId);
    }

    /**
     * 批量取消收藏
     */
    @DeleteMapping("/batch")
    public ApiResult<Void> removeFavorites(
            @RequestHeader("Authorization") String token,
            @RequestBody Map<String, Object> data) {
        String openid = jwtService.parseOpenid(token);
        String examCode = (String) data.get("exam_code");
        List<Long> questionIds = ((List<Number>) data.get("question_ids")).stream()
                .map(Number::longValue)
                .toList();
        return favoritesService.removeFavorites(openid, examCode, questionIds);
    }
}
