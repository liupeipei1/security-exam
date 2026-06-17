package com.exam.usercenter.repository;

import com.exam.usercenter.entity.NoteEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 笔记Repository
 */
@Repository
public interface NoteRepository extends JpaRepository<NoteEntity, Long> {

    /**
     * 根据openid查询笔记列表
     */
    List<NoteEntity> findByOpenidOrderByCreatedAtDesc(String openid);

    /**
     * 根据openid和type查询笔记列表
     */
    List<NoteEntity> findByOpenidAndTypeOrderByCreatedAtDesc(String openid, String type);

    /**
     * 根据openid和id查询笔记
     */
    NoteEntity findByOpenidAndId(String openid, Long id);

    /**
     * 根据openid和id删除笔记
     */
    int deleteByOpenidAndId(String openid, Long id);
}
