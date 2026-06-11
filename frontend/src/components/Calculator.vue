<template>
    <div class="calculator-container" :class="{ 'collapsed': !isExpanded }">
        <!-- 标题栏 - 可点击收缩/展开 -->
        <div class="calculator-toggle" @click="toggleExpand">
            <span class="toggle-icon">{{ isExpanded ? '▼' : '▶' }}</span>
            <span class="calculator-icon">🧮</span>
            <span class="calculator-title">计算器</span>
            <button v-if="history.length > 0" class="clear-history-btn" @click.stop="clearHistory">清除历史</button>
        </div>
        
        <!-- 计算器主体 -->
        <div v-show="isExpanded" class="calculator-content">
            <!-- 历史记录 -->
            <div v-if="history.length > 0" class="history-panel">
                <div class="history-title">📜 历史记录</div>
                <div class="history-list">
                    <div v-for="(item, index) in history" :key="index" class="history-item">
                        <span class="history-expression">{{ item.expression }}</span>
                        <span class="history-result">{{ item.result }}</span>
                    </div>
                </div>
            </div>
            
            <!-- 显示区域 -->
            <div class="calculator-display">
                <div v-if="currentExpression" class="display-expression">{{ currentExpression }}</div>
                <div class="display-value">{{ display }}</div>
            </div>
            
            <!-- 按钮区域 -->
            <div class="calculator-buttons">
                <button 
                    v-for="btn in buttons" 
                    :key="btn.value"
                    :class="['calc-btn', btn.class]"
                    @click="handleButtonClick(btn.value)"
                >
                    {{ btn.label }}
                </button>
            </div>

            <!-- 债券收益率计算器 -->
            <div class="bond-calculator">
                <div class="bond-header">
                    <span class="bond-icon">📈</span>
                    <span class="bond-title">债券收益率计算</span>
                </div>
                
                <div class="bond-form">
                    <div class="form-row">
                        <label>面值（元）</label>
                        <input v-model.number="bondParams.faceValue" type="number" placeholder="100" />
                    </div>
                    <div class="form-row">
                        <label>票面利率（%）</label>
                        <input v-model.number="bondParams.couponRate" type="number" step="0.1" placeholder="5" />
                    </div>
                    <div class="form-row">
                        <label>买入价格（元）</label>
                        <input v-model.number="bondParams.price" type="number" step="0.01" placeholder="101" />
                    </div>
                    <div class="form-row">
                        <label>剩余期限（年）</label>
                        <input v-model.number="bondParams.years" type="number" step="0.5" placeholder="1" />
                    </div>
                    
                    <button class="calc-bond-btn" @click="calculateBondYield">计算收益率</button>
                    
                    <div v-if="bondResult" class="bond-result">
                        <div class="result-label">持有到期收益率</div>
                        <div class="result-value">{{ bondResult }}%</div>
                    </div>
                </div>
            </div>
            
            <!-- 理财计算器 -->
            <div class="finance-calculator">
                <div class="finance-header">
                    <span class="finance-icon">💰</span>
                    <span class="finance-title">理财计算器</span>
                </div>
                
                <!-- 选项卡 -->
                <div class="finance-tabs">
                    <button 
                        :class="['finance-tab', { active: financeTab === 'compound' }]" 
                        @click="financeTab = 'compound'"
                    >
                        💰 复利计算
                    </button>
                    <button 
                        :class="['finance-tab', { active: financeTab === 'loan' }]" 
                        @click="financeTab = 'loan'"
                    >
                        🏠 贷款计算
                    </button>
                    <button 
                        :class="['finance-tab', { active: financeTab === 'tvm' }]" 
                        @click="financeTab = 'tvm'"
                    >
                        📊 TVM计算
                    </button>
                    <button 
                        :class="['finance-tab', { active: financeTab === 'deposit' }]" 
                        @click="financeTab = 'deposit'"
                    >
                        💵 存款计算
                    </button>
                </div>
                
                <!-- 复利计算面板 -->
                <div v-show="financeTab === 'compound'" class="finance-panel">
                    <div class="finance-form">
                        <div class="form-row">
                            <label>本金（元）</label>
                            <input v-model.number="compoundParams.principal" type="number" placeholder="10000" />
                        </div>
                        <div class="form-row">
                            <label>年利率（%）</label>
                            <input v-model.number="compoundParams.rate" type="number" step="0.01" placeholder="5" />
                        </div>
                        <div class="form-row">
                            <label>投资年限（年）</label>
                            <input v-model.number="compoundParams.years" type="number" step="1" placeholder="5" />
                        </div>
                        <div class="form-row">
                            <label>每年复利次数</label>
                            <select v-model.number="compoundParams.compoundTimes">
                                <option :value="1">每年一次</option>
                                <option :value="2">每半年一次</option>
                                <option :value="4">每季度一次</option>
                                <option :value="12">每月一次</option>
                                <option :value="365">每日一次</option>
                            </select>
                        </div>
                        
                        <button class="finance-calc-btn" @click="calculateCompound">计算复利</button>
                        
                        <div v-if="compoundResult" class="finance-result">
                            <div class="result-row">
                                <span>本金</span>
                                <span class="result-num">¥{{ compoundResult.principal }}</span>
                            </div>
                            <div class="result-row">
                                <span>利息</span>
                                <span class="result-num profit">¥{{ compoundResult.interest }}</span>
                            </div>
                            <div class="result-row total">
                                <span>本息合计</span>
                                <span class="result-num">¥{{ compoundResult.amount }}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 贷款计算面板 -->
                <div v-show="financeTab === 'loan'" class="finance-panel">
                    <div class="finance-form">
                        <div class="form-row">
                            <label>贷款金额（元）</label>
                            <input v-model.number="loanParams.amount" type="number" placeholder="1000000" />
                        </div>
                        <div class="form-row">
                            <label>年利率（%）</label>
                            <input v-model.number="loanParams.rate" type="number" step="0.01" placeholder="4.2" />
                        </div>
                        <div class="form-row">
                            <label>贷款年限（年）</label>
                            <input v-model.number="loanParams.years" type="number" step="1" placeholder="30" />
                        </div>
                        <div class="form-row">
                            <label>还款方式</label>
                            <select v-model="loanParams.type">
                                <option value="equalPayment">等额本息</option>
                                <option value="equalPrincipal">等额本金</option>
                            </select>
                        </div>
                        
                        <button class="finance-calc-btn" @click="calculateLoan">计算贷款</button>
                        
                        <div v-if="loanResult" class="finance-result">
                            <div class="result-row">
                                <span>还款方式</span>
                                <span class="result-num">{{ loanResult.type }}</span>
                            </div>
                            <div v-if="loanResult.monthlyPayment" class="result-row">
                                <span>月供</span>
                                <span class="result-num">¥{{ loanResult.monthlyPayment }}</span>
                            </div>
                            <div v-if="loanResult.firstMonthPayment" class="result-row">
                                <span>首月月供</span>
                                <span class="result-num">¥{{ loanResult.firstMonthPayment }}</span>
                            </div>
                            <div v-if="loanResult.monthlyPrincipal" class="result-row">
                                <span>每月本金</span>
                                <span class="result-num">¥{{ loanResult.monthlyPrincipal }}</span>
                            </div>
                            <div class="result-row">
                                <span>总利息</span>
                                <span class="result-num profit">¥{{ loanResult.totalInterest }}</span>
                            </div>
                            <div class="result-row total">
                                <span>还款总额</span>
                                <span class="result-num">¥{{ loanResult.totalPayment }}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 存款计算面板 -->
                <div v-show="financeTab === 'deposit'" class="finance-panel">
                    <div class="finance-form">
                        <div class="form-row">
                            <label>存款金额（元）</label>
                            <input v-model.number="depositParams.principal" type="number" placeholder="10000" />
                        </div>
                        <div class="form-row">
                            <label>年利率（%）</label>
                            <input v-model.number="depositParams.rate" type="number" step="0.01" placeholder="2.5" />
                        </div>
                        <div class="form-row">
                            <label>存款年限（年）</label>
                            <input v-model.number="depositParams.years" type="number" step="1" placeholder="3" />
                        </div>
                        
                        <button class="finance-calc-btn" @click="calculateDeposit">计算利息</button>
                        
                        <div v-if="depositResult" class="finance-result">
                            <div class="result-row">
                                <span>本金</span>
                                <span class="result-num">¥{{ depositResult.principal }}</span>
                            </div>
                            <div class="result-row">
                                <span>利息</span>
                                <span class="result-num profit">¥{{ depositResult.interest }}</span>
                            </div>
                            <div class="result-row total">
                                <span>本息合计</span>
                                <span class="result-num">¥{{ depositResult.amount }}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- TVM理财计算器 -->
                <div v-show="financeTab === 'tvm'" class="finance-panel">
                    <div class="finance-form">
                        <h3 style="text-align: center; color: #e85d04; margin-bottom: 15px;">理财计算器</h3>
                        
                        <!-- 利率输入 -->
                        <div class="form-row">
                            <label>利率 (%) R(年利率或者月利率)</label>
                            <input type="number" v-model.number="tvmParams.rate" placeholder="利率" />
                        </div>
                        
                        <!-- 期数输入 -->
                         <div class="form-row">
                             <label>
                                 <input type="checkbox" v-model="tvmEnabled.periods" />
                                 期数 N（年或者月数）
                             </label>
                             <input type="number" v-model.number="tvmParams.periods" placeholder="期数" :disabled="!tvmEnabled.periods" />
                         </div>
                         
                         <!-- 现值输入 -->
                         <div class="form-row">
                             <label>
                                 <input type="checkbox" v-model="tvmEnabled.pv" />
                                 现值 PV
                             </label>
                             <input type="number" v-model.number="tvmParams.pv" placeholder="现值" :disabled="!tvmEnabled.pv" />
                         </div>
                         
                         <!-- 终值输入 -->
                         <div class="form-row">
                             <label>
                                 <input type="checkbox" v-model="tvmEnabled.fv" />
                                 终值 FV
                             </label>
                             <input type="number" v-model.number="tvmParams.fv" placeholder="终值" :disabled="!tvmEnabled.fv" />
                         </div>
                         
                         <!-- 每期付款额输入 -->
                         <div class="form-row">
                             <label>
                                 <input type="checkbox" v-model="tvmEnabled.pmt" />
                                 每期付款额 PMT（年或者月付款额）
                             </label>
                             <input type="number" v-model.number="tvmParams.pmt" placeholder="每期付款额" :disabled="!tvmEnabled.pmt" />
                         </div>
                        
                        <!-- 期初/期末选择 -->
                        <div class="form-row payment-type">
                            <span>付款方式:</span>
                            <label>
                                <input type="radio" v-model.number="tvmParams.type" :value="1" />
                                期初 T
                            </label>
                            <label>
                                <input type="radio" v-model.number="tvmParams.type" :value="0" />
                                期末 T
                            </label>
                        </div>
                        
                        <!-- 计算结果 -->
                        <div class="finance-result" v-if="tvmResult">
                            <div class="result-row">
                                <span>{{ tvmResult.label }}</span>
                                <span class="result-num">{{ tvmResult.value }}</span>
                            </div>
                        </div>
                        
                        <!-- 按钮 -->
                        <div style="display: flex; gap: 8px; margin-top: 10px;">
                            <button class="finance-calc-btn" style="flex: 1; background: #95a5a6;" @click="clearTVM">清空</button>
                            <button class="finance-calc-btn" style="flex: 1;" @click="calculateTVM">计算</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'Calculator',
    data() {
        return {
            isExpanded: true,
            display: '0',
            previousValue: null,
            operator: null,
            shouldResetDisplay: false,
            currentExpression: '',
            history: [],
            
            buttons: [
                { label: 'C', value: 'clear', class: 'btn-clear' },
                { label: '±', value: 'negate', class: 'btn-operator' },
                { label: '%', value: 'percent', class: 'btn-operator' },
                { label: '÷', value: '/', class: 'btn-operator' },
                { label: '7', value: '7', class: 'btn-number' },
                { label: '8', value: '8', class: 'btn-number' },
                { label: '9', value: '9', class: 'btn-number' },
                { label: '×', value: '*', class: 'btn-operator' },
                { label: '4', value: '4', class: 'btn-number' },
                { label: '5', value: '5', class: 'btn-number' },
                { label: '6', value: '6', class: 'btn-number' },
                { label: '-', value: '-', class: 'btn-operator' },
                { label: '1', value: '1', class: 'btn-number' },
                { label: '2', value: '2', class: 'btn-number' },
                { label: '3', value: '3', class: 'btn-number' },
                { label: '+', value: '+', class: 'btn-operator' },
                { label: '0', value: '0', class: 'btn-number btn-zero' },
                { label: '.', value: '.', class: 'btn-number' },
                { label: '=', value: '=', class: 'btn-equals' },
            ],
            
            bondParams: {
                faceValue: 100,
                couponRate: 5,
                price: 101,
                years: 1
            },
            bondResult: null,
            
            // 理财计算器参数
            financeTab: 'tvm', // compound, loan, tvm, deposit
            
            // 复利计算参数
            compoundParams: {
                principal: 10000,
                rate: 5,
                years: 5,
                compoundTimes: 12
            },
            compoundResult: null,
            
            // 贷款计算参数
            loanParams: {
                amount: 1000000,
                rate: 4.2,
                years: 30,
                type: 'equalPayment' // equalPayment: 等额本息, equalPrincipal: 等额本金
            },
            loanResult: null,
            
            // 存款计算参数
            depositParams: {
                principal: 10000,
                rate: 2.5,
                years: 3
            },
            depositResult: null,
            
            // TVM计算器参数
            tvmParams: {
                rate: null,      // 利率 (%)
                periods: null,   // 期数
                pv: null,        // 现值
                fv: null,        // 终值
                pmt: null,       // 每期付款额
                type: 0          // 0: 期末付款, 1: 期初付款
            },
            tvmEnabled: {        // 追踪哪些参数被勾选启用
                rate: true,      // 利率默认启用
                periods: false,
                pv: false,
                fv: false,
                pmt: false
            },
            tvmResult: null
        }
    },
    methods: {
        toggleExpand() {
            this.isExpanded = !this.isExpanded;
        },
        
        handleButtonClick(value) {
            if (value === 'clear') {
                this.clear();
            } else if (value === 'negate') {
                this.negate();
            } else if (value === 'percent') {
                this.percent();
            } else if (['+', '-', '*', '/'].includes(value)) {
                this.setOperator(value);
            } else if (value === '=') {
                this.calculate();
            } else if (value === '.') {
                this.addDecimal();
            } else {
                this.addNumber(value);
            }
        },
        
        clear() {
            this.display = '0';
            this.previousValue = null;
            this.operator = null;
            this.shouldResetDisplay = false;
            this.currentExpression = '';
        },
        
        clearHistory() {
            this.history = [];
        },
        
        negate() {
            if (this.display !== '0') {
                this.display = this.display.startsWith('-') ? this.display.slice(1) : '-' + this.display;
            }
        },
        
        percent() {
            this.display = (parseFloat(this.display) / 100).toString();
        },
        
        setOperator(op) {
            if (this.previousValue === null) {
                this.previousValue = parseFloat(this.display);
                this.currentExpression = this.display + ' ' + op;
            } else if (this.operator !== null && !this.shouldResetDisplay) {
                this.calculate();
                this.previousValue = parseFloat(this.display);
                this.currentExpression = this.display + ' ' + op;
            } else {
                this.currentExpression = this.previousValue + ' ' + op;
            }
            this.operator = op;
            this.shouldResetDisplay = true;
        },
        
        calculate() {
            if (this.previousValue === null || this.operator === null) return;
            
            const currentValue = parseFloat(this.display);
            let result;
            
            switch (this.operator) {
                case '+':
                    result = this.previousValue + currentValue;
                    break;
                case '-':
                    result = this.previousValue - currentValue;
                    break;
                case '*':
                    result = this.previousValue * currentValue;
                    break;
                case '/':
                    result = this.previousValue / currentValue;
                    break;
                default:
                    return;
            }
            
            // 添加到历史记录
            const expression = this.currentExpression + ' ' + currentValue;
            this.history.unshift({
                expression: expression,
                result: result.toString()
            });
            
            // 只保留最近10条历史
            if (this.history.length > 10) {
                this.history.pop();
            }
            
            this.display = result.toString();
            this.previousValue = null;
            this.operator = null;
            this.shouldResetDisplay = true;
            this.currentExpression = '';
        },
        
        addDecimal() {
            if (!this.display.includes('.')) {
                this.display += '.';
            }
        },
        
        addNumber(num) {
            if (this.shouldResetDisplay) {
                this.display = num;
                this.shouldResetDisplay = false;
            } else {
                this.display = this.display === '0' ? num : this.display + num;
            }
        },
        
        calculateBondYield() {
            const { faceValue, couponRate, price, years } = this.bondParams;
            
            if (!faceValue || !couponRate || !price || !years) {
                alert('请填写完整的债券参数');
                return;
            }
            
            // 简化的债券收益率计算公式
            const annualCoupon = faceValue * (couponRate / 100);
            const yieldToMaturity = ((annualCoupon + (faceValue - price) / years) / price * 100).toFixed(4);
            
            this.bondResult = yieldToMaturity;
        },
        
        // 复利计算
        calculateCompound() {
            const { principal, rate, years, compoundTimes } = this.compoundParams;
            
            if (!principal || !rate || !years || !compoundTimes) {
                alert('请填写完整的复利参数');
                return;
            }
            
            // 复利公式: A = P(1 + r/n)^(nt)
            const r = rate / 100;
            const n = compoundTimes;
            const t = years;
            
            const amount = principal * Math.pow(1 + r / n, n * t);
            const interest = amount - principal;
            
            this.compoundResult = {
                amount: amount.toFixed(2),
                interest: interest.toFixed(2),
                principal: principal.toFixed(2)
            };
        },
        
        // 贷款计算
        calculateLoan() {
            const { amount, rate, years, type } = this.loanParams;
            
            if (!amount || !rate || !years) {
                alert('请填写完整的贷款参数');
                return;
            }
            
            const monthlyRate = rate / 100 / 12;
            const months = years * 12;
            
            if (type === 'equalPayment') {
                // 等额本息
                const monthlyPayment = amount * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1);
                const totalPayment = monthlyPayment * months;
                const totalInterest = totalPayment - amount;
                
                this.loanResult = {
                    monthlyPayment: monthlyPayment.toFixed(2),
                    totalPayment: totalPayment.toFixed(2),
                    totalInterest: totalInterest.toFixed(2),
                    type: '等额本息'
                };
            } else {
                // 等额本金
                const monthlyPrincipal = amount / months;
                let totalInterest = 0;
                for (let i = 0; i < months; i++) {
                    totalInterest += (amount - monthlyPrincipal * i) * monthlyRate;
                }
                const totalPayment = amount + totalInterest;
                const firstMonthPayment = (monthlyPrincipal + amount * monthlyRate).toFixed(2);
                
                this.loanResult = {
                    firstMonthPayment: firstMonthPayment,
                    monthlyPrincipal: monthlyPrincipal.toFixed(2),
                    totalPayment: totalPayment.toFixed(2),
                    totalInterest: totalInterest.toFixed(2),
                    type: '等额本金'
                };
            }
        },
        
        // 存款利息计算
        calculateDeposit() {
            const { principal, rate, years } = this.depositParams;
            
            if (!principal || !rate || !years) {
                alert('请填写完整的存款参数');
                return;
            }
            
            // 单利计算（定期存款通常按单利）
            const interest = principal * (rate / 100) * years;
            const amount = principal + interest;
            
            this.depositResult = {
                amount: amount.toFixed(2),
                interest: interest.toFixed(2),
                principal: principal.toFixed(2)
            };
        },
        
        // TVM计算器 - 计算未知值
        calculateTVM() {
            const { rate, periods, pv, fv, pmt, type } = this.tvmParams;
            const { rate: rateEnabled, periods: periodsEnabled, pv: pvEnabled, fv: fvEnabled, pmt: pmtEnabled } = this.tvmEnabled;
            
            // 检查有多少个参数被启用（勾选）
            const enabledCount = [rateEnabled, periodsEnabled, pvEnabled, fvEnabled, pmtEnabled].filter(v => v).length;
            
            if (enabledCount !== 4) {
                alert('请确保勾选且仅勾选4个参数（留下1个未勾选作为待计算项）');
                return;
            }
            
            // 检查已启用的参数是否都有值
            if (rateEnabled && (rate === null || rate === undefined || rate === '')) {
                alert('利率已勾选但未填写数值');
                return;
            }
            if (periodsEnabled && (periods === null || periods === undefined || periods === '')) {
                alert('期数已勾选但未填写数值');
                return;
            }
            if (pvEnabled && (pv === null || pv === undefined || pv === '')) {
                alert('现值已勾选但未填写数值');
                return;
            }
            if (fvEnabled && (fv === null || fv === undefined || fv === '')) {
                alert('终值已勾选但未填写数值');
                return;
            }
            if (pmtEnabled && (pmt === null || pmt === undefined || pmt === '')) {
                alert('每期付款额已勾选但未填写数值');
                return;
            }
            
            const r = rate ? rate / 100 : 0; // 将年利率转换为月利率（每期利率）
            const n = periods || 0;
            const pvVal = pv || 0;
            const fvVal = fv || 0;
            const pmtVal = pmt || 0;
            const t = type || 0;
            
            let result = null;
            let resultLabel = '';
            
            if (!rateEnabled) {
                // 计算利率
                result = this.calculateRate(n, pvVal, fvVal, pmtVal, t);
                resultLabel = '利率R';
            } else if (!periodsEnabled) {
                // 计算期数
                result = this.calculatePeriods(r, pvVal, fvVal, pmtVal, t);
                resultLabel = '期数n';
            } else if (!pvEnabled) {
                // 计算现值
                result = this.calculatePV(r, n, fvVal, pmtVal, t);
                resultLabel = '现值PV';
            } else if (!fvEnabled) {
                // 计算终值
                result = this.calculateFV(r, n, pvVal, pmtVal, t);
                resultLabel = '终值FV';
            } else if (!pmtEnabled) {
                // 计算每期付款额
                result = this.calculatePMT(r, n, pvVal, fvVal, t);
                resultLabel = '每期付款额PMT';
            }
            
            this.tvmResult = {
                value: result !== null ? result.toFixed(4) : '计算失败',
                label: resultLabel
            };
        },
        
        // 计算利率（牛顿迭代法）
        calculateRate(n, pv, fv, pmt, type) {
            let rate = 0.01; // 初始猜测
            const tolerance = 0.0000001;
            const maxIterations = 100;
            
            for (let i = 0; i < maxIterations; i++) {
                const pvCalc = this.calculatePV(rate, n, fv, pmt, type);
                const diff = pvCalc - pv;
                
                if (Math.abs(diff) < tolerance) break;
                
                // 数值微分计算导数
                const delta = 0.00001;
                const pvPlus = this.calculatePV(rate + delta, n, fv, pmt, type);
                const derivative = (pvPlus - pvCalc) / delta;
                
                rate -= diff / derivative;
            }
            
            return rate * 12 * 100; // 转换为年利率百分比
        },
        
        // 计算期数
        calculatePeriods(r, pv, fv, pmt, type) {
            if (r === 0) {
                // 零利率情况
                const total = pmt * (1 + type) - fv;
                if (total === 0) return 0;
                return -pv / total;
            }
            
            const pvIf = type === 1 ? pmt * (1 + r) / r : 0;
            const numerator = Math.log((pmt * (1 + r * type) - fv * r) / (pv * r + pmt * (1 + r * type)));
            const denominator = Math.log(1 + r);
            
            return numerator / denominator;
        },
        
        // 计算现值 VM 现值公式应该是： PV = PMT × (1 - (1+r)^(-n))/r - FV/(1+r)^n
        calculatePV(r, n, fv, pmt, type) {
            if (r === 0) {
                return -fv - pmt * n * (1 + type);
            }
            
            const discount = Math.pow(1 + r, n);
            const pmtFactor = pmt * (1 + r * type) * (1 - 1/discount) / r;
            
            return -fv / discount + pmtFactor;
        },
        
        // 计算终值
        calculateFV(r, n, pv, pmt, type) {
            if (r === 0) {
                return -pv - pmt * n * (1 + type);
            }
            
            const discount = Math.pow(1 + r, n);
            const pmtFactor = pmt * (1 + r * type) * (discount - 1) / r;
            
            return -pv * discount - pmtFactor;
        },
        
        // 计算每期付款额
        calculatePMT(r, n, pv, fv, type) {
            if (r === 0) {
                return -(pv + fv) / n;
            }
            
            const discount = Math.pow(1 + r, n);
            return -(pv * r * discount + fv * r) / ((1 + r * type) * (discount - 1));
        },
        
        // 清空TVM参数
        clearTVM() {
            this.tvmParams = {
                rate: null,
                periods: null,
                pv: null,
                fv: null,
                pmt: null,
                type: 0
            };
            this.tvmEnabled = {
                rate: true,
                periods: false,
                pv: false,
                fv: false,
                pmt: false
            };
            this.tvmResult = null;
        }
    }
}
</script>

