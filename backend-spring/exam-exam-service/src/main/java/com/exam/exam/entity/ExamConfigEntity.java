package com.exam.exam.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "exam_config")
public class ExamConfigEntity {

    @Id
    @Column(name = "exam_code", length = 50)
    private String examCode;

    @Column(name = "exam_name", nullable = false, length = 100)
    private String examName;

    @Column(name = "exam_description", length = 500)
    private String examDescription;

    @Column(name = "exam_desc_detail", columnDefinition = "TEXT")
    private String examDescDetail;

    @Column(length = 500)
    private String description;

    @Column(length = 255)
    private String icon;

    @Column(name = "table_name", nullable = false, length = 100)
    private String tableName;

    @Column(name = "total_questions")
    private Integer totalQuestions = 0;

    @Column(name = "judgment_count")
    private Integer judgmentCount = 0;

    @Column(name = "single_count")
    private Integer singleCount = 0;

    @Column(name = "multiple_count")
    private Integer multipleCount = 0;

    @Column(nullable = false)
    private Integer enabled = 1;

    @Column(name = "sort_order")
    private Integer sortOrder = 0;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public String getExamCode() {
        return examCode;
    }

    public void setExamCode(String examCode) {
        this.examCode = examCode;
    }

    public String getExamName() {
        return examName;
    }

    public void setExamName(String examName) {
        this.examName = examName;
    }

    public String getExamDescription() {
        return examDescription;
    }

    public void setExamDescription(String examDescription) {
        this.examDescription = examDescription;
    }

    public String getExamDescDetail() {
        return examDescDetail;
    }

    public void setExamDescDetail(String examDescDetail) {
        this.examDescDetail = examDescDetail;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getIcon() {
        return icon;
    }

    public void setIcon(String icon) {
        this.icon = icon;
    }

    public String getTableName() {
        return tableName;
    }

    public void setTableName(String tableName) {
        this.tableName = tableName;
    }

    public Integer getTotalQuestions() {
        return totalQuestions;
    }

    public void setTotalQuestions(Integer totalQuestions) {
        this.totalQuestions = totalQuestions;
    }

    public Integer getJudgmentCount() {
        return judgmentCount;
    }

    public void setJudgmentCount(Integer judgmentCount) {
        this.judgmentCount = judgmentCount;
    }

    public Integer getSingleCount() {
        return singleCount;
    }

    public void setSingleCount(Integer singleCount) {
        this.singleCount = singleCount;
    }

    public Integer getMultipleCount() {
        return multipleCount;
    }

    public void setMultipleCount(Integer multipleCount) {
        this.multipleCount = multipleCount;
    }

    public Integer getEnabled() {
        return enabled;
    }

    public void setEnabled(Integer enabled) {
        this.enabled = enabled;
    }

    public Integer getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(Integer sortOrder) {
        this.sortOrder = sortOrder;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}