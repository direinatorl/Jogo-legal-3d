/**
 * Velocity Strategy: 3D Death Race (Combat Refined)
 * Powered by Three.js
 */

// --- CONFIGURAÇÃO THREE.JS ---
let scene, camera, renderer;
let clock = new THREE.Clock();
let lastStateBeforeShop = 'MENU';

// --- ELEMENTOS DO JOGO ---
let playerObj;
let road;
let enemies = [];
let bullets = [];
let particles = [];
let keys = {};

// --- ESTADO DO JOGO ---
let gameState = 'MENU';
let player = {
    x: 0,
    z: 0,
    speed: 0,
    maxSpeed: 80,
    hp: 100,
    money: 0,
    fuel: 100,
    tireHealth: 100,
    score: 0,
    lastShot: 0,
    fireRate: 400, // Melhorado
    damage: 25
};

// --- UI ELEMENTS ---
const speedEl = document.getElementById('speed-val');
const scoreEl = document.getElementById('score-val');
const moneyEl = document.getElementById('money-val');
const hpBar = document.getElementById('hp-bar');
const fuelBar = document.getElementById('fuel-bar');
const tireBar = document.getElementById('tire-bar');
const fuelPct = document.getElementById('fuel-pct');
const tirePct = document.getElementById('tire-pct');
const overlay = document.getElementById('overlay');
const shopOverlay = document.getElementById('shop-overlay');
const finalScoreEl = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const shopTriggerBtn = document.getElementById('shop-trigger-btn');
const closeShopBtn = document.getElementById('close-shop-btn');
const damageOverlay = document.getElementById('damage-overlay');

function init3D() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050608);
    scene.fog = new THREE.Fog(0x050608, 50, 400);

    // Camera
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 10, 25);
    camera.lookAt(0, 0, -10);

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas'), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00f2ff, 2);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    // Road (Infinita com repetição)
    const roadGeo = new THREE.PlaneGeometry(35, 2000);
    const roadMat = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.8
    });
    road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    scene.add(road);

    // Linhas Neon Tiled
    const lineGeo = new THREE.PlaneGeometry(1, 2000);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0x00f2ff });

    const leftLine = new THREE.Mesh(lineGeo, lineMat);
    leftLine.position.set(-17.5, 0.1, 0);
    leftLine.rotation.x = -Math.PI / 2;
    scene.add(leftLine);

    const rightLine = new THREE.Mesh(lineGeo, lineMat);
    rightLine.position.set(17.5, 0.1, 0);
    rightLine.rotation.x = -Math.PI / 2;
    scene.add(rightLine);

    // Criar Carro Jogador (Geométrico)
    createPlayerCar();

    // Inputs
    window.addEventListener('keydown', e => {
        keys[e.code] = true;
        if (e.code === 'KeyC' && (gameState === 'MENU' || gameState === 'GAMEOVER')) {
            startGame();
        }
        if (e.code === 'KeyP') toggleShop();
    });
    window.addEventListener('keyup', e => keys[e.code] = false);

    window.addEventListener('mousedown', e => {
        if (e.button === 0 && gameState === 'PLAYING') keys['LeftClick'] = true;
    });
    window.addEventListener('mouseup', e => {
        if (e.button === 0) keys['LeftClick'] = false;
    });

    // UI Listeners
    startBtn.addEventListener('click', startGame);
    closeShopBtn.addEventListener('click', toggleShop);
    shopTriggerBtn.addEventListener('click', toggleShop);
    restartBtn.addEventListener('click', startGame);

    // Shop upgrades
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

    animate();
}

function startGame() {
    if (gameState === 'MENU' || gameState === 'GAMEOVER') resetGame();
    gameState = 'PLAYING';
    startBtn.textContent = 'PAUSAR CORRIDA';
    overlay.classList.add('hidden');
}

function createPlayerCar() {
    playerObj = new THREE.Group();

    // Corpo Principal
    const baseGeo = new THREE.BoxGeometry(3.5, 1.2, 7);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.1, metalness: 0.8 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    playerObj.add(base);

    // Cockpit
    const topGeo = new THREE.BoxGeometry(2.5, 1, 3);
    const topMat = new THREE.MeshStandardMaterial({ color: 0x00f2ff, emissive: 0x00f2ff, emissiveIntensity: 0.2, transparent: true, opacity: 0.8 });
    const top = new THREE.Mesh(topGeo, topMat);
    top.position.set(0, 1, -0.5);
    playerObj.add(top);

    // Arma no LADO ESQUERDO
    const cannonGroup = new THREE.Group();
    cannonGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 3), new THREE.MeshStandardMaterial({ color: 0x444444 })));
    const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.5), new THREE.MeshBasicMaterial({ color: 0x00f2ff }));
    muzzle.rotation.x = Math.PI / 2; muzzle.position.z = -1.5;
    cannonGroup.add(muzzle);
    cannonGroup.position.set(-2.2, 0.8, 0);
    playerObj.add(cannonGroup);

    playerObj.position.y = 1;
    scene.add(playerObj);
}

