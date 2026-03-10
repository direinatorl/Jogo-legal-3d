/**
 * Velocity Strategy: Death Race & Shop
 * Core Logic Engine
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Elementos da UI
const speedEl = document.getElementById('speed-val');
const scoreEl = document.getElementById('score-val');
const moneyEl = document.getElementById('money-val');
const hpBar = document.getElementById('hp-bar');
const fuelBar = document.getElementById('fuel-bar');
const tireBar = document.getElementById('tire-bar');
const overlay = document.getElementById('overlay');
const shopOverlay = document.getElementById('shop-overlay');
const finalScoreEl = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const shopTriggerBtn = document.getElementById('shop-trigger-btn');
const closeShopBtn = document.getElementById('close-shop-btn');

// Configurações do Jogo
const CONFIG = {
    TRACK_WIDTH: 450,
    CAR_WIDTH: 40,
    CAR_HEIGHT: 70,
    PLAYER_MAX_HP: 100,
    ENEMY_MAX_HP: 50,
    BULLET_SPEED: 12,
    ENEMY_FIRE_RATE: 2000, // ms
    PLAYER_FIRE_RATE: 500,  // ms
    FUEL_CONSUMPTION: 0.05,
    TIRE_WEAR: 0.02
};

// Estado do Jogador
let player = {
    x: 0,
    y: 0,
    speed: 0,
    maxSpeed: 120,
    hp: 100,
    money: 0,
    fuel: 100,
    tireHealth: 100,
    score: 0,
    lastShot: 0,
    fireRate: CONFIG.PLAYER_FIRE_RATE,
    damage: 20
};

let gameState = 'MENU';
let enemies = [];
let bullets = [];
let particles = [];
let roadOffset = 0;
let keys = {};

// Inputs
window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'KeyP') toggleShop();
});
window.addEventListener('keyup', e => keys[e.code] = false);

function init() {
    resize();
    player.x = canvas.width / 2;
    player.y = canvas.height - 150;
    player.hp = CONFIG.PLAYER_MAX_HP;
    player.money = 0;
    player.fuel = 100;
    player.tireHealth = 100;
    player.score = 0;
    player.speed = 0;
    enemies = [];
    bullets = [];
    particles = [];
    gameState = 'MENU';
    overlay.classList.add('hidden');
    shopOverlay.classList.add('hidden');
}

function resize() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}

window.addEventListener('resize', resize);

// Loja Logic
function toggleShop() {
    if (gameState === 'MENU' || gameState === 'PLAYING') {
        const wasPlaying = gameState === 'PLAYING';
        gameState = shopOverlay.classList.contains('hidden') ? 'SHOP' : (wasPlaying ? 'PLAYING' : 'MENU');
        shopOverlay.classList.toggle('hidden');
        updateShopButtons();
    }
}

shopTriggerBtn.addEventListener('click', toggleShop);
closeShopBtn.addEventListener('click', toggleShop);

document.querySelectorAll('.buy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const item = btn.dataset.item;
        const price = parseInt(btn.dataset.price);
        if (player.money >= price) {
            player.money -= price;
            applyUpgrade(item);
            updateShopButtons();
            updateUI();
        }
    });
});

function applyUpgrade(item) {
    switch (item) {
        case 'weapon': player.fireRate *= 0.8; break;
        case 'fuel': player.fuel = Math.min(player.fuel + 50, 100); break;
        case 'tires': player.tireHealth = Math.min(player.tireHealth + 50, 100); break;
        case 'health': player.hp = Math.min(player.hp + 25, CONFIG.PLAYER_MAX_HP); break;
    }
}

function updateShopButtons() {
    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.disabled = player.money < parseInt(btn.dataset.price);
    });
}

startBtn.addEventListener('click', () => {
    if (gameState === 'MENU') {
        gameState = 'PLAYING';
        startBtn.textContent = 'PAUSAR CORRIDA';
    } else {
        gameState = 'MENU';
        startBtn.textContent = 'RECURAR CORRIDA';
    }
});

restartBtn.addEventListener('click', init);

// Loop de Atualização
function update() {
    if (gameState !== 'PLAYING') return;

    // Movimentação do Jogador (Livre mas restrita à Rua)
    const moveX = (keys['KeyD'] || keys['ArrowRight'] ? 5 : 0) - (keys['KeyA'] || keys['ArrowLeft'] ? 5 : 0);
    const moveY = (keys['KeyS'] || keys['ArrowDown'] ? 3 : 0) - (keys['KeyW'] || keys['ArrowUp'] ? 3 : 0);

    player.x += moveX;
    player.y += moveY;

    // Restrição à RUA (Retângulo central)
    const roadLeft = (canvas.width / 2) - (CONFIG.TRACK_WIDTH / 2);
    const roadRight = (canvas.width / 2) + (CONFIG.TRACK_WIDTH / 2);

    if (player.x < roadLeft + 20) player.x = roadLeft + 20;
    if (player.x > roadRight - 20) player.x = roadRight - 20;

    // Restrição Vertical (Não sai da tela visível na rua)
    if (player.y < 100) player.y = 100;
    if (player.y > canvas.height - 50) player.y = canvas.height - 50;

    // Atirar
    if (keys['Space'] && Date.now() - player.lastShot > player.fireRate) {
        bullets.push({ x: player.x, y: player.y - 40, dy: -CONFIG.BULLET_SPEED, owner: 'PLAYER' });
        player.lastShot = Date.now();
    }

    // Gerenciar Balas
    bullets.forEach((b, i) => {
        b.y += b.dy;
        if (b.y < -50 || b.y > canvas.height + 50) bullets.splice(i, 1);

        // Colisão Bala -> Inimigo
        if (b.owner === 'PLAYER') {
            enemies.forEach((e, ei) => {
                if (checkCollision(b, e, 10, 40)) {
                    e.hp -= player.damage;
                    bullets.splice(i, 1);
                    if (e.hp <= 0) {
                        spawnExplosion(e.x, e.y);
                        enemies.splice(ei, 1);
                        player.money += 50;
                        player.score += 500;
                        updateUI();
                    }
                }
            });
        } else {
            // Colisão Bala -> Jogador
            if (checkCollision(b, player, 10, 40)) {
                player.hp -= 10;
                bullets.splice(i, 1);
                spawnParticle(player.x, player.y, '#ff3131');
                if (player.hp <= 0) endGame();
            }
        }
    });

    // Inimigos
    if (Math.random() < 0.015) {
        enemies.push({
            x: roadLeft + 40 + Math.random() * (CONFIG.TRACK_WIDTH - 80),
            y: -100,
            hp: CONFIG.ENEMY_MAX_HP,
            lastShot: Date.now(),
            speed: 2 + Math.random() * 2
        });
    }

    enemies.forEach((e, i) => {
        e.y += e.speed;

        // IA de Tiro
        if (Date.now() - e.lastShot > CONFIG.ENEMY_FIRE_RATE) {
            bullets.push({ x: e.x, y: e.y + 20, dy: CONFIG.BULLET_SPEED / 2, owner: 'ENEMY' });
            e.lastShot = Date.now();
        }

        // Colisão Jogador -> Inimigo
        if (checkCollision(player, e, 40, 40)) {
            player.hp -= 20;
            spawnExplosion(e.x, e.y);
            enemies.splice(i, 1);
            if (player.hp <= 0) endGame();
        }

        if (e.y > canvas.height) enemies.splice(i, 1);
    });

    // Consumo e Score
    player.fuel -= CONFIG.FUEL_CONSUMPTION;
    player.tireHealth -= CONFIG.TIRE_WEAR;
    player.score += 1;

    if (player.fuel <= 0 || player.tireHealth <= 0) endGame();

    roadOffset += 5;
    updateUI();
}

function checkCollision(a, b, wa, wb) {
    return Math.abs(a.x - b.x) < (wa + wb) / 2 && Math.abs(a.y - b.y) < (wa + wb) / 2;
}

function spawnExplosion(x, y) {
    for (let i = 0; i < 15; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 1,
            color: Math.random() > 0.5 ? '#ff9d00' : '#ff3131'
        });
    }
}

function spawnParticle(x, y, color) {
    particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 0.5,
        color: color
    });
}

function updateUI() {
    moneyEl.innerText = `$${player.money}`;
    scoreEl.innerText = player.score.toString().padStart(6, '0');
    hpBar.style.width = `${player.hp}%`;
    fuelBar.style.width = `${player.fuel}%`;
    tireBar.style.width = `${player.tireHealth}%`;
    speedEl.innerText = Math.floor(player.speed + 120);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const centerX = canvas.width / 2;

    // Estrada
    ctx.fillStyle = '#111';
    ctx.fillRect(centerX - CONFIG.TRACK_WIDTH / 2, 0, CONFIG.TRACK_WIDTH, canvas.height);

    // Linhas
    ctx.strokeStyle = '#00f2ff';
    ctx.lineWidth = 6;
    ctx.strokeRect(centerX - CONFIG.TRACK_WIDTH / 2, -10, CONFIG.TRACK_WIDTH, canvas.height + 20);

    ctx.setLineDash([40, 40]);
    ctx.lineDashOffset = -roadOffset;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.moveTo(centerX, 0); ctx.lineTo(centerX, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Balas
    bullets.forEach(b => {
        ctx.fillStyle = b.owner === 'PLAYER' ? '#00f2ff' : '#ff3131';
        ctx.shadowBlur = 10;
        ctx.shadowColor = ctx.fillStyle;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
        ctx.fill();
    });

    // Inimigos
    enemies.forEach(e => {
        ctx.fillStyle = '#ff00ea';
        ctx.shadowBlur = 15;
        ctx.fillRect(e.x - 20, e.y - 35, 40, 70);
        // Canhão inimigo
        ctx.fillStyle = '#333';
        ctx.fillRect(e.x - 5, e.y + 20, 10, 15);
    });

    // Jogador
    drawPlayer(player.x, player.y);

    // Partículas
    particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        if (p.life <= 0) particles.splice(i, 1);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.fillRect(p.x, p.y, 4, 4);
        ctx.globalAlpha = 1;
    });
}

function drawPlayer(x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00f2ff';
    ctx.fillRect(-20, -35, 40, 70);
    // Canhão
    ctx.fillStyle = '#00f2ff';
    ctx.fillRect(-5, -45, 10, 15);
    ctx.restore();
}

function endGame() {
    gameState = 'GAMEOVER';
    overlay.classList.remove('hidden');
    finalScoreEl.innerText = player.score;
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

init();
loop();
