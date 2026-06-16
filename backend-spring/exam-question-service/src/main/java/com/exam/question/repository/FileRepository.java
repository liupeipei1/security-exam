package com.exam.question.repository;

import com.exam.question.entity.FileEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * 文件数据访问接口
 */
@Repository
public interface FileRepository extends JpaRepository<FileEntity, Long> {

    /**
     * 根据存储文件名查找文 */
    Optional<FileEntity> findByStorageFilenameAndStatus(String storageFilename, Integer status);

    /**
     * 根据ID查找有效文件
     */
    Optional<FileEntity> findByIdAndStatus(Long id, Integer status);

    /**
     * 检查存储文件名是否存在
     */
    boolean existsByStorageFilename(String storageFilename);
}
