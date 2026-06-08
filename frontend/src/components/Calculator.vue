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
            bondResult: null
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
        }
    }
}
</script>

<style scoped>
.calculator-container {
    width: 360px;
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    overflow: visible;
    border: 2px solid #4a90d9;
    position: relative;
    z-index: 100;
    transition: all 0.3s ease;
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
    padding: 10px;
    display: flex;
    flex-direction: column;
}

.history-panel {
    background: #f8f9fa;
    border-radius: 6px;
    padding: 8px;
    margin-bottom: 10px;
    max-height: 120px;
    overflow-y: auto;
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
</style>