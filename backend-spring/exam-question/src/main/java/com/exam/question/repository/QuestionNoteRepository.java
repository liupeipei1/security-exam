package com.exam.question.repository;

import com.exam.question.entity.QuestionNotesEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface QuestionNoteRepository extends JpaRepository<QuestionNotesEntity, Long> {

    List<QuestionNotesEntity> findByOpenid(String openid);

    List<QuestionNotesEntity> findByOpenidAndExamCode(String openid, String examCode);

    Optional<QuestionNotesEntity> findByOpenidAndQuestionId(String openid, Integer questionId);

    boolean existsByOpenidAndQuestionId(String openid, Integer questionId);

    void deleteByOpenidAndQuestionId(String openid, Integer questionId);
}