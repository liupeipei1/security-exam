package com.exam.question.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "question_types")
public class QuestionType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "type_code", unique = true, nullable = false, length = 30)
    private String typeCode;

    @Column(name = "type_name", nullable = false, length = 50)
    private String typeName;

    @Column(name = "type_description", length = 200)
    private String typeDescription;

    @Column(name = "type_icon", length = 50)
    private String typeIcon;

    @Column(name = "sort_order")
    private Integer sortOrder = 0;

    @Column(name = "enabled")
    private Boolean enabled = true;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}