package com.exam.question.controller;

import com.exam.common.api.ApiResult;
import com.exam.question.service.BankService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/banks")
public class BankController {

    private final BankService bankService;

    public BankController(BankService bankService) {
        this.bankService = bankService;
    }

    @GetMapping
    public ApiResult<List<Map<String, Object>>> list() {
        return ApiResult.ok(bankService.listBanks());
    }

    @GetMapping("/{bankCode}")
    public ApiResult<Map<String, Object>> detail(@PathVariable String bankCode) {
        return bankService.getBank(bankCode)
                .map(ApiResult::ok)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "题库不存在"));
    }
}
