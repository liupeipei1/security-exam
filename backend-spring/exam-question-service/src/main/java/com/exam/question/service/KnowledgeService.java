package com.exam.question.service;

import com.exam.question.entity.KnowledgePointsEntity;
import com.exam.question.repository.KnowledgePointsRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class KnowledgeService {

    private final KnowledgePointsRepository knowledgePointsRepository;

    public KnowledgeService(KnowledgePointsRepository knowledgePointsRepository) {
        this.knowledgePointsRepository = knowledgePointsRepository;
    }

    /**
     * 根据bank_code获取知识要点列表
     * @param bankCode 题库代码
     * @return 知识要点列表
     */
    public List<KnowledgePointsEntity> getKnowledgePoints(String bankCode) {
        return knowledgePointsRepository.findByBankCodeOrderBySortOrderAsc(bankCode);
    }
}