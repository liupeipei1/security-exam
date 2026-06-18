package com.exam.question.service;

import com.exam.question.entity.QuestionNotesEntity;
import com.exam.question.repository.QuestionNoteRepository;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class QuestionNoteService {

    private final QuestionNoteRepository questionNoteRepository;

    public QuestionNoteService(QuestionNoteRepository questionNoteRepository) {
        this.questionNoteRepository = questionNoteRepository;
    }

    /**
     * 保存或更新题目备注
     */
    public Map<String, Object> saveNote(String openid, Integer questionId, String examCode, String content) {
        Optional<QuestionNotesEntity> existing = questionNoteRepository.findByOpenidAndQuestionId(openid, questionId);
        
        QuestionNotesEntity note;
        if (existing.isPresent()) {
            note = existing.get();
            note.setNote(content);
            note.setExamCode(examCode);
        } else {
            note = new QuestionNotesEntity();
            note.setOpenid(openid);
            note.setQuestionId(questionId);
            note.setExamCode(examCode);
            note.setNote(content);
        }
        
        note = questionNoteRepository.save(note);
        return entityToMap(note);
    }

    /**
     * 获取题目备注
     */
    public Map<String, Object> getNote(String openid, Integer questionId) {
        Optional<QuestionNotesEntity> note = questionNoteRepository.findByOpenidAndQuestionId(openid, questionId);
        return note.map(this::entityToMap).orElse(null);
    }

    /**
     * 删除题目备注
     */
    public boolean deleteNote(String openid, Integer questionId) {
        if (questionNoteRepository.existsByOpenidAndQuestionId(openid, questionId)) {
            questionNoteRepository.deleteByOpenidAndQuestionId(openid, questionId);
            return true;
        }
        return false;
    }

    /**
     * 获取用户所有备注列表
     */
    public List<QuestionNotesEntity> getNotesByOpenid(String openid) {
        return questionNoteRepository.findByOpenid(openid);
    }

    /**
     * 获取用户指定题库的备注列表
     */
    public List<QuestionNotesEntity> getNotesByOpenidAndExamCode(String openid, String examCode) {
        return questionNoteRepository.findByOpenidAndExamCode(openid, examCode);
    }

    /**
     * 将实体转换为Map
     */
    private Map<String, Object> entityToMap(QuestionNotesEntity entity) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", entity.getId());
        map.put("openid", entity.getOpenid());
        map.put("question_id", entity.getQuestionId());
        map.put("exam_code", entity.getExamCode());
        map.put("content", entity.getNote());
        map.put("created_at", entity.getCreatedAt());
        map.put("updated_at", entity.getUpdatedAt());
        return map;
    }
}