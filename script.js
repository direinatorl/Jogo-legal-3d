/**
 * Velocity Strategy: 3D Death Race (The Golden Hour Overhaul)
 * Realistic Orange Sky, Patterned Highway & 4-Wheeled Geometric Car
 */

// --- THREE.JS CORE ---
let scene, camera, renderer, clock = new THREE.Clock();
let road, playerObj, lastStateBeforeShop = 'MENU';
let enemies = [], bullets = [], particles = [];
let keys = {};

// --- GAME STATE ---
let gameState = 'MENU';
let player = {
    x: 0, z: 0,
    speed: 0,
    baseSpeed: 54, // ~150 Km/h
    maxSpeed: 54,
    hp: 100, money: 0,
    fuel: 100, tireHealth: 100, score: 0, lastShot: 0,
    fireRate: 400, damage: 25,
    carLevel: 0, timer: 0
};

// --- LOJA ---
let shopPrices = {
    car1: 500,
    car2: 1200,
    weapon: 100,
    fuel: 150,
    tires: 200,
    health: 50
};

// --- UI REFS ---
const UI = {
    money: document.getElementById('money-val'),
    score: document.getElementById('score-val'),
    hpBar: document.getElementById('hp-bar'),
    fuelBar: document.getElementById('fuel-bar'),
    tireBar: document.getElementById('tire-bar'),
    fuelPct: document.getElementById('fuel-pct'),
    tirePct: document.getElementById('tire-pct'),
    speed: document.getElementById('speed-val'),
    mainMenu: document.getElementById('main-menu'),
    shopPanel: document.getElementById('shop-panel'),
    startPanel: document.getElementById('start-panel'),
    gameOver: document.getElementById('overlay'),
    finalScore: document.getElementById('final-score'),
    damageOverlay: document.getElementById('damage-overlay'),
    hud: document.getElementById('hud-top'),
    telemetry: document.getElementById('telemetry'),
    timerVal: document.getElementById('timer-val')
};

function init3D() {
    scene = new THREE.Scene();

    // 🌅 Céu Alaranjado Realista de Pôr do Sol
    const skyColor = 0xff6600; // Laranja Por do Sol intenso
    const groundColor = 0x331100; // Solo escurecido
    scene.background = new THREE.Color(skyColor);
    scene.fog = new THREE.Fog(skyColor, 50, 500); // Neblina mais profunda

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 12, 28);
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas'), antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    // Sol no horizonte - Luz mais rica
    const sun = new THREE.DirectionalLight(0xffaa22, 2.5);
    sun.position.set(50, 100, -250);
    scene.add(sun);

    const fillLight = new THREE.PointLight(0xff6600, 1, 300);
    fillLight.position.set(0, 50, 0);
    scene.add(fillLight);

    // 🛣️ Estrada Infinita com Desenhos/Padrões Tech
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Asfalto escuro
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, 512, 512);

    // Padrões Geométricos e Desenhos Tecnológicos na Estrada
    ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const size = 20 + Math.random() * 60;

        ctx.strokeStyle = `rgba(255, 100, 0, ${0.1 + Math.random() * 0.3})`;

        // Formas diversas
        if (i % 3 === 0) {
            ctx.strokeRect(x, y, size, size);
        } else if (i % 3 === 1) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + size, y + size / 2);
            ctx.lineTo(x, y + size);
            ctx.closePath();
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.arc(x, y, size / 2, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Linhas de "Circuito"
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
    }

    const roadTxt = new THREE.CanvasTexture(canvas);
    roadTxt.wrapS = THREE.RepeatWrapping;
    roadTxt.wrapT = THREE.RepeatWrapping;
    roadTxt.repeat.set(2, 60);

    const roadGeo = new THREE.PlaneGeometry(80, 2000);
    const roadMat = new THREE.MeshStandardMaterial({
        map: roadTxt,
        roughness: 0.9,
        metalness: 0.1
    });
    road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    scene.add(road);

    createPlayer();
    setupEvents();
    animate();
}

