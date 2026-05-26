package com.exam.question.repository;

import com.exam.question.entity.QuestionNoteEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface QuestionNoteRepository extends JpaRepository<QuestionNoteEntity, Long> {

    List<QuestionNoteEntity> findByOpenid(String openid);

    List<QuestionNoteEntity> findByOpenidAndBankCode(String openid, String bankCode);

    Optional<QuestionNoteEntity> findByOpenidAndQuestionId(String openid, Integer questionId);

    boolean existsByOpenidAndQuestionId(String openid, Integer questionId);

    void deleteByOpenidAndQuestionId(String openid, Integer questionId);
}