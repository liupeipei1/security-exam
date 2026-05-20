package com.exam.question.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "bank_config")
public class BankConfigEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "bank_code", nullable = false, unique = true, length = 50)
    private String bankCode;

    @Column(name = "bank_name", nullable = false, length = 100)
    private String bankName;

    @Column(name = "bank_description", length = 500)
    private String bankDescription;

    @Column(name = "bank_desc_detail", columnDefinition = "TEXT")
    private String bankDescDetail;

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

    private Boolean enabled;

    @Column(name = "sort_order")
    private Integer sortOrder;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getBankCode() {
        return bankCode;
    }

    public void setBankCode(String bankCode) {
        this.bankCode = bankCode;
    }

    public String getBankName() {
        return bankName;
    }

    public void setBankName(String bankName) {
        this.bankName = bankName;
    }

    public String getBankDescription() {
        return bankDescription;
    }

    public void setBankDescription(String bankDescription) {
        this.bankDescription = bankDescription;
    }

    public String getBankDescDetail() {
        return bankDescDetail;
    }

    public void setBankDescDetail(String bankDescDetail) {
        this.bankDescDetail = bankDescDetail;
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
