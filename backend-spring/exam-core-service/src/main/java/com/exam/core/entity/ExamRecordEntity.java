package com.exam.core.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "exam_records")
@Data
public class ExamRecordEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String openid;

    @Column(name = "exam_code", nullable = false)
    private String examCode;

    @Column(name = "question_ids", length = 2000)
    private String questionIds;

    @Column(name = "user_answers", length = 2000)
    private String userAnswers;

    @Column(name = "correct_answers", length = 2000)
    private String correctAnswers;

    @Column
    private Integer score;

    @Column(name = "total_count")
    private Integer totalCount;

    @Column(name = "correct_count")
    private Integer correctCount;

    @Column(name = "start_time")
    private LocalDateTime startTime;

    @Column(name = "end_time")
    private LocalDateTime endTime;

    @Column
    private Integer duration;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}