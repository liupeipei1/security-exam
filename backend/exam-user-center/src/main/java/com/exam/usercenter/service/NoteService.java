package com.exam.usercenter.service;

import com.exam.common.api.ApiResult;
import com.exam.usercenter.entity.NoteEntity;
import com.exam.usercenter.repository.NoteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * 考试指南的备注 题库级别的 不是单个题的level
 */
@Service
@Deprecated
public class NoteService {

    @Autowired
    private NoteRepository noteRepository;

    /**
     * 获取用户笔记列表
     */
    public ApiResult<List<NoteEntity>> getNotes(String openid, String type) {
        List<NoteEntity> notes;
        if (type != null && !type.isEmpty()) {
            notes = noteRepository.findByOpenidAndTypeOrderByCreatedAtDesc(openid, type);
        } else {
            notes = noteRepository.findByOpenidOrderByCreatedAtDesc(openid);
        }
        return ApiResult.ok(notes);
    }

    /**
     * 获取单条笔记
     */
    public ApiResult<NoteEntity> getNote(String openid, Long id) {
        NoteEntity note = noteRepository.findByOpenidAndId(openid, id);
        if (note == null) {
            return ApiResult.fail("笔记不存在");
        }
        return ApiResult.ok(note);
    }

    /**
     * 创建笔记
     */
    @Transactional
    public ApiResult<NoteEntity> createNote(String openid, Map<String, Object> data) {
        String title = (String) data.get("title");
        String content = (String) data.get("content");
        String type = (String) data.get("type");

        if (title == null || title.isEmpty()) {
            return ApiResult.fail("标题不能为空");
        }

        NoteEntity note = new NoteEntity();
        note.setOpenid(openid);
        note.setTitle(title);
        note.setContent(content);
        note.setType(type);

        NoteEntity saved = noteRepository.save(note);
        return ApiResult.ok(saved);
    }

    /**
     * 更新笔记
     */
    @Transactional
    public ApiResult<NoteEntity> updateNote(String openid, Long id, Map<String, Object> data) {
        NoteEntity note = noteRepository.findByOpenidAndId(openid, id);
        if (note == null) {
            return ApiResult.fail("笔记不存在");
        }

        String title = (String) data.get("title");
        String content = (String) data.get("content");
        String type = (String) data.get("type");

        if (title != null) {
            note.setTitle(title);
        }
        if (content != null) {
            note.setContent(content);
        }
        if (type != null) {
            note.setType(type);
        }

        NoteEntity saved = noteRepository.save(note);
        return ApiResult.ok(saved);
    }

    /**
     * 删除笔记
     */
    @Transactional
    public ApiResult<Void> deleteNote(String openid, Long id) {
        int deleted = noteRepository.deleteByOpenidAndId(openid, id);
        if (deleted == 0) {
            return ApiResult.fail("笔记不存在");
        }
        return ApiResult.ok(null);
    }
}
