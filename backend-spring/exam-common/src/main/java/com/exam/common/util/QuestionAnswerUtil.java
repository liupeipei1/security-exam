package com.exam.common.util;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * 题目 options/answer 解析，与 Node 版 server.js 行为对齐。
 */
public final class QuestionAnswerUtil {

    private static final Pattern LETTER = Pattern.compile("^[A-Da-d]$");
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private QuestionAnswerUtil() {
    }

    @SuppressWarnings("unchecked")
    public static List<String> parseArrayString(Object raw) {
        if (raw == null) {
            return List.of();
        }
        if (raw instanceof List<?> list) {
            List<String> out = new ArrayList<>();
            for (Object o : list) {
                if (o != null) {
                    out.add(String.valueOf(o));
                }
            }
            return out;
        }
        String str = String.valueOf(raw).trim();
        if (str.isEmpty()) {
            return List.of();
        }
        try {
            Object parsed = MAPPER.readValue(str, Object.class);
            if (parsed instanceof List<?> list) {
                return parseArrayString(list);
            }
            if (parsed instanceof Map<?, ?> map) {
                return new ArrayList<>(map.values().stream().map(String::valueOf).toList());
            }
        } catch (Exception ignored) {
            // fall through
        }
        if (str.startsWith("[") && str.endsWith("]")) {
            String content = str.substring(1, str.length() - 1);
            if (content.isBlank()) {
                return List.of();
            }
            String[] parts = content.split(",");
            List<String> items = new ArrayList<>();
            for (String part : parts) {
                String trimmed = part.trim();
                if (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length() >= 2) {
                    items.add(trimmed.substring(1, trimmed.length() - 1));
                } else if (!trimmed.isEmpty()) {
                    items.add(trimmed.replace("\"", ""));
                }
            }
            return items;
        }
        return List.of(str);
    }

    @SuppressWarnings("unchecked")
    public static Map<String, Object> processQuestionRow(Map<String, Object> row) {
        Object optionsRaw = row.get("options");
        List<String> optionsArray;
        Map<String, String> optionsObject;

        if (optionsRaw instanceof Map<?, ?> map) {
            optionsObject = new LinkedHashMap<>();
            for (Map.Entry<?, ?> e : map.entrySet()) {
                optionsObject.put(String.valueOf(e.getKey()), String.valueOf(e.getValue()));
            }
            optionsArray = new ArrayList<>(optionsObject.values());
        } else {
            optionsObject = null;
            optionsArray = parseArrayString(optionsRaw);
        }

        List<String> answerArray = parseArrayString(row.get("answer"));
        String answerLetters = answerArray.stream()
                .map(text -> toLetter(text, optionsArray, optionsObject))
                .filter(s -> !s.isEmpty())
                .reduce("", String::concat);

        Map<String, Object> out = new LinkedHashMap<>(row);
        out.put("options", optionsArray);
        out.put("answer", answerLetters);
        return out;
    }

    private static String toLetter(String answerText, List<String> optionsArray, Map<String, String> optionsObject) {
        if (LETTER.matcher(answerText).matches()) {
            return answerText.toUpperCase();
        }
        int index = optionsArray.indexOf(answerText);
        if (index < 0 && optionsObject != null) {
            for (Map.Entry<String, String> e : optionsObject.entrySet()) {
                if (e.getKey().equals(answerText) || e.getValue().equals(answerText)) {
                    index = optionsArray.indexOf(e.getValue());
                    break;
                }
            }
        }
        return index >= 0 ? String.valueOf((char) ('A' + index)) : "";
    }
}
