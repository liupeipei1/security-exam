package com.exam.question.repository;

import com.exam.question.entity.QuestionNotesEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 题目备注Repository
 */
@Repository
public interface QuestionNotesRepository extends JpaRepository<QuestionNotesEntity, Long> {

    /**
     * 根据openid和exam_code查询备注列表
     */
    List<QuestionNotesEntity> findByOpenidAndExamCode(String openid, String examCode);

    /**
     * 根据openid、exam_code和question_id查询备注
     */
    Optional<QuestionNotesEntity> findByOpenidAndExamCodeAndQuestionId(String openid, String examCode, Integer questionId);

    /**
     * 根据openid、exam_code和question_id删除备注
     */
    void deleteByOpenidAndExamCodeAndQuestionId(String openid, String examCode, Long questionId);
}