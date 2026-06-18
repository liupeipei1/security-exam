package com.exam.question.controller;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 考试指南响应 Schema
 */
@Data
@Schema(description = "考试指南响应信息")
public class GuideResponse {

    @Schema(description = "指南ID", example = "1")
    private Long id;

    @Schema(description = "考试代码", example = "banking_law")
    private String examCode;

    @Schema(description = "指南标题", example = "银行业法律法规与综合能力")
    private String title;

    @Schema(description = "考试概述")
    private String exam_overview;

    @Schema(description = "考试内容列表")
    private List<String> exam_content;

    @Schema(description = "题型分布")
    private List<Map<String, Object>> question_type_distribution;

    @Schema(description = "备考建议列表")
    private List<String> preparation_tips;

    @Schema(description = "详细内容（富文本）")
    private String content;

    @Schema(description = "考试技巧")
    private String exam_tips;

    @Schema(description = "考试时长（分钟）", example = "90")
    private Integer exam_duration;

    @Schema(description = "总分", example = "100")
    private Integer total_score;

    @Schema(description = "及格分数", example = "60")
    private Integer pass_score;

    @Schema(description = "是否启用：0-禁用，1-启用", example = "1")
    private Integer enabled;

    @Schema(description = "排序顺序", example = "0")
    private Integer sort_order;

    @Schema(description = "创建时间")
    private LocalDateTime createdAt;

    @Schema(description = "更新时间")
    private LocalDateTime updatedAt;
}