function spawnEnemy() {
    const enemyGroup = new THREE.Group();
    const colors = [0xff00ea, 0x00ff00, 0xff9100, 0xff3131];
    const color = colors[Math.floor(Math.random() * colors.length)];

    // Corpo Inimigo
    const bodyGeo = new THREE.BoxGeometry(4, 1.5, 7);
    const bodyMat = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.3 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    enemyGroup.add(body);

    // ARMAS INIMIGAS (Duas metralhadoras frontais)
    const gunGeo = new THREE.CylinderGeometry(0.2, 0.2, 2);
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x333333 });

    const leftGun = new THREE.Mesh(gunGeo, gunMat);
    leftGun.rotation.x = Math.PI / 2; leftGun.position.set(-1.2, 0.5, 3);
    enemyGroup.add(leftGun);

    const rightGun = new THREE.Mesh(gunGeo, gunMat);
    rightGun.rotation.x = Math.PI / 2; rightGun.position.set(1.2, 0.5, 3);
    enemyGroup.add(rightGun);

    enemyGroup.position.set((Math.random() - 0.5) * 28, 1.2, player.z - 300);
    scene.add(enemyGroup);

    enemies.push({
        mesh: enemyGroup,
        hp: 40,
        lastShot: Date.now(),
        speed: 0.4 + Math.random() * 0.6
    });
}

function triggerDamageFlash() {
    damageOverlay.classList.add('flash');
    setTimeout(() => damageOverlay.classList.remove('flash'), 100);
}

function update() {
    if (gameState !== 'PLAYING') return;

    // Movimento Player (WASD)
    const accelRate = 0.8;
    const friction = 0.3;
    const turnSpeed = 0.6;

    if (keys['KeyW']) {
        player.speed = Math.min(player.speed + accelRate, player.maxSpeed);
    } else if (keys['KeyS']) {
        player.speed = Math.max(player.speed - accelRate, -20);
    } else {
        if (player.speed > 0) player.speed = Math.max(0, player.speed - friction);
        if (player.speed < 0) player.speed = Math.min(0, player.speed + friction);
    }

    if (keys['KeyA']) player.x = Math.max(player.x - turnSpeed, -14);
    if (keys['KeyD']) player.x = Math.min(player.x + turnSpeed, 14);

    player.z -= player.speed * 0.1;
    playerObj.position.set(player.x, 1, player.z);

    // Camera
    camera.position.x += (player.x - camera.position.x) * 0.1;
    camera.position.z = player.z + 25 + (player.speed * 0.1);
    camera.lookAt(player.x, 2, player.z - 20);

    // Loop Estrada
    if (Math.abs(player.z - road.position.z) > 500) road.position.z = player.z;

    // Atirar Jogador
    if (keys['LeftClick'] && Date.now() - player.lastShot > player.fireRate) {
        spawnBullet(player.x - 2.2, 1.8, player.z - 3, -5, 'PLAYER');
        player.lastShot = Date.now();
    }

    // Balas
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.mesh.position.z += b.dz;
        if (Math.abs(b.mesh.position.z - player.z) > 400) {
            scene.remove(b.mesh);
            bullets.splice(i, 1);
            continue;
        }

        if (b.owner === 'PLAYER') {
            enemies.forEach((e, ei) => {
                if (b.mesh.position.distanceTo(e.mesh.position) < 4) {
                    e.hp -= player.damage;
                    scene.remove(b.mesh);
                    bullets.splice(i, 1);
                    if (e.hp <= 0) {
                        spawnExplosion(e.mesh.position);
                        scene.remove(e.mesh);
                        enemies.splice(ei, 1);
                        player.money += 50; player.score += 500;
                    }
                }
            });
        } else {
            if (b.mesh.position.distanceTo(playerObj.position) < 4) {
                player.hp -= 10;
                triggerDamageFlash();
                scene.remove(b.mesh);
                bullets.splice(i, 1);
                if (player.hp <= 0) endGame();
            }
        }
    }

    // Inimigos AI
    if (Math.random() < 0.03) spawnEnemy();
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        // Enimigos tentam te alcançar ou se manter perto
        const relativeSpeed = player.speed * 0.05 + e.speed;
        e.mesh.position.z += relativeSpeed;

        if (e.mesh.position.z > player.z + 60) {
            scene.remove(e.mesh);
            enemies.splice(i, 1);
            continue;
        }

        // Atirar mais frequente e inteligente se estiver na frente
        if (Date.now() - e.lastShot > 1200 && e.mesh.position.z < player.z) {
            // Tiro duplo
            spawnBullet(e.mesh.position.x - 1.2, 1.5, e.mesh.position.z + 4, 3, 'ENEMY');
            spawnBullet(e.mesh.position.x + 1.2, 1.5, e.mesh.position.z + 4, 3, 'ENEMY');
            e.lastShot = Date.now();
        }

        if (e.mesh.position.distanceTo(playerObj.position) < 5) {
            player.hp -= 20;
            triggerDamageFlash();
            spawnExplosion(e.mesh.position);
            scene.remove(e.mesh);
            enemies.splice(i, 1);
            if (player.hp <= 0) endGame();
        }
    }

    // Partículas & Recursos
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.mesh.position.add(p.vel); p.life -= 0.03; p.mesh.scale.setScalar(p.life);
        if (p.life <= 0) { scene.remove(p.mesh); particles.splice(i, 1); }
    }
    player.fuel -= 0.03; player.tireHealth -= 0.015; player.score += Math.floor(player.speed / 10);
    if (player.fuel <= 0 || player.tireHealth <= 0) endGame();
    updateUI();
}