function createPlayer() {
    if (playerObj) scene.remove(playerObj);
    playerObj = new THREE.Group();

    let mainColor = 0x00f2ff;
    if (player.carLevel === 1) mainColor = 0x00ffcc;
    if (player.carLevel === 2) mainColor = 0xffffff;

    // 🏎️ CORPO GEOMÉTRICO (Triângulos e Quadrados)
    // Chassi (Quadrados/Caixas)
    const chassiBase = new THREE.Mesh(
        new THREE.BoxGeometry(4.2, 0.7, 9),
        new THREE.MeshStandardMaterial({ color: mainColor, emissive: mainColor, emissiveIntensity: 0.2 })
    );
    playerObj.add(chassiBase);

    // Cabine Angular (Triângulos/Pirâmide)
    const cabinGeo = new THREE.ConeGeometry(2, 2.5, 4); // Pirâmide quadrada
    const cabin = new THREE.Mesh(cabinGeo, new THREE.MeshStandardMaterial({
        color: 0x222222,
        metalness: 1,
        roughness: 0,
        transparent: true,
        opacity: 0.8
    }));
    cabin.rotation.y = Math.PI / 4;
    cabin.position.set(0, 1.2, -1);
    playerObj.add(cabin);

    // Spoiler Geométrico Posterior
    const spoiler = new THREE.Mesh(
        new THREE.BoxGeometry(4.5, 0.4, 1.5),
        new THREE.MeshStandardMaterial({ color: mainColor })
    );
    spoiler.position.set(0, 1.8, 3.8);
    playerObj.add(spoiler);

    // 🛞 4 RODAS REAIS (Cilindros)
    const wheelGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.8, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

    const wheelPositions = [
        [-2.3, 0.1, -3], [2.3, 0.1, -3], // Frontais
        [-2.3, 0.1, 3], [2.3, 0.1, 3]    // Traseiras
    ];

    wheelPositions.forEach(pos => {
        const w = new THREE.Mesh(wheelGeo, wheelMat);
        w.rotation.z = Math.PI / 2;
        w.position.set(...pos);
        playerObj.add(w);
    });

    // Canhão
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 3.5), new THREE.MeshStandardMaterial({ color: 0x333333 }));
    gun.position.set(-2.4, 0.8, 0.5);
    playerObj.add(gun);

    playerObj.position.y = 1;
    scene.add(playerObj);
}

function setupEvents() {
    window.addEventListener('keydown', e => {
        keys[e.code] = true;
        if (e.code === 'KeyC') handleStart();
        if (e.code === 'KeyP') toggleShop();
    });
    window.addEventListener('keyup', e => keys[e.code] = false);
    window.addEventListener('mousedown', () => {
        if (gameState === 'PLAYING') {
            keys.shoot = true;
            spawnEnemy();
        }
    });
    window.addEventListener('mouseup', () => { keys.shoot = false; });

    document.getElementById('tab-start').onclick = () => showTab('start');
    document.getElementById('tab-shop').onclick = () => showTab('shop');
    document.getElementById('start-btn').onclick = handleStart;
    document.getElementById('close-shop-btn').onclick = toggleShop;
    document.getElementById('restart-btn').onclick = handleStart;

    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.onclick = () => {
            const item = btn.dataset.item;
            const price = shopPrices[item];
            if (player.money >= price) {
                player.money -= price;
                if (item === 'car1') { player.carLevel = 1; player.maxSpeed = 64; createPlayer(); }
                if (item === 'car2') { player.carLevel = 2; player.maxSpeed = 80; createPlayer(); }
                if (item === 'weapon') player.fireRate *= 0.85;
                if (item === 'fuel') player.fuel = 100;
                if (item === 'tires') player.tireHealth = 100;
                if (item === 'health') player.hp = Math.min(100, player.hp + 25);

                shopPrices[item] = Math.ceil(shopPrices[item] * 1.5);
                btn.innerText = `Comprar ($${shopPrices[item]})`;
                updateUI();
            }
        };
    });
}

function showTab(type) {
    document.getElementById('tab-start').classList.toggle('active', type === 'start');
    document.getElementById('tab-shop').classList.toggle('active', type === 'shop');
    UI.startPanel.classList.toggle('hidden', type !== 'start');
    UI.shopPanel.classList.toggle('hidden', type !== 'shop');
}

