package com.exam.common.repository;

import com.exam.common.entity.ExamConfigEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExamConfigRepository extends JpaRepository<ExamConfigEntity, String> {

    /**
     * 根据考试代码查找考试配置
     */
    Optional<ExamConfigEntity> findByExamCode(String examCode);

    /**
     * 检查考试代码是否存在
     */
    boolean existsByExamCode(String examCode);


    /**
     * 获取所有考试配置，按排序字段排序
     */
    List<ExamConfigEntity> findAllByOrderBySortOrderAsc();

    /**
     * 更新题库统计信息
     */
    @Modifying
    @Query("UPDATE ExamConfigEntity e SET e.totalQuestions = :total, e.singleCount = :singleCount, " +
           "e.multipleCount = :multipleCount, e.judgmentCount = :judgmentCount WHERE e.examCode = :examCode")
    void updateStats(String examCode, Integer total, Integer singleCount, Integer multipleCount, Integer judgmentCount);
}