function spawnBullet(x, y, z, dz, owner) {
    const bullet = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), new THREE.MeshBasicMaterial({ color: owner === 'PLAYER' ? 0x00f2ff : 0xff3131 }));
    bullet.position.set(x, y, z);
    scene.add(bullet);
    bullets.push({ mesh: bullet, dz, owner });
}

function spawnExplosion(pos) {
    for (let i = 0; i < 15; i++) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshBasicMaterial({ color: 0xff9100 }));
        p.position.copy(pos);
        scene.add(p);
        particles.push({ mesh: p, life: 1.0, vel: new THREE.Vector3((Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5) });
    }
}

function updateUI() {
    moneyEl.innerText = `$${player.money}`;
    scoreEl.innerText = player.score.toString().padStart(6, '0');
    hpBar.style.width = `${player.hp}%`;
    const fPercent = Math.max(0, Math.floor(player.fuel));
    const tPercent = Math.max(0, Math.floor(player.tireHealth));
    fuelBar.style.width = `${fPercent}%`;
    tireBar.style.width = `${tPercent}%`;
    fuelPct.innerText = `${fPercent}%`;
    tirePct.innerText = `${tPercent}%`;
    speedEl.innerText = Math.max(0, Math.floor(player.speed * 2.5));
}

function applyUpgrade(item) {
    switch (item) {
        case 'weapon': player.fireRate *= 0.8; break;
        case 'fuel': player.fuel = Math.min(player.fuel + 50, 100); break;
        case 'tires': player.tireHealth = Math.min(player.tireHealth + 50, 100); break;
        case 'health': player.hp = Math.min(player.hp + 25, 100); break;
    }
}

function updateShopButtons() {
    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.disabled = player.money < parseInt(btn.dataset.price);
    });
}

function resetGame() {
    player.hp = 100; player.money = 0; player.fuel = 100; player.tireHealth = 100;
    player.score = 0; player.x = 0; player.z = 0; player.speed = 0;
    if (playerObj) playerObj.position.set(0, 1, 0);
    enemies.forEach(e => scene.remove(e.mesh)); enemies = [];
    bullets.forEach(b => scene.remove(b.mesh)); bullets = [];
    overlay.classList.add('hidden'); shopOverlay.classList.add('hidden');
}

function endGame() {
    gameState = 'GAMEOVER';
    overlay.classList.remove('hidden');
    finalScoreEl.innerText = player.score;
}

function animate() {
    requestAnimationFrame(animate);
    update();
    renderer.render(scene, camera);
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init3D();
} else {
    window.addEventListener('DOMContentLoaded', init3D);
}

window.addEventListener('resize', () => {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});