function handleStart() {
    if (gameState === 'SHOP') toggleShop();
    if (gameState === 'MENU' || gameState === 'GAMEOVER') resetGame();
    gameState = 'PLAYING';
    UI.mainMenu.classList.add('hidden');
    UI.gameOver.classList.add('hidden');
    UI.hud.classList.remove('hidden');
    UI.telemetry.classList.remove('hidden');
}

function toggleShop() {
    if (gameState === 'MENU' || gameState === 'PLAYING' || gameState === 'SHOP') {
        const isCurrentlyShop = gameState === 'SHOP';
        if (!isCurrentlyShop) {
            lastStateBeforeShop = gameState;
            gameState = 'SHOP';
            UI.mainMenu.classList.remove('hidden');
            showTab('shop');
        } else {
            gameState = lastStateBeforeShop || 'MENU';
            if (gameState === 'PLAYING') UI.mainMenu.classList.add('hidden');
            else showTab('start');
        }
    }
}

function resetGame() {
    player.hp = 100; player.money = 0; player.fuel = 100; player.tireHealth = 100;
    player.score = 0; player.x = 0; player.z = 0;
    player.speed = player.baseSpeed; player.timer = 0;
    enemies.forEach(e => scene.remove(e.mesh)); enemies = [];
    bullets.forEach(b => scene.remove(b.mesh)); bullets = [];
}

function spawnEnemy() {
    const enemyGroup = new THREE.Group();

    // Cores Neon Aleatórias vibrantes
    const hue = Math.random() * 360;
    const color = new THREE.Color(`hsl(${hue}, 100%, 50%)`);

    // Corpo do Inimigo Geometrico
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(5, 1.4, 8),
        new THREE.MeshStandardMaterial({ color: color, roughness: 0.1, metalness: 0.5 })
    );
    enemyGroup.add(body);

    // Detalhe angular superior
    const detailGeo = new THREE.CylinderGeometry(1.2, 2.2, 1.2, 4);
    const detail = new THREE.Mesh(detailGeo, new THREE.MeshStandardMaterial({ color: 0x111111 }));
    detail.position.set(0, 1.2, 0.5);
    detail.rotation.y = Math.PI / 4;
    enemyGroup.add(detail);

    // 🛞 4 RODAS (Cilindros)
    const wheelGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.8, 12);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const wheelPositions = [
        [-2.8, -0.1, -2.5], [2.8, -0.1, -2.5],
        [-2.8, -0.1, 2.5], [2.8, -0.1, 2.5]
    ];
    wheelPositions.forEach(pos => {
        const w = new THREE.Mesh(wheelGeo, wheelMat);
        w.rotation.z = Math.PI / 2;
        w.position.set(...pos);
        enemyGroup.add(w);
    });

    enemyGroup.position.set((Math.random() - 0.5) * 70, 1, player.z - 350);
    scene.add(enemyGroup);

    // Velocidade ainda mais lenta conforme pedido (Reduzido para 2-5 unidades)
    const speed = 2 + Math.random() * 3;
    enemies.push({ mesh: enemyGroup, hp: 60, lastShot: Date.now(), speed: speed });
}

