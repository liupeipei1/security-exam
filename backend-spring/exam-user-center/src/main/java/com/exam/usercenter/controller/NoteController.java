package com.exam.usercenter.controller;

import com.exam.common.api.ApiResult;
import com.exam.common.security.JwtService;
import com.exam.usercenter.entity.NoteEntity;
import com.exam.usercenter.service.NoteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 笔记控制 */
@RestController
@RequestMapping("/api/notes")
public class NoteController {

    @Autowired
    private NoteService noteService;

    @Autowired
    private JwtService jwtService;

    /**
     * 获取用户笔记列表
     */
    @GetMapping
    public ApiResult<List<NoteEntity>> getNotes(
            @RequestHeader("Authorization") String token,
            @RequestParam(value = "type", required = false) String type) {
        String openid = jwtService.parseOpenid(token);
        return noteService.getNotes(openid, type);
    }

    /**
     * 获取单条笔记
     */
    @GetMapping("/{id}")
    public ApiResult<NoteEntity> getNote(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id) {
        String openid = jwtService.parseOpenid(token);
        return noteService.getNote(openid, id);
    }

    /**
     * 创建笔记
     */
    @PostMapping
    public ApiResult<NoteEntity> createNote(
            @RequestHeader("Authorization") String token,
            @RequestBody Map<String, Object> data) {
        String openid = jwtService.parseOpenid(token);
        return noteService.createNote(openid, data);
    }

    /**
     * 更新笔记
     */
    @PutMapping("/{id}")
    public ApiResult<NoteEntity> updateNote(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id,
            @RequestBody Map<String, Object> data) {
        String openid = jwtService.parseOpenid(token);
        return noteService.updateNote(openid, id, data);
    }

    /**
     * 删除笔记
     */
    @DeleteMapping("/{id}")
    public ApiResult<Void> deleteNote(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id) {
        String openid = jwtService.parseOpenid(token);
        return noteService.deleteNote(openid, id);
    }
}
