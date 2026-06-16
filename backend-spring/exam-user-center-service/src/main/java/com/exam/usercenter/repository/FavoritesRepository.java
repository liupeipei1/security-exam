package com.exam.usercenter.repository;

import com.exam.common.entity.FavoritesEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 收藏Repository
 */
@Repository
public interface FavoritesRepository extends JpaRepository<FavoritesEntity, Long> {

    /**
     * 根据openid和exam_code查询收藏列表
     */
    List<FavoritesEntity> findByOpenidAndExamCodeOrderByCreatedAtDesc(String openid, String examCode);

    /**
     * 根据openid查询所有收藏    */
    List<FavoritesEntity> findByOpenidOrderByCreatedAtDesc(String openid);

    /**
     * 检查是否已收藏
     */
    boolean existsByOpenidAndExamCodeAndQuestionId(String openid, String examCode, Long questionId);

    /**
     * 根据openid、exam_code和question_id删除收藏
     */
    int deleteByOpenidAndExamCodeAndQuestionId(String openid, String examCode, Long questionId);

    /**
     * 根据openid和question_id删除收藏
     */
    int deleteByOpenidAndQuestionId(String openid, Long questionId);

    /**
     * 根据openid和exam_code删除收藏
     */
    int deleteByOpenidAndExamCode(String openid, String examCode);
}
