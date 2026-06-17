package com.exam.usercenter.service;

import com.exam.common.api.ApiResult;
import com.exam.common.entity.FavoritesEntity;
import com.exam.usercenter.repository.FavoritesRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 收藏服务
 */
@Service
public class FavoritesService {

    @Autowired
    private FavoritesRepository favoritesRepository;

    /**
     * 获取用户收藏列表
     */
    public ApiResult<List<FavoritesEntity>> getFavorites(String openid, String examCode) {
        List<FavoritesEntity> favorites;
        if (examCode != null && !examCode.isEmpty()) {
            favorites = favoritesRepository.findByOpenidAndExamCodeOrderByCreatedAtDesc(openid, examCode);
        } else {
            favorites = favoritesRepository.findByOpenidOrderByCreatedAtDesc(openid);
        }
        return ApiResult.ok(favorites);
    }

    /**
     * 检查是否已收藏
     */
    public ApiResult<Boolean> isFavorited(String openid, String examCode, Long questionId) {
        boolean exists = favoritesRepository.existsByOpenidAndExamCodeAndQuestionId(openid, examCode, questionId);
        return ApiResult.ok(exists);
    }

    /**
     * 添加收藏
     */
    @Transactional
    public ApiResult<FavoritesEntity> addFavorite(String openid, String examCode, Long questionId) {
        // 检查是否已收藏
        if (favoritesRepository.existsByOpenidAndExamCodeAndQuestionId(openid, examCode, questionId)) {
            return ApiResult.fail("已收藏");
        }

        FavoritesEntity favorite = new FavoritesEntity();
        favorite.setOpenid(openid);
        favorite.setExamCode(examCode);
        favorite.setQuestionId(questionId);

        FavoritesEntity saved = favoritesRepository.save(favorite);
        return ApiResult.ok(saved);
    }

    /**
     * 取消收藏
     */
    @Transactional
    public ApiResult<Void> removeFavorite(String openid, String examCode, Long questionId) {
        int deleted = favoritesRepository.deleteByOpenidAndExamCodeAndQuestionId(openid, examCode, questionId);
        if (deleted == 0) {
            return ApiResult.fail("收藏不存在");
        }
        return ApiResult.ok(null);
    }

    /**
     * 批量取消收藏
     */
    @Transactional
    public ApiResult<Void> removeFavorites(String openid, String examCode, List<Long> questionIds) {
        for (Long questionId : questionIds) {
            favoritesRepository.deleteByOpenidAndExamCodeAndQuestionId(openid, examCode, questionId);
        }
        return ApiResult.ok(null);
    }
}