<style scoped>
.calculator-container {
    width: 400px;
    max-height: calc(100vh - 60px);
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    overflow: hidden;
    border: 2px solid #4a90d9;
    position: fixed;
    right: 20px;
    top: 20px;
    bottom: 20px;
    transform: none;
    z-index: 1000;
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
}

.calculator-container.collapsed {
    width: 48px;
    border-radius: 12px 0 0 12px;
}

.calculator-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: linear-gradient(135deg, #4a90d9 0%, #357abd 100%);
    color: white;
    cursor: pointer;
    user-select: none;
    border-radius: 8px 8px 0 0;
    justify-content: space-between;
}

.clear-history-btn {
    font-size: 11px;
    padding: 4px 8px;
    background: rgba(255,255,255,0.2);
    border: 1px solid rgba(255,255,255,0.3);
    border-radius: 4px;
    color: white;
    cursor: pointer;
    transition: all 0.2s ease;
}

.clear-history-btn:hover {
    background: rgba(255,255,255,0.3);
}

.calculator-container.collapsed .calculator-toggle {
    padding: 12px 8px;
    border-radius: 10px 0 0 10px;
}

.calculator-toggle:hover {
    background: linear-gradient(135deg, #3d7fc4 0%, #2d6ba8 100%);
}

.toggle-icon {
    font-size: 12px;
    font-weight: bold;
}

.calculator-container.collapsed .toggle-icon {
    transform: rotate(180deg);
}

.calculator-icon {
    font-size: 18px;
}

.calculator-title {
    font-size: 16px;
    font-weight: 600;
}

.calculator-container.collapsed .calculator-title {
    display: none;
}

.calculator-content {
    padding: 12px;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    flex: 1;
    max-height: none;
    min-height: 0;
}

.history-panel {
    background: #f8f9fa;
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 12px;
    max-height: 350px;
    overflow-y: auto;
    min-height: 60px;
}

.history-title {
    font-size: 11px;
    font-weight: 600;
    color: #666;
    margin-bottom: 6px;
    padding-bottom: 4px;
    border-bottom: 1px solid #e9ecef;
}

.history-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.history-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 6px;
    background: white;
    border-radius: 4px;
    font-size: 12px;
}

