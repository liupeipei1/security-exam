package com.exam.question.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * 文件实体- 将文件存储到数据 */
@Entity
@Deprecated
public class FileEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * 原始文件    */
    @Column(name = "original_filename", nullable = false)
    private String originalFilename;

    /**
     * 文件存储名（UUID    */
    @Column(name = "storage_filename", nullable = false, unique = true)
    private String storageFilename;

    /**
     * 文件内容（二进制数据    */
    @Lob
    @Column(name = "file_data", nullable = false, columnDefinition = "LONGBLOB")
    private byte[] fileData;

    /**
     * 文件大小（字节）
     */
    @Column(name = "size", nullable = false)
    private Long size;

    /**
     * 文件类型（MIME类型    */
    @Column(name = "content_type", nullable = false)
    private String contentType;

    /**
     * 创建时间
     */
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    /**
     * 文件状态（1:正常, 0:已删除）
     */
    @Column(name = "status", nullable = false)
    private Integer status = 1;

    public FileEntity() {
    }

    public FileEntity(String originalFilename, String storageFilename, byte[] fileData, 
                      Long size, String contentType) {
        this.originalFilename = originalFilename;
        this.storageFilename = storageFilename;
        this.fileData = fileData;
        this.size = size;
        this.contentType = contentType;
        this.createdAt = LocalDateTime.now();
        this.status = 1;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getOriginalFilename() {
        return originalFilename;
    }

    public void setOriginalFilename(String originalFilename) {
        this.originalFilename = originalFilename;
    }

    public String getStorageFilename() {
        return storageFilename;
    }

    public void setStorageFilename(String storageFilename) {
        this.storageFilename = storageFilename;
    }

    public byte[] getFileData() {
        return fileData;
    }

    public void setFileData(byte[] fileData) {
        this.fileData = fileData;
    }

    public Long getSize() {
        return size;
    }

    public void setSize(Long size) {
        this.size = size;
    }

    public String getContentType() {
        return contentType;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public Integer getStatus() {
        return status;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }
}
