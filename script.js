// ターゲットハンターゲーム
class TargetHunterGame {
    constructor() {
        this.gameState = 'stopped'; // stopped, running, paused
        this.score = 0;
        this.totalHits = 0;
        this.totalMisses = 0;
        this.level = 1;
        this.gameTime = 0;
        this.targets = new Map();
        this.targetId = 0;
        
        // ゲーム設定
        this.config = {
            targetSpawnRate: 2000, // ミリ秒
            targetLifetime: 4000,  // ミリ秒
            maxTargets: 8,
            fieldPadding: 50
        };
        
        // タイマー
        this.gameTimer = null;
        this.spawnTimer = null;
        this.updateTimer = null;
        this.startTime = 0;
        
        // アイテムシステム
        this.items = {
            doubleScore: 0,
            clearAll: 0,
            slowDown: 0
        };
        this.activeEffects = {
            doubleScore: {
                active: false,
                endTime: 0,
                duration: 10000 // 10秒
            },
            slowDown: {
                active: false,
                endTime: 0,
                duration: 15000 // 15秒
            }
        };
        
        // アイテム生成追跡
        this.lastDoubleScoreHits = 0;
        this.lastClearAllHits = 0;
        this.lastSlowDownHits = 0;
        
        this.initializeElements();
        this.bindEvents();
        this.loadGameData();
        this.updateDisplay();
    }
    
    initializeElements() {
        // UI要素
        this.scoreElement = document.getElementById('score');
        this.totalHitsElement = document.getElementById('totalHits');
        this.totalMissesElement = document.getElementById('totalMisses');
        this.accuracyElement = document.getElementById('accuracy');
        this.levelElement = document.getElementById('level');
        this.gameTimeElement = document.getElementById('gameTime');
        this.activeTargetsElement = document.getElementById('activeTargets');
        
        // ボタン
        this.startButton = document.getElementById('startButton');
        this.pauseButton = document.getElementById('pauseButton');
        this.resetButton = document.getElementById('resetButton');
        
        // ゲームエリア
        this.gameField = document.getElementById('gameField');
        this.gameStatus = document.getElementById('gameStatus');
        this.fieldOverlay = document.querySelector('.field-overlay');
        this.effectsContainer = document.getElementById('effectsContainer');
        
        // アイテム要素
        this.doubleScoreItem = document.getElementById('doubleScoreItem');
        this.clearAllItem = document.getElementById('clearAllItem');
        this.slowDownItem = document.getElementById('slowDownItem');
        this.doubleScoreCount = document.getElementById('doubleScoreCount');
        this.clearAllCount = document.getElementById('clearAllCount');
        this.slowDownCount = document.getElementById('slowDownCount');
        this.doubleScoreEffect = document.getElementById('doubleScoreEffect');
        this.doubleScoreTimer = document.getElementById('doubleScoreTimer');
        this.slowDownEffect = document.getElementById('slowDownEffect');
        this.slowDownTimer = document.getElementById('slowDownTimer');
    }
    
    bindEvents() {
        this.startButton.addEventListener('click', () => this.startGame());
        this.pauseButton.addEventListener('click', () => this.pauseGame());
        this.resetButton.addEventListener('click', () => this.resetGame());
        
        // ゲームフィールドのクリック（ミス判定）
        this.gameField.addEventListener('click', (e) => this.handleFieldClick(e));
        
        // アイテムクリック
        this.doubleScoreItem.addEventListener('click', () => this.useItem('doubleScore'));
        this.clearAllItem.addEventListener('click', () => this.useItem('clearAll'));
        this.slowDownItem.addEventListener('click', () => this.useItem('slowDown'));
        
        // キーボードサポート
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // ウィンドウサイズ変更
        window.addEventListener('resize', () => this.handleResize());
        
        // ページを離れる前にデータを保存
        window.addEventListener('beforeunload', () => this.saveGameData());
    }
    