.history-expression {
    color: #666;
    font-family: 'Courier New', monospace;
}

.history-result {
    color: #4a90d9;
    font-weight: 600;
    font-family: 'Courier New', monospace;
}

.calculator-display {
    background: #1a1a2e;
    border-radius: 8px;
    padding: 18px;
    margin-bottom: 10px;
    min-height: 100px;
    position: relative;
    z-index: 10;
}

.display-expression {
    font-size: 14px;
    color: #888;
    font-family: 'Courier New', monospace;
    text-align: right;
    margin-bottom: 4px;
    min-height: 18px;
}

.display-value {
    font-size: 34px;
    font-weight: 700;
    text-align: right;
    color: #ffffff;
    font-family: 'Courier New', monospace;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 42px;
    white-space: nowrap;
    position: relative;
    z-index: 11;
}

.calculator-buttons {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
    margin-bottom: 10px;
    position: relative;
    z-index: 5;
}

.calc-btn {
    padding: 10px 4px;
    font-size: 16px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    transform-origin: center bottom;
}

.calc-btn:hover {
    transform: scale(1.05);
}

.calc-btn:active {
    transform: scale(0.95);
}

.btn-number {
    background: #f8f9fa;
    color: #333;
}

.btn-number:hover {
    background: #e9ecef;
}

