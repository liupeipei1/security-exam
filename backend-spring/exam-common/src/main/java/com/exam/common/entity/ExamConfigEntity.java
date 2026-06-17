package com.exam.common.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "exam_config")
public class ExamConfigEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "exam_code", nullable = false, unique = true, length = 50)
    private String examCode;

    @Column(name = "exam_name", nullable = false, length = 100)
    private String examName;

    @Column(name = "exam_description", length = 500)
    private String examDescription;

    @Column(name = "exam_desc_detail", columnDefinition = "TEXT")
    private String exam_desc_detail;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 20)
    private String icon;

    @Column(name = "table_name", nullable = false, length = 100)
    private String tableName;

    @Column(name = "total_questions")
    private Integer totalQuestions;

    @Column(name = "judgment_count")
    private Integer judgmentCount;

    @Column(name = "single_count")
    private Integer singleCount;

    @Column(name = "multiple_count")
    private Integer multipleCount;

    @Column(name = "enable")
    private Boolean enabled;

    @Column(name = "sort_order")
    private Integer sortOrder;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

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
        return exam_desc_detail;
    }

    public void setExamDescDetail(String exam_desc_detail) {
        this.exam_desc_detail = exam_desc_detail;
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

    public Boolean getEnabled() {
        return enabled;
    }

    public void setEnabled(Boolean enabled) {
        this.enabled = enabled;
    }

    public Integer getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(Integer sortOrder) {
        this.sortOrder = sortOrder;
    }
}
