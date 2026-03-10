/**
 * Velocity Strategy: Racing Sim
 * Core Logic Engine
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Elementos da UI
const speedEl = document.getElementById('speed-val');
const scoreEl = document.getElementById('score-val');
const fuelBar = document.getElementById('fuel-bar');
const tireBar = document.getElementById('tire-bar');
const heatBar = document.getElementById('heat-bar');
const overlay = document.getElementById('overlay');
const finalScoreEl = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// Configurações do Jogo
const CONFIG = {
    TRACK_WIDTH: 400,
    CAR_WIDTH: 40,
    CAR_HEIGHT: 70,
    MAX_HEAT: 100,
    FUEL_CONSUMPTION: 0.05,
    TIRE_WEAR_BASE: 0.02
};

// Estado do Jogador
let car = {
    x: 0,
    y: 0,
    speed: 0,
    maxSpeed: 180,
    acceleration: 0.15,
    friction: 0.05,
    fuel: 100,
    tireHealth: 100,
    engineHeat: 0,
    score: 0,
    steering: 0,
    pressure: 30, // psi
    downforce: 5  // Nível 1-10
};

let gameState = 'MENU'; // MENU, PLAYING, GAMEOVER
let obstacles = [];
let particles = [];
let roadOffset = 0;
let keys = {};

// Gerenciamento de Inputs
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

// Ajustes Técnicos
document.getElementById('tire-pressure').addEventListener('input', (e) => {
    car.pressure = parseInt(e.target.value);
    document.getElementById('tire-pressure-val').innerText = `${car.pressure} psi`;
});

document.getElementById('aero-downforce').addEventListener('input', (e) => {
    car.downforce = parseInt(e.target.value);
    document.getElementById('aero-val').innerText = `Nível ${car.downforce}`;
});

function init() {
    resize();
    car.x = canvas.width / 2;
    car.y = canvas.height - 150;
    obstacles = [];
    particles = [];
    car.fuel = 100;
    car.tireHealth = 100;
    car.engineHeat = 0;
    car.score = 0;
    car.speed = 0;
    gameState = 'MENU';
    overlay.classList.add('hidden');
}

function resize() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}

window.addEventListener('resize', resize);

startBtn.addEventListener('click', () => {
    gameState = 'PLAYING';
    startBtn.disabled = true;
});

restartBtn.addEventListener('click', init);

// Loop Principal
function update() {
    if (gameState !== 'PLAYING') return;

    // Física e Movimento
    if (keys['ArrowUp'] || keys['KeyW']) {
        car.speed = Math.min(car.speed + car.acceleration, car.maxSpeed);
        car.engineHeat = Math.min(car.engineHeat + 0.1, CONFIG.MAX_HEAT);
    } else {
        car.speed = Math.max(car.speed - car.friction, 0);
        car.engineHeat = Math.max(car.engineHeat - 0.05, 0);
    }

    if (keys['ArrowLeft'] || keys['KeyA']) {
        car.steering = -3 * (car.speed / 100 + 1);
        car.x += car.steering;
    } else if (keys['ArrowRight'] || keys['KeyD']) {
        car.steering = 3 * (car.speed / 100 + 1);
        car.x += car.steering;
    }

    // Impacto do Setup
    // Mais pressão = mais velocidade final, menos grip
    // Mais downforce = melhor curva, menos velocidade final
    const speedBonus = (car.pressure - 30) * 0.5;
    const handlingBonus = (car.downforce - 5) * 0.2;
    // (Simplificado para efeito visual)

    // Consumo de Recursos
    car.fuel -= (car.speed / 1000) + CONFIG.FUEL_CONSUMPTION;
    car.tireHealth -= (car.speed / 2000) * (1 + (car.pressure - 30) / 100);

    if (car.fuel <= 0 || car.tireHealth <= 0) endGame();

    // Spawn de Obstáculos (Tráfego)
    if (Math.random() < 0.02 * (car.speed / 50 + 1)) {
        obstacles.push({
            x: Math.random() * (CONFIG.TRACK_WIDTH - 40) + (canvas.width / 2 - CONFIG.TRACK_WIDTH / 2),
            y: -100,
            speed: Math.random() * 2 + 2,
            type: Math.random() > 0.5 ? 'ENEMY' : 'BUMP'
        });
    }

    // Atualizar Obstáculos
    obstacles.forEach((obs, index) => {
        obs.y += obs.speed + (car.speed / 10);

        // Colisão
        if (checkCollision(car, obs)) {
            car.speed *= 0.5;
            car.tireHealth -= 5;
            obstacles.splice(index, 1);
        }

        if (obs.y > canvas.height) {
            obstacles.splice(index, 1);
            car.score += 10;
        }
    });

    car.score += Math.floor(car.speed / 10);
    roadOffset += car.speed / 5;

    updateUI();
}

function checkCollision(c, o) {
    const carRect = { x: c.x - 20, y: c.y - 35, w: 40, h: 70 };
    const obsRect = { x: o.x, y: o.y, w: 40, h: 40 };
    return carRect.x < obsRect.x + obsRect.w &&
        carRect.x + carRect.w > obsRect.x &&
        carRect.y < obsRect.y + obsRect.h &&
        carRect.y + carRect.h > obsRect.y;
}

function updateUI() {
    speedEl.innerText = Math.floor(car.speed * 2);
    scoreEl.innerText = car.score.toString().padStart(6, '0');
    fuelBar.style.width = `${car.fuel}%`;
    tireBar.style.width = `${car.tireHealth}%`;
    heatBar.style.width = `${car.engineHeat}%`;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;

    // Desenhar Estrada
    ctx.fillStyle = '#111';
    ctx.fillRect(centerX - CONFIG.TRACK_WIDTH / 2, 0, CONFIG.TRACK_WIDTH, canvas.height);

    // Linhas Laterais
    ctx.strokeStyle = '#00f2ff';
    ctx.lineWidth = 4;
    ctx.strokeRect(centerX - CONFIG.TRACK_WIDTH / 2, -10, CONFIG.TRACK_WIDTH, canvas.height + 20);

    // Faixas centrais (Animação de Movimento)
    ctx.setLineDash([40, 40]);
    ctx.lineDashOffset = -roadOffset;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Desenhar Carro
    drawCar(car.x, car.y);

    // Desenhar Obstáculos
    obstacles.forEach(obs => {
        ctx.fillStyle = obs.type === 'ENEMY' ? '#ff00ea' : '#ff9d00';
        ctx.shadowBlur = 15;
        ctx.shadowColor = ctx.fillStyle;
        ctx.fillRect(obs.x, obs.y, 40, 40);
        ctx.shadowBlur = 0;
    });
}

function drawCar(x, y) {
    ctx.save();
    ctx.translate(x, y);

    // Corpo
    ctx.fillStyle = '#e0e0e0';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00f2ff';
    ctx.fillRect(-20, -35, 40, 70);

    // Spoiler
    ctx.fillStyle = '#333';
    ctx.fillRect(-25, 20, 50, 10);

    // Vidro
    ctx.fillStyle = '#0a0b10';
    ctx.fillRect(-15, -20, 30, 20);

    // Luzes traseiras (se freando)
    if (keys['ArrowDown'] || keys['KeyS']) {
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(-18, 30, 8, 4);
        ctx.fillRect(10, 30, 8, 4);
    }

    ctx.restore();
}

function endGame() {
    gameState = 'GAMEOVER';
    overlay.classList.remove('hidden');
    finalScoreEl.innerText = car.score;
    startBtn.disabled = false;
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

init();
gameLoop();