.btn-operator {
    background: #4a90d9;
    color: white;
}

.btn-operator:hover {
    background: #3d7fc4;
}

.btn-clear {
    background: #e74c3c;
    color: white;
}

.btn-clear:hover {
    background: #c0392b;
}

.btn-equals {
    background: #27ae60;
    color: white;
}

.btn-equals:hover {
    background: #1e8449;
}

.btn-zero {
    grid-column: span 2;
}

.bond-calculator {
    border-top: 1px solid #eee;
    padding-top: 10px;
}

.bond-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
}

.bond-icon {
    font-size: 14px;
}

.bond-title {
    font-size: 12px;
    font-weight: 600;
    color: #333;
}

.bond-form {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.form-row {
    display: flex;
    flex-direction: column;
    gap: 3px;
}

.form-row label {
    font-size: 11px;
    color: #666;
}

.form-row input {
    padding: 6px 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 12px;
}

.form-row input:focus {
    outline: none;
    border-color: #4a90d9;
}

.calc-bond-btn {
    padding: 8px;
    background: #27ae60;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    transition: background 0.2s ease;
}

.calc-bond-btn:hover {
    background: #1e8449;
}

.bond-result {
    margin-top: 8px;
    padding: 8px;
    background: #f8f9fa;
    border-radius: 4px;
    text-align: center;
}

.result-label {
    font-size: 11px;
    color: #666;
    margin-bottom: 3px;
}

.result-value {
    font-size: 16px;
    font-weight: 700;
    color: #27ae60;
}

/* 理财计算器样式 */
.finance-calculator {
    border-top: 1px solid #eee;
    padding-top: 10px;
    margin-top: 10px;
}

.finance-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
}

