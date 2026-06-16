package com.exam.question.repository;

import com.exam.question.entity.KnowledgePointsEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 知识要点数据访问接口
 */
@Repository
public interface KnowledgePointsRepository extends JpaRepository<KnowledgePointsEntity, Long> {

    /**
     * 根据考试代码查询知识要点列表
     * @param examCode 考试代码
     * @return 知识要点列表
     */
    List<KnowledgePointsEntity> findByExamCodeOrderBySortOrder(String examCode);

    /**
     * 获取所有知识要点列表
     * @return 知识要点列表
     */
    List<KnowledgePointsEntity> findAllByOrderByExamCodeAscSortOrderAsc();
}