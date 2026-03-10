/**
 * Velocity Strategy: 3D Death Race (Aesthetic & Vehicle Overhaul)
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
    carLevel: 0
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
    telemetry: document.getElementById('telemetry')
};

function init3D() {
    scene = new THREE.Scene();

    // 🌅 Céu Alaranjado Realista
    const skyColor = 0xffa500; // Laranja Por do Sol
    scene.background = new THREE.Color(skyColor);
    scene.fog = new THREE.Fog(skyColor, 50, 450);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 12, 28);
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas'), antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const sun = new THREE.DirectionalLight(0xffcc00, 2);
    sun.position.set(50, 200, -100);
    scene.add(sun);

    // 🛣️ Estrada Infinita com Desenhos (Procedural Texture)
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Fundo da estrada
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, 512, 512);

    // Desenhos/Padrões na estrada
    ctx.strokeStyle = '#ffa500';
    ctx.lineWidth = 2;
    for (let i = 0; i < 10; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * 512, Math.random() * 512);
        ctx.lineTo(Math.random() * 512, Math.random() * 512);
        ctx.stroke();

        ctx.strokeRect(Math.random() * 400, Math.random() * 400, 50, 50);
        ctx.beginPath();
        ctx.arc(Math.random() * 512, Math.random() * 512, 20, 0, Math.PI * 2);
        ctx.stroke();
    }

    const roadTxt = new THREE.CanvasTexture(canvas);
    roadTxt.wrapS = THREE.RepeatWrapping;
    roadTxt.wrapT = THREE.RepeatWrapping;
    roadTxt.repeat.set(1, 40);

    const roadGeo = new THREE.PlaneGeometry(60, 2000);
    const roadMat = new THREE.MeshStandardMaterial({
        map: roadTxt,
        roughness: 0.8
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

    // Cor Azul Claro Neon
    let mainColor = 0x00f2ff;
    if (player.carLevel === 1) mainColor = 0x00ffaa;
    if (player.carLevel === 2) mainColor = 0xe0e0e0;

    // 🏎️ Corpo Geométrico (Triângulos e Quadrados)
    // Chassi Base
    const base = new THREE.Mesh(
        new THREE.BoxGeometry(4.2, 0.8, 8),
        new THREE.MeshStandardMaterial({ color: mainColor, emissive: mainColor, emissiveIntensity: 0.2 })
    );
    playerObj.add(base);

    // Cabine (Forma Angular)
    const cabinGeo = new THREE.CylinderGeometry(1.5, 2.5, 2, 4); // Pirâmide truncada (quadrada)
    const cabin = new THREE.Mesh(cabinGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 }));
    cabin.rotation.y = Math.PI / 4;
    cabin.position.set(0, 1.2, -0.5);
    playerObj.add(cabin);

    // Spoiler Traseiro (Triangular feel)
    const spoiler = new THREE.Mesh(
        new THREE.BoxGeometry(4.5, 0.2, 1.5),
        new THREE.MeshStandardMaterial({ color: mainColor })
    );
    spoiler.position.set(0, 1.5, 3.5);
    playerObj.add(spoiler);

    // 🛞 4 RODAS (Cilindros)
    const wheelGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.8, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

    const wheelPositions = [
        [-2.2, 0, -2.5], [2.2, 0, -2.5], // Frontais
        [-2.2, 0, 2.5], [2.2, 0, 2.5]    // Traseiras
    ];

    wheelPositions.forEach(pos => {
        const w = new THREE.Mesh(wheelGeo, wheelMat);
        w.rotation.z = Math.PI / 2;
        w.position.set(...pos);
        playerObj.add(w);
    });

    // Canhão Lateral
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 3), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    gun.position.set(-2.3, 0.8, 1);
    playerObj.add(gun);

    playerObj.position.y = 0.8;
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
                if (item === 'weapon') player.fireRate *= 0.8;
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
    player.speed = player.baseSpeed;
    enemies.forEach(e => scene.remove(e.mesh)); enemies = [];
    bullets.forEach(b => scene.remove(b.mesh)); bullets = [];
}

function spawnEnemy() {
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(5, 2, 8),
        new THREE.MeshStandardMaterial({ color: [0xff00ea, 0x39ff14, 0xff3131][Math.floor(Math.random() * 3)] })
    );
    mesh.position.set((Math.random() - 0.5) * 50, 1.2, player.z - 300);
    scene.add(mesh);
    enemies.push({ mesh, hp: 60, lastShot: Date.now(), speed: 5 + Math.random() * 5 });
}

function animate() {
    requestAnimationFrame(animate);
    if (gameState === 'PLAYING') {
        if (keys['KeyW']) player.speed = Math.min(player.speed + 0.5, player.maxSpeed);
        else if (keys['KeyS']) player.speed = Math.max(player.speed - 1.0, 30);
        else player.speed = (player.speed > player.baseSpeed) ? player.speed - 0.2 : player.speed + 0.2;

        if (keys['KeyA']) player.x = Math.max(player.x - 0.8, -25);
        if (keys['KeyD']) player.x = Math.min(player.x + 0.8, 25);

        player.z -= player.speed * 0.1;
        playerObj.position.set(player.x, 0.8, player.z);

        camera.position.x += (player.x - camera.position.x) * 0.1;
        camera.position.z = player.z + 30 + (player.speed * 0.2);
        camera.lookAt(player.x, 2, player.z - 30);

        if (Math.abs(player.z - road.position.z) > 400) road.position.z = player.z;

        if (keys.shoot && Date.now() - player.lastShot > player.fireRate) {
            const b = new THREE.Mesh(new THREE.SphereGeometry(0.5), new THREE.MeshBasicMaterial({ color: 0x00f2ff }));
            b.position.set(player.x - 2.3, 1.6, player.z - 4);
            scene.add(b); bullets.push({ mesh: b, dz: -16, owner: 'PLAYER' });
            player.lastShot = Date.now();
        }

        if (Math.random() < 0.015) spawnEnemy();
        updateSystems();
        updateUI();
    }
    renderer.render(scene, camera);
}

function updateSystems() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i]; b.mesh.position.z += b.dz;
        if (Math.abs(b.mesh.position.z - player.z) > 500) { scene.remove(b.mesh); bullets.splice(i, 1); continue; }
        if (b.owner === 'PLAYER' && b.mesh) {
            enemies.forEach((e, ei) => {
                if (e.mesh && b.mesh.position.distanceTo(e.mesh.position) < 5) {
                    e.hp -= player.damage; scene.remove(b.mesh); bullets.splice(i, 1);
                    if (e.hp <= 0) { scene.remove(e.mesh); enemies.splice(ei, 1); player.money += 75; player.score += 1000; }
                }
            });
        } else if (b.mesh && b.mesh.position.distanceTo(playerObj.position) < 4) {
            hitPlayer(15); scene.remove(b.mesh); bullets.splice(i, 1);
        }
    }

    enemies.forEach((e, ei) => {
        e.mesh.position.z += (player.speed * 0.04) + e.speed;
        if (e.mesh.position.z > player.z + 100) { scene.remove(e.mesh); enemies.splice(ei, 1); }
        if (Date.now() - e.lastShot > 1200 && e.mesh.position.z < player.z) {
            const b = new THREE.Mesh(new THREE.SphereGeometry(0.5), new THREE.MeshBasicMaterial({ color: 0xff3131 }));
            b.position.set(e.mesh.position.x, 1.8, e.mesh.position.z + 5);
            scene.add(b); bullets.push({ mesh: b, dz: 12, owner: 'ENEMY' });
            e.lastShot = Date.now();
        }
        if (e.mesh.position.distanceTo(playerObj.position) < 6) {
            hitPlayer(25); scene.remove(e.mesh); enemies.splice(ei, 1);
        }
    });

    player.fuel -= 0.025; player.tireHealth -= 0.012;
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

    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.disabled = player.money < shopPrices[btn.dataset.item];
    });
}

window.onload = init3D;
window.onresize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
};