.finance-icon {
    font-size: 14px;
}

.finance-title {
    font-size: 12px;
    font-weight: 600;
    color: #333;
}

.finance-tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 10px;
    flex-wrap: wrap;
}

.finance-tab {
    padding: 6px 10px;
    font-size: 11px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    transition: all 0.2s ease;
}

.finance-tab:hover {
    border-color: #4a90d9;
    background: #e8f0fe;
}

.finance-tab.active {
    background: #4a90d9;
    color: white;
    border-color: #4a90d9;
}

.finance-panel {
    background: #fafafa;
    border-radius: 6px;
    padding: 10px;
}

.finance-form {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.finance-form .form-row select {
    padding: 6px 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 12px;
    background: white;
}

.finance-form .form-row select:focus {
    outline: none;
    border-color: #4a90d9;
}

.finance-calc-btn {
    padding: 8px;
    background: #4a90d9;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    transition: background 0.2s ease;
    margin-top: 4px;
}

.finance-calc-btn:hover {
    background: #3d7fc4;
}

.finance-result {
    margin-top: 10px;
    padding: 10px;
    background: white;
    border-radius: 4px;
    border: 1px solid #e9ecef;
}

.result-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 0;
    font-size: 12px;
    border-bottom: 1px dashed #eee;
}

.result-row:last-child {
    border-bottom: none;
}

.result-row.total {
    margin-top: 4px;
    padding-top: 8px;
    border-top: 1px solid #e9ecef;
}

.result-row span:first-child {
    color: #666;
}

.result-num {
    font-weight: 600;
    color: #333;
}

.result-num.profit {
    color: #27ae60;
}

.result-row.total .result-num {
    font-size: 14px;
    color: #4a90d9;
}
</style>