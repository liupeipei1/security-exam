package com.exam.core.repository;

import com.exam.core.entity.ExamRecordEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExamRecordRepository extends JpaRepository<ExamRecordEntity, Long> {

    List<ExamRecordEntity> findByOpenidOrderByCreatedAtDesc(String openid);

}