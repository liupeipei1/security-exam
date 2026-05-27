package com.exam.question.repository;

import com.exam.question.entity.KnowledgePointsEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface KnowledgePointsRepository extends JpaRepository<KnowledgePointsEntity, Long> {

    List<KnowledgePointsEntity> findByBankCodeOrderBySortOrderAsc(String bankCode);
}