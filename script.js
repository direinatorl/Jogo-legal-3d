/**
 * Velocity Strategy: 3D Death Race
 * Powered by Three.js
 */

// --- CONFIGURAÇÃO THREE.JS ---
let scene, camera, renderer;
let clock = new THREE.Clock();
let lastStateBeforeShop = 'MENU';

// --- ELEMENTOS DO JOGO ---
let playerObj, playerCarBox;
let road, roadTexture;
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
    maxSpeed: 100,
    hp: 100,
    money: 0,
    fuel: 100,
    tireHealth: 100,
    score: 0,
    lastShot: 0,
    fireRate: 500,
    damage: 20
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

// --- TEXTURAS ---
const textureLoader = new THREE.TextureLoader();
const playerTexture = textureLoader.load('carro.png');

function init3D() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0b10);
    scene.fog = new THREE.Fog(0x0a0b10, 50, 300);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 15, 30);
    camera.lookAt(0, 5, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas'), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00f2ff, 3);
    dirLight.position.set(0, 20, 10);
    scene.add(dirLight);

    // Road (Chão)
    const roadGeo = new THREE.PlaneGeometry(30, 1000);
    const roadMat = new THREE.MeshStandardMaterial({
        color: 0x111111,
        emissive: 0x000000
    });
    road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    scene.add(road);

    // Linhas Laterais Neon
    const lineGeo = new THREE.PlaneGeometry(1, 1000);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0x00f2ff });

    const leftLine = new THREE.Mesh(lineGeo, lineMat);
    leftLine.position.set(-15, 0.1, 0);
    leftLine.rotation.x = -Math.PI / 2;
    scene.add(leftLine);

    const rightLine = new THREE.Mesh(lineGeo, lineMat);
    rightLine.position.set(15, 0.1, 0);
    rightLine.rotation.x = -Math.PI / 2;
    scene.add(rightLine);

    // Criar Carro Jogador
    createPlayerCar();

    // Inputs
    window.addEventListener('keydown', e => {
        keys[e.code] = true;
        if (e.code === 'KeyP') toggleShop();
    });
    window.addEventListener('keyup', e => keys[e.code] = false);

    window.addEventListener('mousedown', e => {
        if (e.button === 0 && gameState === 'PLAYING') keys['LeftClick'] = true;
    });
    window.addEventListener('mouseup', e => {
        if (e.button === 0) keys['LeftClick'] = false;
    });
    window.addEventListener('contextmenu', e => e.preventDefault());

    // UI Listeners
    startBtn.addEventListener('click', () => {
        if (gameState === 'MENU' || gameState === 'GAMEOVER') resetGame();
        gameState = 'PLAYING';
        startBtn.textContent = 'PAUSAR CORRIDA';
    });

    closeShopBtn.addEventListener('click', toggleShop);
    shopTriggerBtn.addEventListener('click', toggleShop);
    restartBtn.addEventListener('click', () => {
        resetGame();
        gameState = 'PLAYING';
    });

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

function createPlayerCar() {
    // Grupo para o carro e arma
    playerObj = new THREE.Group();

    // Corpo do carro (Box com textura)
    const bodyGeo = new THREE.BoxGeometry(4, 2, 7);
    const bodyMat = new THREE.MeshStandardMaterial({ map: playerTexture });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    playerObj.add(body);

    // Arma no LADO ESQUERDO
    const gunGeo = new THREE.CylinderGeometry(0.3, 0.3, 3);
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
    const gun = new THREE.Mesh(gunGeo, gunMat);
    gun.rotation.x = Math.PI / 2;
    gun.position.set(-2.5, 0.5, -1);
    playerObj.add(gun);

    playerObj.position.y = 1;
    scene.add(playerObj);
}

function toggleShop() {
    if (gameState === 'MENU' || gameState === 'PLAYING' || gameState === 'SHOP') {
        const isCurrentlyShop = !shopOverlay.classList.contains('hidden');
        if (!isCurrentlyShop) {
            lastStateBeforeShop = gameState;
            gameState = 'SHOP';
            shopOverlay.classList.remove('hidden');
        } else {
            gameState = lastStateBeforeShop || 'MENU';
            shopOverlay.classList.add('hidden');
        }
        updateShopButtons();
    }
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
    player.hp = 100;
    player.money = 0;
    player.fuel = 100;
    player.tireHealth = 100;
    player.score = 0;
    player.x = 0;
    player.z = 0;
    playerObj.position.set(0, 1, 0);

    enemies.forEach(e => scene.remove(e.mesh));
    enemies = [];
    bullets.forEach(b => scene.remove(b.mesh));
    bullets = [];

    overlay.classList.add('hidden');
    shopOverlay.classList.add('hidden');
}

