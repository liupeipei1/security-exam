package com.exam.question.service;

import com.exam.question.entity.QuestionNoteEntity;
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
        Optional<QuestionNoteEntity> existing = questionNoteRepository.findByOpenidAndQuestionId(openid, questionId);
        
        QuestionNoteEntity note;
        if (existing.isPresent()) {
            note = existing.get();
            note.setContent(content);
            note.setExamCode(examCode);
        } else {
            note = new QuestionNoteEntity();
            note.setOpenid(openid);
            note.setQuestionId(questionId);
            note.setExamCode(examCode);
            note.setContent(content);
        }
        
        note = questionNoteRepository.save(note);
        return entityToMap(note);
    }

    /**
     * 获取题目备注
     */
    public Map<String, Object> getNote(String openid, Integer questionId) {
        Optional<QuestionNoteEntity> note = questionNoteRepository.findByOpenidAndQuestionId(openid, questionId);
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
    public List<Map<String, Object>> getNotesByOpenid(String openid) {
        return questionNoteRepository.findByOpenid(openid)
                .stream()
                .map(this::entityToMap)
                .collect(Collectors.toList());
    }

    /**
     * 获取用户指定题库的备注列表
     */
    public List<Map<String, Object>> getNotesByOpenidAndExamCode(String openid, String examCode) {
        return questionNoteRepository.findByOpenidAndExamCode(openid, examCode)
                .stream()
                .map(this::entityToMap)
                .collect(Collectors.toList());
    }

    /**
     * 将实体转换为Map
     */
    private Map<String, Object> entityToMap(QuestionNoteEntity entity) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", entity.getId());
        map.put("openid", entity.getOpenid());
        map.put("question_id", entity.getQuestionId());
        map.put("exam_code", entity.getExamCode());
        map.put("content", entity.getContent());
        map.put("created_at", entity.getCreatedAt());
        map.put("updated_at", entity.getUpdatedAt());
        return map;
    }
}