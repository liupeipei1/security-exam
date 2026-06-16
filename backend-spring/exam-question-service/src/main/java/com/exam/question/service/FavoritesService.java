package com.exam.question.service;

import com.exam.common.entity.FavoritesEntity;
import com.exam.question.repository.FavoritesRepository;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 收藏夹服务类
 */
@Service
public class FavoritesService {

    private final FavoritesRepository favoritesRepository;
    private final EntityManager entityManager;

    public FavoritesService(FavoritesRepository favoritesRepository, EntityManager entityManager) {
        this.favoritesRepository = favoritesRepository;
        this.entityManager = entityManager;
    }

    /**
     * 添加收藏
     *
     * @param openid     用户标识
     * @param examCode   题库代码
     * @param questionId 题目ID
     * @return 操作结果
     */
    @Transactional
    public Map<String, Object> addFavorite(String openid, String examCode, Long questionId) {
        Map<String, Object> result = new HashMap<>();
        
        try {
            // 检查是否已收藏
            if (favoritesRepository.existsByOpenidAndExamCodeAndQuestionId(openid, examCode, questionId)) {
                result.put("success", true);
                result.put("message", "已经收藏过");
                return result;
            }

            FavoritesEntity entity = new FavoritesEntity();
            entity.setOpenid(openid);
            entity.setExamCode(examCode);
            entity.setQuestionId(questionId);
            favoritesRepository.save(entity);

            result.put("success", true);
            result.put("message", "收藏成功");
        } catch (Exception e) {
            // 如果是唯一键冲突，说明已经收藏过
            if (e.getMessage() != null && e.getMessage().contains("Duplicate entry")) {
                result.put("success", true);
                result.put("message", "已经收藏过");
            } else {
                throw e;
            }
        }
        
        return result;
    }

    /**
     * 取消收藏
     *
     * @param openid     用户标识
     * @param examCode   题库代码
     * @param questionId 题目ID
     * @return 操作结果
     */
    @Transactional
    public Map<String, Object> removeFavorite(String openid, String examCode, Long questionId) {
        Map<String, Object> result = new HashMap<>();
        
        int deleted = favoritesRepository.deleteByOpenidAndExamCodeAndQuestionId(openid, examCode, questionId);
        
        if (deleted > 0) {
            result.put("success", true);
            result.put("message", "取消收藏成功");
        } else {
            result.put("success", true);
            result.put("message", "未找到收藏记录");
        }
        
        return result;
    }

    /**
     * 获取收藏列表
     *
     * @param openid   用户标识
     * @param examCode 题库代码（可选）
     * @return 收藏的题目列表
     */
    public List<Map<String, Object>> getFavorites(String openid, String examCode) {
        List<FavoritesEntity> favorites;
        
        if (examCode != null && !examCode.isEmpty()) {
            favorites = favoritesRepository.findByOpenidAndExamCode(openid, examCode);
        } else {
            favorites = favoritesRepository.findByOpenid(openid);
        }
        
        List<Map<String, Object>> result = new ArrayList<>();
        
        for (FavoritesEntity favorite : favorites) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", favorite.getId());
            item.put("openid", favorite.getOpenid());
            item.put("exam_code", favorite.getExamCode());
            item.put("question_id", favorite.getQuestionId());
            item.put("created_at", favorite.getCreatedAt());
            item.put("is_favorite", true);
            result.add(item);
        }
        
        return result;
    }

    /**
     * 检查题目是否已收藏
     *
     * @param openid     用户标识
     * @param examCode   题库代码
     * @param questionId 题目ID
     * @return 是否已收藏
     */
    public boolean checkFavorite(String openid, String examCode, Long questionId) {
        return favoritesRepository.existsByOpenidAndExamCodeAndQuestionId(openid, examCode, questionId);
    }
}