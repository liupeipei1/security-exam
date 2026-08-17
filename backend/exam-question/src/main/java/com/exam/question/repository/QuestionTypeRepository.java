package com.exam.question.repository;

import com.exam.question.entity.QuestionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuestionTypeRepository extends JpaRepository<QuestionType, Integer> {

    List<QuestionType> findByEnabledTrueOrderBySortOrder();
}