function spawnEnemy() {
    const enemyGroup = new THREE.Group();

    const bodyGeo = new THREE.BoxGeometry(4, 2, 7);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff00ea, emissive: 0x6a00ff, emissiveIntensity: 0.5 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    enemyGroup.add(body);

    const gunGeo = new THREE.CylinderGeometry(0.3, 0.3, 2);
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const gun = new THREE.Mesh(gunGeo, gunMat);
    gun.rotation.x = Math.PI / 2;
    gun.position.set(0, 0.5, 3);
    enemyGroup.add(gun);

    enemyGroup.position.set((Math.random() - 0.5) * 24, 1, -200);
    scene.add(enemyGroup);

    enemies.push({
        mesh: enemyGroup,
        hp: 50,
        lastShot: Date.now(),
        speed: 0.5 + Math.random() * 0.5
    });
}

function spawnBullet(x, y, z, dz, owner) {
    const bulletGeo = new THREE.SphereGeometry(0.4, 8, 8);
    const bulletMat = new THREE.MeshBasicMaterial({ color: owner === 'PLAYER' ? 0x00f2ff : 0xff3131 });
    const bullet = new THREE.Mesh(bulletGeo, bulletMat);
    bullet.position.set(x, y, z);
    scene.add(bullet);
    bullets.push({ mesh: bullet, dz, owner });
}

function spawnExplosion(pos) {
    for (let i = 0; i < 10; i++) {
        const pGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const pMat = new THREE.MeshBasicMaterial({ color: 0xff9d00 });
        const p = new THREE.Mesh(pGeo, pMat);
        p.position.copy(pos);
        scene.add(p);
        particles.push({
            mesh: p,
            life: 1.0,
            vel: new THREE.Vector3((Math.random() - 0.5) * 1, (Math.random() - 0.5) * 1, (Math.random() - 0.5) * 1)
        });
    }
}

function update() {
    if (gameState !== 'PLAYING') return;

    // Movimento Player
    const delta = clock.getDelta();

    if (keys['KeyA'] || keys['ArrowLeft']) player.x = Math.max(player.x - 0.5, -12);
    if (keys['KeyD'] || keys['ArrowRight']) player.x = Math.min(player.x + 0.5, 12);
    if (keys['KeyW'] || keys['ArrowUp']) player.z = Math.max(player.z - 0.5, -100);
    if (keys['KeyS'] || keys['ArrowDown']) player.z = Math.min(player.z + 0.5, 10);

    playerObj.position.x = player.x;
    playerObj.position.z = player.z;

    // Smoother camera follow
    camera.position.x += (player.x - camera.position.x) * 0.1;
    camera.position.z = player.z + 30;

    // Atirar
    if (keys['LeftClick'] && Date.now() - player.lastShot > player.fireRate) {
        spawnBullet(player.x - 2.5, 1.5, player.z - 3, -2, 'PLAYER');
        player.lastShot = Date.now();
    }

    // Balas
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.mesh.position.z += b.dz;

        if (Math.abs(b.mesh.position.z) > 500) {
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
                        player.money += 50;
                        player.score += 500;
                    }
                }
            });
        } else {
            if (b.mesh.position.distanceTo(playerObj.position) < 3) {
                player.hp -= 10;
                scene.remove(b.mesh);
                bullets.splice(i, 1);
                if (player.hp <= 0) endGame();
            }
        }
    }

    // Inimigos
    if (Math.random() < 0.02) spawnEnemy();

    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        e.mesh.position.z += e.speed + 1; // Relativo à velocidade da pista

        if (e.mesh.position.z > 50) {
            scene.remove(e.mesh);
            enemies.splice(i, 1);
            continue;
        }

        // IA de Tiro
        if (Date.now() - e.lastShot > 2000 && e.mesh.position.z < player.z) {
            spawnBullet(e.mesh.position.x, 1.5, e.mesh.position.z + 4, 1.5, 'ENEMY');
            e.lastShot = Date.now();
        }

        // Colisão Player-Enemy
        if (e.mesh.position.distanceTo(playerObj.position) < 5) {
            player.hp -= 20;
            spawnExplosion(e.mesh.position);
            scene.remove(e.mesh);
            enemies.splice(i, i);
            if (player.hp <= 0) endGame();
        }
    }

    // Partículas
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.mesh.position.add(p.vel);
        p.life -= 0.02;
        p.mesh.scale.setScalar(p.life);
        if (p.life <= 0) {
            scene.remove(p.mesh);
            particles.splice(i, 1);
        }
    }

    // Recursos
    player.fuel -= 0.02;
    player.tireHealth -= 0.01;
    player.score += 1;
    if (player.fuel <= 0 || player.tireHealth <= 0) endGame();

    updateUI();
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

    speedEl.innerText = Math.floor(120 + Math.random() * 5); // Simulação visual de vibração
}

function endGame() {
    gameState = 'GAMEOVER';
    overlay.classList.remove('hidden');
    finalScoreEl.innerText = player.score;
    startBtn.textContent = 'REINICIAR CORRIDA';
}

function animate() {
    requestAnimationFrame(animate);
    update();
    renderer.render(scene, camera);
}

// Iniciar quando a página carregar
window.onload = init3D;

// Handle resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
