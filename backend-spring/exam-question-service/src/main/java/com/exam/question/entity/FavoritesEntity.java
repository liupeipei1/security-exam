package com.exam.question.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

/**
 * 收藏夹实体类
 */
@Entity
@Table(name = "favorites")
@Data
public class FavoritesEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "openid", nullable = false, length = 100)
    private String openid;

    @Column(name = "exam_code", nullable = false, length = 50)
    private String examCode;

    @Column(name = "question_id", nullable = false)
    private Long questionId;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}