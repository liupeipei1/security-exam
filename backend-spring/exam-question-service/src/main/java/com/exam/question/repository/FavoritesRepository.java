package com.exam.question.repository;

import com.exam.question.entity.FavoritesEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 收藏夹Repository
 */
@Repository
public interface FavoritesRepository extends JpaRepository<FavoritesEntity, Long> {

    /**
     * 根据openid和exam_code查询收藏列表
     */
    List<FavoritesEntity> findByOpenidAndExamCode(String openid, String examCode);

    /**
     * 根据openid查询所有收藏
     */
    List<FavoritesEntity> findByOpenid(String openid);

    /**
     * 根据openid、exam_code和question_id查询收藏
     */
    Optional<FavoritesEntity> findByOpenidAndExamCodeAndQuestionId(String openid, String examCode, Long questionId);

    /**
     * 根据openid、exam_code和question_id删除收藏
     */
    int deleteByOpenidAndExamCodeAndQuestionId(String openid, String examCode, Long questionId);

    /**
     * 检查是否已收藏
     */
    boolean existsByOpenidAndExamCodeAndQuestionId(String openid, String examCode, Long questionId);
}