package com.exam.question.service;

import com.exam.question.entity.KnowledgePointsEntity;
import com.exam.question.repository.KnowledgePointsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 知识要点服务类
 * 提供知识要点相关的业务逻辑
 */
@Service
public class KnowledgeService {

    @Autowired
    private  KnowledgePointsRepository knowledgePointsRepository;


    /**
     * 根据考试代码获取知识要点列表
     * @param examCode 考试代码
     * @return 知识要点列表
     */
    public List<KnowledgePointsEntity> getKnowledgePointsByExamCode(String examCode) {
        if (examCode == null || examCode.trim().isEmpty()) {
            return knowledgePointsRepository.findAllByOrderByExamCodeAscSortOrderAsc();
        }
        return knowledgePointsRepository.findByExamCodeOrderBySortOrder(examCode);
    }

    /**
     * 获取所有知识要点列表
     * @return 知识要点列表
     */
    public List<KnowledgePointsEntity> getAllKnowledgePoints() {
        return knowledgePointsRepository.findAllByOrderByExamCodeAscSortOrderAsc();
    }
}