    // アイテム使用
    useItem(itemType) {
        if (this.gameState !== 'running') return;
        
        if (this.items[itemType] <= 0) return;
        
        this.items[itemType]--;
        this.updateItemDisplay();
        
        switch (itemType) {
            case 'doubleScore':
                this.activateDoubleScore();
                break;
            case 'clearAll':
                this.clearAllTargets();
                break;
            case 'slowDown':
                this.activateSlowDown();
                break;
        }
        
        this.playItemSound();
         this.showItemUseEffect(itemType);
     }
     
     // アイテム使用音
     playItemSound() {
         try {
             const audioContext = new (window.AudioContext || window.webkitAudioContext)();
             const oscillator = audioContext.createOscillator();
             const gainNode = audioContext.createGain();
             
             oscillator.connect(gainNode);
             gainNode.connect(audioContext.destination);
             
             oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
             oscillator.frequency.setValueAtTime(1200, audioContext.currentTime + 0.05);
             oscillator.frequency.setValueAtTime(1400, audioContext.currentTime + 0.1);
             
             gainNode.gain.setValueAtTime(0.25, audioContext.currentTime);
             gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
             
             oscillator.start(audioContext.currentTime);
             oscillator.stop(audioContext.currentTime + 0.15);
         } catch (error) {
             console.log('Audio not supported');
         }
    }
    
    // スコア2倍効果を発動
    activateDoubleScore() {
        this.activeEffects.doubleScore.active = true;
        this.activeEffects.doubleScore.endTime = Date.now() + this.activeEffects.doubleScore.duration;
        this.updateEffectDisplay();
    }
    
    // スピードダウン効果を発動
    activateSlowDown() {
        this.activeEffects.slowDown.active = true;
        this.activeEffects.slowDown.endTime = Date.now() + this.activeEffects.slowDown.duration;
        this.updateEffectDisplay();
    }
    
    // 全ターゲット消去
    clearAllTargets() {
        const clearedTargets = this.targets.size;
        this.targets.forEach((target, id) => {
            this.addScore(target.data.points);
            this.showHitEffect(target.element.offsetLeft + target.data.size/2, target.element.offsetTop + target.data.size/2);
            target.element.remove();
        });
        this.targets.clear();
        this.totalHits += clearedTargets;
        this.updateDisplay();
        this.updateActiveTargetsCount();
    }
    
    startGame() {
        if (this.gameState === 'stopped') {
            this.gameState = 'running';
            this.startTime = Date.now() - this.gameTime * 1000;
            this.hideOverlay();
            this.startTimers();
            this.updateButtons();
            this.updateItemDisplay();
            this.updateEffectDisplay();
            this.spawnTarget(); // 最初のターゲットをすぐに生成
        } else if (this.gameState === 'paused') {
            this.resumeGame();
        }
    }
    
    pauseGame() {
        if (this.gameState === 'running') {
            this.gameState = 'paused';
            this.stopTimers();
            this.showOverlay('ゲーム一時停止中');
            this.updateButtons();
        }
    }
    
    resumeGame() {
        if (this.gameState === 'paused') {
            this.gameState = 'running';
            this.startTime = Date.now() - this.gameTime * 1000;
            this.hideOverlay();
            this.startTimers();
            this.updateButtons();
        }
    }
    
    resetGame() {
        if (confirm('ゲームをリセットしますか？すべてのデータが失われます。')) {
            this.stopGame();
            this.score = 0;
            this.totalHits = 0;
            this.totalMisses = 0;
            this.level = 1;
            this.gameTime = 0;
            this.clearAllTargets();
            
            // アイテムリセット
            this.items.doubleScore = 0;
            this.items.clearAll = 0;
            this.items.slowDown = 0;
            this.activeEffects.doubleScore.active = false;
            this.activeEffects.slowDown.active = false;
            this.lastDoubleScoreHits = 0;
            this.lastClearAllHits = 0;
            this.lastSlowDownHits = 0;
            
            this.updateDisplay();
            this.updateItemDisplay();
            this.updateEffectDisplay();
            this.showOverlay('ゲーム開始ボタンを押してください');
            this.saveGameData();
        }
    }
    
