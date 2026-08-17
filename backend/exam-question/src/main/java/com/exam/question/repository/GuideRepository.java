package com.exam.question.repository;

import com.exam.question.entity.ExamGuideEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 考试指南数据访问接口
 */
@Repository
public interface GuideRepository extends JpaRepository<ExamGuideEntity, Long> {

    /**
     * 根据考试代码查询指南
     */
    Optional<ExamGuideEntity> findByExamCode(String examCode);


    /**
     * 获取所有考试指南列表
     */
    List<ExamGuideEntity> findAll();

    /**
     * 检查考试代码是否已存在
     */
    boolean existsByExamCode(String examCode);
}