function animate() {
    requestAnimationFrame(animate);
    if (gameState === 'PLAYING') {
        // Movimento WASD
        if (keys['KeyW']) player.speed = Math.min(player.speed + 0.6, player.maxSpeed);
        else if (keys['KeyS']) player.speed = Math.max(player.speed - 1.2, 35);
        else player.speed = (player.speed > player.baseSpeed) ? player.speed - 0.25 : player.speed + 0.25;

        if (keys['KeyA']) player.x = Math.max(player.x - 0.9, -35);
        if (keys['KeyD']) player.x = Math.min(player.x + 0.9, 35);

        player.z -= player.speed * 0.12;
        playerObj.position.set(player.x, 1, player.z);

        // Câmera Dinâmica
        camera.position.x += (player.x - camera.position.x) * 0.1;
        camera.position.z = player.z + 32 + (player.speed * 0.15);
        camera.lookAt(player.x, 2, player.z - 35);

        // Estrada Infinita
        if (Math.abs(player.z - road.position.z) > 400) road.position.z = player.z;

        // Tiros Rápidos (dz: -20)
        if (keys.shoot && Date.now() - player.lastShot > player.fireRate) {
            const b = new THREE.Mesh(new THREE.SphereGeometry(0.6), new THREE.MeshBasicMaterial({ color: 0x00f2ff }));
            b.position.set(player.x - 2.4, 1.8, player.z - 6);
            scene.add(b); bullets.push({ mesh: b, dz: -20, owner: 'PLAYER' });
            player.lastShot = Date.now();
        }

        // Timer
        player.timer += 1 / 60; // Assumindo ~60fps

        if (Math.random() < 0.02) spawnEnemy();

        updateSystems();
        updateUI();
    }
    renderer.render(scene, camera);
}

function updateSystems() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.mesh.position.z += b.dz;
        if (Math.abs(b.mesh.position.z - player.z) > 600) { scene.remove(b.mesh); bullets.splice(i, 1); continue; }

        if (b.owner === 'PLAYER' && b.mesh) {
            enemies.forEach((e, ei) => {
                if (e.mesh && b.mesh.position.distanceTo(e.mesh.position) < 6) {
                    e.hp -= player.damage; scene.remove(b.mesh); bullets.splice(i, 1);
                    if (e.hp <= 0) { scene.remove(e.mesh); enemies.splice(ei, 1); player.money += 75; player.score += 1500; }
                }
            });
        } else if (b.mesh && b.mesh.position.distanceTo(playerObj.position) < 5) {
            hitPlayer(15); scene.remove(b.mesh); bullets.splice(i, 1);
        }
    }

    enemies.forEach((e, ei) => {
        e.mesh.position.z += (player.speed * 0.05) + e.speed;
        if (e.mesh.position.z > player.z + 150) { scene.remove(e.mesh); enemies.splice(ei, 1); }
        if (Date.now() - e.lastShot > 1400 && e.mesh.position.z < player.z) {
            const bt = new THREE.Mesh(new THREE.SphereGeometry(0.6), new THREE.MeshBasicMaterial({ color: 0xff3300 }));
            bt.position.set(e.mesh.position.x, 2, e.mesh.position.z + 6);
            scene.add(bt); bullets.push({ mesh: bt, dz: 14, owner: 'ENEMY' });
            e.lastShot = Date.now();
        }
        if (e.mesh.position.distanceTo(playerObj.position) < 7) {
            hitPlayer(25); scene.remove(e.mesh); enemies.splice(ei, 1);
        }
    });

    player.fuel -= 0.025; player.tireHealth -= 0.015;
    if (player.fuel <= 0 || player.tireHealth <= 0 || player.hp <= 0) {
        gameState = 'GAMEOVER';
        UI.gameOver.classList.remove('hidden');
        UI.finalScore.innerText = player.score;
    }
}

function hitPlayer(dmg) {
    player.hp -= dmg;
    UI.damageOverlay.classList.add('flash');
    setTimeout(() => UI.damageOverlay.classList.remove('flash'), 100);
}

function updateUI() {
    UI.money.innerText = `$${player.money}`;
    UI.score.innerText = player.score.toString().padStart(7, '0');
    UI.hpBar.style.width = `${player.hp}%`;
    UI.fuelBar.style.width = `${player.fuel}%`;
    UI.tireBar.style.width = `${player.tireHealth}%`;
    UI.fuelPct.innerText = `${Math.floor(player.fuel)}%`;
    UI.tirePct.innerText = `${Math.floor(player.tireHealth)}%`;
    UI.speed.innerText = Math.max(0, Math.floor(player.speed * 2.8));
    UI.timerVal.innerText = `${Math.floor(player.timer)}s`;

    document.querySelectorAll('.buy-btn').forEach(btn => {
        const item = btn.dataset.item;
        btn.disabled = player.money < shopPrices[item];
    });
}

window.onload = init3D;
window.onresize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
};
