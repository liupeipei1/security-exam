package com.exam.question.service;

import com.exam.question.entity.QuestionNotesEntity;
import com.exam.question.repository.QuestionNotesRepository;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 笔记服务类
 */
@Service
public class NotesService {

    private final QuestionNotesRepository notesRepository;

    public NotesService(QuestionNotesRepository notesRepository) {
        this.notesRepository = notesRepository;
    }

    /**
     * 获取用户的题目备注列表
     *
     * @param openid     用户标识
     * @param examCode   题库代码
     * @param questionId 题目ID（可选）
     * @return 备注列表
     */
    public List<QuestionNotesEntity> getNotes(String openid, String examCode, Integer questionId) {
        if (questionId != null) {
            Optional<QuestionNotesEntity> note = notesRepository.findByOpenidAndExamCodeAndQuestionId(openid, examCode, questionId);
            return note.map(List::of).orElse(List.of());
        }
        return notesRepository.findByOpenidAndExamCode(openid, examCode);
    }

    /**
     * 保存或更新题目备注
     *
     * @param openid     用户标识
     * @param examCode   题库代码
     * @param questionId 题目ID
     * @param note       备注内容
     * @return 操作结果
     */
    public Map<String, Object> saveNote(String openid, String examCode, Integer questionId, String note) {
        Map<String, Object> result = new HashMap<>();

        Optional<QuestionNotesEntity> existing = notesRepository.findByOpenidAndExamCodeAndQuestionId(openid, examCode, questionId);

        if (existing.isPresent()) {
            if (note != null && !note.trim().isEmpty()) {
                // 更新备注
                QuestionNotesEntity entity = existing.get();
                entity.setNote(note);
                notesRepository.save(entity);
                result.put("success", true);
                result.put("message", "保存成功");
            } else {
                // 如果备注为空，删除记录
                notesRepository.delete(existing.get());
                result.put("success", true);
                result.put("message", "删除成功");
            }
        } else {
            if (note != null && !note.trim().isEmpty()) {
                // 插入新备注
                QuestionNotesEntity entity = new QuestionNotesEntity();
                entity.setOpenid(openid);
                entity.setExamCode(examCode);
                entity.setQuestionId(questionId);
                entity.setNote(note);
                notesRepository.save(entity);
                result.put("success", true);
                result.put("message", "保存成功");
            } else {
                result.put("success", true);
                result.put("message", "无操作");
            }
        }

        return result;
    }

    /**
     * 删除题目备注
     *
     * @param openid     用户标识
     * @param examCode   题库代码
     * @param questionId 题目ID
     */
    public void deleteNote(String openid, String examCode, Long questionId) {
        notesRepository.deleteByOpenidAndExamCodeAndQuestionId(openid, examCode, questionId);
    }
}