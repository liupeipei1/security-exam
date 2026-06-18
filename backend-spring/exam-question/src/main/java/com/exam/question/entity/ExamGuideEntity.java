package com.exam.question.entity;

import com.alibaba.fastjson2.annotation.JSONField;
import jakarta.persistence.*;
import lombok.Data;

import java.util.Date;

/**
 * 考试指南实体类
 * 映射到数据库表 exam_guide
 */
@Entity
@Table(name = "exam_guide")
@Data
public class ExamGuideEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "exam_code", nullable = false, unique = true, length = 50)
    private String examCode;

    @Column(name = "title", nullable = false, length = 100)
    private String title;

    @Column(name = "exam_overview", columnDefinition = "TEXT")
    private String exam_overview;

    @Column(name = "exam_content", columnDefinition = "TEXT")
    private String exam_content;

    @Column(name = "question_type_distribution", columnDefinition = "TEXT")
    private String question_type_distribution;

    @Column(name = "preparation_tips", columnDefinition = "TEXT")
    private String preparation_tips;

    @Column(name = "content", columnDefinition = "LONGTEXT")
    private String content;

    @Column(name = "exam_tips", columnDefinition = "TEXT")
    private String exam_tips;

    @Column(name = "exam_duration")
    private Integer exam_duration;


    @Column(name = "total_score")
    private Integer total_score;

    @Column(name = "pass_score")
    private Integer pass_score;


    @Column(name = "enabled")
    private Integer enabled;

    @Column(name = "sort_order")
    private Integer sort_order;

    @Column(name = "created_at")
    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;

    @Column(name = "updated_at")
    @Temporal(TemporalType.TIMESTAMP)
    private Date updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = new Date();
        updatedAt = new Date();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = new Date();
    }

}