    stopGame() {
        this.gameState = 'stopped';
        this.stopTimers();
        this.updateButtons();
    }
    
    startTimers() {
        // ゲーム時間更新
        this.gameTimer = setInterval(() => {
            this.gameTime = Math.floor((Date.now() - this.startTime) / 1000);
            this.updateGameTime();
            this.checkLevelUp();
            
            // アイテム生成チェック
            this.checkItemGeneration();
        }, 100);
        
        // ターゲット生成
        this.spawnTimer = setInterval(() => {
            this.spawnTarget();
        }, this.config.targetSpawnRate);
        
        // ターゲット更新
        this.updateTimer = setInterval(() => {
            this.updateTargets();
        }, 16); // 60fps
    }
    
    stopTimers() {
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
            this.gameTimer = null;
        }
        if (this.spawnTimer) {
            clearInterval(this.spawnTimer);
            this.spawnTimer = null;
        }
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
    }
    
    spawnTarget() {
        if (this.gameState !== 'running' || this.targets.size >= this.config.maxTargets) {
            return;
        }
        
        const targetData = this.createTargetData();
        const targetElement = this.createTargetElement(targetData);
        
        this.targets.set(targetData.id, {
            data: targetData,
            element: targetElement,
            spawnTime: Date.now()
        });
        
        this.gameField.appendChild(targetElement);
        this.updateActiveTargetsCount();
    }
    
    createTargetData() {
        const fieldRect = this.gameField.getBoundingClientRect();
        const types = ['normal', 'fast', 'small', 'bonus'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        // ターゲットの設定
        let size, speed, points, lifetime;
        switch (type) {
            case 'fast':
                size = 60;
                speed = 3 + this.level * 0.5;
                points = 15;
                lifetime = 3000;
                break;
            case 'small':
                size = 30;
                speed = 1.5 + this.level * 0.3;
                points = 25;
                lifetime = 5000;
                break;
            case 'bonus':
                size = 80;
                speed = 1 + this.level * 0.2;
                points = 50;
                lifetime = 6000;
                break;
            default: // normal
                size = 50;
                speed = 2 + this.level * 0.4;
                points = 10;
                lifetime = 4000;
        }
        
        // 初期位置（フィールド内のランダムな位置）
        const x = Math.random() * (fieldRect.width - size - this.config.fieldPadding * 2) + this.config.fieldPadding;
        const y = Math.random() * (fieldRect.height - size - this.config.fieldPadding * 2) + this.config.fieldPadding;
        
        // 移動方向（ランダム）
        const angle = Math.random() * Math.PI * 2;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        
        return {
            id: ++this.targetId,
            type,
            x,
            y,
            vx,
            vy,
            size,
            speed,
            points,
            lifetime,
            maxLifetime: lifetime
        };
    }
    
    createTargetElement(targetData) {
        const element = document.createElement('div');
        element.className = `target ${targetData.type}`;
        element.style.width = targetData.size + 'px';
        element.style.height = targetData.size + 'px';
        element.style.left = targetData.x + 'px';
        element.style.top = targetData.y + 'px';
        
        // ターゲットの表示内容
        let content = '';
        switch (targetData.type) {
            case 'fast':
                content = '⚡';
                break;
            case 'small':
                content = '💎';
                break;
            case 'bonus':
                content = '⭐';
                break;
            default:
                content = '🎯';
        }
        element.textContent = content;
        
        // クリックイベント
        element.addEventListener('click', (e) => this.handleTargetClick(e, targetData.id));
        
        return element;
    }
    
    updateTargets() {
        if (this.gameState !== 'running') return;
        
        const fieldRect = this.gameField.getBoundingClientRect();
        const currentTime = Date.now();
        const targetsToRemove = [];
        
        this.targets.forEach((target, id) => {
            const { data, element, spawnTime } = target;
            
            // 寿命チェック
            const age = currentTime - spawnTime;
            if (age >= data.lifetime) {
                targetsToRemove.push(id);
                this.handleTargetMiss(data);
                return;
            }
            
            // 位置更新
            // スピードダウン効果を適用
            const speedMultiplier = this.activeEffects.slowDown.active ? 0.5 : 1.0;
            data.x += data.vx * speedMultiplier;
            data.y += data.vy * speedMultiplier;
            
            // 壁での反射
            if (data.x <= 0 || data.x >= fieldRect.width - data.size) {
                data.vx = -data.vx;
                data.x = Math.max(0, Math.min(fieldRect.width - data.size, data.x));
            }
            if (data.y <= 0 || data.y >= fieldRect.height - data.size) {
                data.vy = -data.vy;
                data.y = Math.max(0, Math.min(fieldRect.height - data.size, data.y));
            }
            
            // DOM更新
            element.style.left = data.x + 'px';
            element.style.top = data.y + 'px';
            
            // 寿命に応じた透明度変更
            const lifeRatio = age / data.lifetime;
            if (lifeRatio > 0.7) {
                element.style.opacity = 1 - (lifeRatio - 0.7) / 0.3;
            }
        });
        
        // 期限切れターゲットを削除
        targetsToRemove.forEach(id => this.removeTarget(id));
    }
    
    handleTargetClick(event, targetId) {
        event.stopPropagation();
        
        if (this.gameState !== 'running') return;
        
        const target = this.targets.get(targetId);
        if (!target) return;
        
        // ヒット処理
        this.handleTargetHit(target.data, event);
        this.removeTarget(targetId);
    }
    
    handleTargetHit(targetData, event) {
        this.addScore(targetData.points);
        this.totalHits++;
        
        // エフェクト表示
        this.showHitEffect(event.clientX, event.clientY, targetData.points);
        
        // サウンド再生
        this.playHitSound(targetData.type);
        
        // UI更新
        this.updateDisplay();
        this.saveGameData();
    }
    
    // スコア追加
    addScore(points) {
        let finalPoints = points;
        
        // スコア2倍効果が有効な場合
        if (this.activeEffects.doubleScore.active) {
            finalPoints *= 2;
        }
        
        this.score += finalPoints;
        this.updateDisplay();
    }
    
    handleTargetMiss(targetData) {
        this.totalMisses++;
        this.updateDisplay();
        this.saveGameData();
    }
    
    handleFieldClick(event) {
        if (this.gameState !== 'running') return;
        
        // ターゲット以外をクリックした場合（ミス）
        if (event.target === this.gameField) {
            this.totalMisses++;
            this.showMissEffect(event.clientX, event.clientY);
            this.playMissSound();
            this.updateDisplay();
            this.saveGameData();
        }
    }
    
    removeTarget(targetId) {
        const target = this.targets.get(targetId);
        if (target) {
            target.element.classList.add('hit');
            setTimeout(() => {
                if (target.element.parentNode) {
                    target.element.parentNode.removeChild(target.element);
                }
            }, 300);
            this.targets.delete(targetId);
            this.updateActiveTargetsCount();
        }
    }
    
    clearAllTargets() {
        this.targets.forEach((target, id) => {
            if (target.element.parentNode) {
                target.element.parentNode.removeChild(target.element);
            }
        });
        this.targets.clear();
        this.updateActiveTargetsCount();
    }
    
    showHitEffect(x, y, points) {
        const effect = document.createElement('div');
        effect.className = 'hit-effect';
        effect.textContent = `+${points}`;
        effect.style.left = x + 'px';
        effect.style.top = y + 'px';
        
        this.effectsContainer.appendChild(effect);
        
        setTimeout(() => {
            if (effect.parentNode) {
                effect.parentNode.removeChild(effect);
            }
        }, 1000);
    }
    
    showMissEffect(x, y) {
        const effect = document.createElement('div');
        effect.className = 'miss-effect';
        effect.textContent = 'MISS';
        effect.style.left = x + 'px';
        effect.style.top = y + 'px';
        
        this.effectsContainer.appendChild(effect);
        
        setTimeout(() => {
            if (effect.parentNode) {
                effect.parentNode.removeChild(effect);
            }
        }, 800);
    }
    
    playHitSound(targetType) {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // ターゲットタイプに応じた音
            let frequency = 800;
            switch (targetType) {
                case 'fast': frequency = 1000; break;
                case 'small': frequency = 1200; break;
                case 'bonus': frequency = 600; break;
            }
            
            oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.5, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (error) {
            console.log('Audio not supported');
        }
    }
    
    playMissSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.2);
            
            gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (error) {
            console.log('Audio not supported');
        }
    }
    
    checkLevelUp() {
        const newLevel = Math.floor(this.score / 100) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            this.updateDifficulty();
            this.showLevelUpEffect();
        }
    }
    
    // アイテム生成チェック
    checkItemGeneration() {
        // スコア2倍アイテム: 3ヒットごとに1個
        if (this.totalHits > 0 && this.totalHits % 3 === 0 && this.totalHits !== this.lastDoubleScoreHits) {
            this.items.doubleScore++;
            this.lastDoubleScoreHits = this.totalHits;
            this.showItemPickupEffect('doubleScore');
        }
        
        // 全消去アイテム: 10ヒットごとに1個
        if (this.totalHits > 0 && this.totalHits % 10 === 0 && this.totalHits !== this.lastClearAllHits) {
            this.items.clearAll++;
            this.lastClearAllHits = this.totalHits;
            this.showItemPickupEffect('clearAll');
        }
        
        // スピードダウンアイテム: 5ヒットごとに1個
        if (this.totalHits > 0 && this.totalHits % 5 === 0 && this.totalHits !== this.lastSlowDownHits) {
            this.items.slowDown++;
            this.lastSlowDownHits = this.totalHits;
            this.showItemPickupEffect('slowDown');
        }
        
        // エフェクト更新
        this.updateActiveEffects();
        this.updateItemDisplay();
        this.updateEffectDisplay();
    }
    
    // アイテムピックアップエフェクト
    showItemPickupEffect(itemType) {
        const effect = document.createElement('div');
        effect.className = 'item-pickup-effect';
        effect.textContent = itemType === 'doubleScore' ? 'スコア2倍アイテム獲得!' : '全消去アイテム獲得!';
        effect.style.left = '50%';
        effect.style.top = '20%';
        effect.style.transform = 'translate(-50%, -50%)';
        effect.style.fontSize = '1.5rem';
        effect.style.color = '#00FF00';
        
        this.effectsContainer.appendChild(effect);
        
        setTimeout(() => {
            if (effect.parentNode) {
                effect.parentNode.removeChild(effect);
            }
        }, 2000);
    }
    
    // アイテム使用エフェクト
    showItemUseEffect(itemType) {
        const effect = document.createElement('div');
        effect.className = 'item-use-effect';
        effect.textContent = itemType === 'doubleScore' ? 'スコア2倍発動!' : '全消去発動!';
        effect.style.left = '50%';
        effect.style.top = '30%';
        effect.style.transform = 'translate(-50%, -50%)';
        effect.style.fontSize = '1.8rem';
        effect.style.color = '#FF6600';
        
        this.effectsContainer.appendChild(effect);
        
        setTimeout(() => {
            if (effect.parentNode) {
                effect.parentNode.removeChild(effect);
            }
        }, 1500);
    }
    
    // アクティブエフェクトの更新
    updateActiveEffects() {
        const now = Date.now();
        
        // スコア2倍効果の時間チェック
        if (this.activeEffects.doubleScore.active && now >= this.activeEffects.doubleScore.endTime) {
            this.activeEffects.doubleScore.active = false;
        }
        
        // スピードダウン効果の時間チェック
        if (this.activeEffects.slowDown.active && now >= this.activeEffects.slowDown.endTime) {
            this.activeEffects.slowDown.active = false;
        }
    }
    
    updateDifficulty() {
        // レベルに応じて難易度調整
        this.config.targetSpawnRate = Math.max(800, 2000 - this.level * 100);
        this.config.maxTargets = Math.min(12, 8 + Math.floor(this.level / 3));
        
        // スポーンタイマーを更新
        if (this.spawnTimer) {
            clearInterval(this.spawnTimer);
            this.spawnTimer = setInterval(() => {
                this.spawnTarget();
            }, this.config.targetSpawnRate);
        }
    }
    
    showLevelUpEffect() {
        const effect = document.createElement('div');
        effect.className = 'hit-effect';
        effect.textContent = `LEVEL ${this.level}!`;
        effect.style.left = '50%';
        effect.style.top = '50%';
        effect.style.transform = 'translate(-50%, -50%)';
        effect.style.fontSize = '2rem';
        effect.style.color = '#FFD700';
        
        this.effectsContainer.appendChild(effect);
        
        setTimeout(() => {
            if (effect.parentNode) {
                effect.parentNode.removeChild(effect);
            }
        }, 2000);
    }
    
    updateDisplay() {
        this.scoreElement.textContent = this.score.toLocaleString();
        this.totalHitsElement.textContent = this.totalHits.toLocaleString();
        this.totalMissesElement.textContent = this.totalMisses.toLocaleString();
        this.levelElement.textContent = this.level;
        
        // 命中率計算
        const totalShots = this.totalHits + this.totalMisses;
        const accuracy = totalShots > 0 ? Math.round((this.totalHits / totalShots) * 100) : 0;
        this.accuracyElement.textContent = accuracy + '%';
        
        // スコア更新アニメーション
        this.scoreElement.classList.add('score-update');
        setTimeout(() => {
            this.scoreElement.classList.remove('score-update');
        }, 300);
    }
    
    // アイテム表示更新
    updateItemDisplay() {
        this.doubleScoreCount.textContent = this.items.doubleScore;
        this.clearAllCount.textContent = this.items.clearAll;
        this.slowDownCount.textContent = this.items.slowDown;
        
        // アイテムの使用可能状態を更新
        this.doubleScoreItem.classList.toggle('disabled', this.items.doubleScore <= 0 || this.gameState !== 'running');
        this.clearAllItem.classList.toggle('disabled', this.items.clearAll <= 0 || this.gameState !== 'running');
        this.slowDownItem.classList.toggle('disabled', this.items.slowDown <= 0 || this.gameState !== 'running');
    }
    
    // エフェクト表示更新
    updateEffectDisplay() {
        if (this.activeEffects.doubleScore.active) {
            const remaining = Math.max(0, this.activeEffects.doubleScore.endTime - Date.now());
            const seconds = Math.ceil(remaining / 1000);
            this.doubleScoreTimer.textContent = `${seconds}秒`;
            this.doubleScoreEffect.style.display = 'flex';
        } else {
            this.doubleScoreEffect.style.display = 'none';
        }
        
        // スピードダウンエフェクト
        if (this.activeEffects.slowDown.active) {
            this.slowDownEffect.style.display = 'flex';
            const remaining = Math.max(0, this.activeEffects.slowDown.endTime - Date.now());
            this.slowDownTimer.textContent = Math.ceil(remaining / 1000) + 's';
        } else {
            this.slowDownEffect.style.display = 'none';
        }
    }
    
    updateGameTime() {
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = this.gameTime % 60;
        this.gameTimeElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    updateActiveTargetsCount() {
        this.activeTargetsElement.textContent = this.targets.size;
    }
    
    updateButtons() {
        switch (this.gameState) {
            case 'stopped':
                this.startButton.textContent = 'ゲーム開始';
                this.startButton.disabled = false;
                this.pauseButton.disabled = true;
                break;
            case 'running':
                this.startButton.textContent = 'ゲーム開始';
                this.startButton.disabled = true;
                this.pauseButton.disabled = false;
                this.pauseButton.textContent = '一時停止';
                break;
            case 'paused':
                this.startButton.textContent = '再開';
                this.startButton.disabled = false;
                this.pauseButton.disabled = true;
                break;
        }
    }
    
    showOverlay(message) {
        this.gameStatus.querySelector('h2').textContent = message;
        this.fieldOverlay.style.display = 'flex';
    }
    
    hideOverlay() {
        this.fieldOverlay.style.display = 'none';
    }
    
    handleKeyPress(event) {
        switch (event.code) {
            case 'Space':
                event.preventDefault();
                if (this.gameState === 'stopped') {
                    this.startGame();
                } else if (this.gameState === 'running') {
                    this.pauseGame();
                } else if (this.gameState === 'paused') {
                    this.resumeGame();
                }
                break;
            case 'KeyR':
                if (event.ctrlKey) {
                    event.preventDefault();
                    this.resetGame();
                }
                break;
        }
    }
    
    handleResize() {
        // ウィンドウサイズ変更時にターゲットの位置を調整
        if (this.gameState === 'running') {
            const fieldRect = this.gameField.getBoundingClientRect();
            this.targets.forEach((target) => {
                const { data, element } = target;
                data.x = Math.min(data.x, fieldRect.width - data.size);
                data.y = Math.min(data.y, fieldRect.height - data.size);
                element.style.left = data.x + 'px';
                element.style.top = data.y + 'px';
            });
        }
    }
    
    saveGameData() {
        const gameData = {
            score: this.score,
            totalHits: this.totalHits,
            totalMisses: this.totalMisses,
            level: this.level,
            gameTime: this.gameTime
        };
        localStorage.setItem('targetHunterGameData', JSON.stringify(gameData));
    }
    
    loadGameData() {
        try {
            const savedData = localStorage.getItem('targetHunterGameData');
            if (savedData) {
                const gameData = JSON.parse(savedData);
                this.score = gameData.score || 0;
                this.totalHits = gameData.totalHits || 0;
                this.totalMisses = gameData.totalMisses || 0;
                this.level = gameData.level || 1;
                this.gameTime = gameData.gameTime || 0;
                this.updateDifficulty();
            }
        } catch (error) {
            console.log('Failed to load game data');
        }
    }
}

// パフォーマンス最適化
class PerformanceOptimizer {
    constructor() {
        this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        this.applyOptimizations();
    }
    
    applyOptimizations() {
        if (this.isReducedMotion) {
            document.documentElement.style.setProperty('--animation-duration', '0s');
        }
        
        if (this.isMobile) {
            document.body.style.touchAction = 'manipulation';
            // モバイルでのパフォーマンス向上
            document.body.style.webkitUserSelect = 'none';
            document.body.style.webkitTouchCallout = 'none';
        }
    }
}

// ゲーム初期化
document.addEventListener('DOMContentLoaded', () => {
    // パフォーマンス最適化を適用
    new PerformanceOptimizer();
    
    // ゲーム開始
    const game = new TargetHunterGame();
    
    // デバッグ情報（開発時のみ）
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.game = game;
        console.log('Target Hunter Game initialized. Access game object via window.game');
    }
});

// エラーハンドリング
window.addEventListener('error', (event) => {
    console.error('Game error:', event.error);
});

// バックグラウンド/フォアグラウンド検出
document.addEventListener('visibilitychange', () => {
    const game = window.game;
    if (game && document.hidden && game.gameState === 'running') {
        game.pauseGame();
    }
});