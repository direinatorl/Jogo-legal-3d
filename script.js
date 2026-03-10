/**
 * Velocity Strategy: 3D Death Race (Hyper-Speed Edition)
 * Straight Infinite Highway & 224Km/h Limit
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
    baseSpeed: 54, // Aprox 150 Km/h em escala visual (54 * 2.8 ≈ 150)
    maxSpeed: 54,
    hp: 100, money: 0,
    fuel: 100, tireHealth: 100, score: 0, lastShot: 0,
    fireRate: 400, damage: 25,
    carLevel: 0
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

// --- PREÇOS DA LOJA (Inflação de 50%) ---
let shopPrices = {
    car1: 500,
    car2: 1200,
    weapon: 100,
    fuel: 150,
    tires: 200,
    health: 50
};

function init3D() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020305);
    scene.fog = new THREE.Fog(0x020305, 50, 400);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1500);
    camera.position.set(0, 12, 28);
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas'), antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const sun = new THREE.DirectionalLight(0x00f2ff, 2);
    sun.position.set(20, 50, 10);
    scene.add(sun);

    // Estrutura da Estrada Infinita (Reta Única)
    const roadGeo = new THREE.PlaneGeometry(60, 2000); // Mais larga
    const roadMat = new THREE.MeshStandardMaterial({
        color: 0x0a0a0a,
        roughness: 0.9,
        metalness: 0.1
    });
    road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    scene.add(road);

    // Grid Digital (Feedback de velocidade)
    const grid = new THREE.GridHelper(2000, 100, 0x00f2ff, 0x111111);
    grid.position.y = 0.1;
    scene.add(grid);

    createPlayer();
    setupEvents();
    animate();
}

function createPlayer() {
    if (playerObj) scene.remove(playerObj);
    playerObj = new THREE.Group();

    // Cor Azul Claro (Neon)
    let color = 0x00f2ff;
    if (player.carLevel === 1) color = 0x00ffaa; // Sport
    if (player.carLevel === 2) color = 0xffffff; // Hyper-Drive

    const chassi = new THREE.Mesh(
        new THREE.BoxGeometry(4, 1, 8),
        new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.5 })
    );
    playerObj.add(chassi);

    const cockpit = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, 0.8, 3),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 })
    );
    cockpit.position.set(0, 0.9, -1);
    playerObj.add(cockpit);

    const cannon = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.5, 3.5),
        new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    cannon.position.set(-2.2, 0.5, 1);
    playerObj.add(cannon);

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
            spawnEnemy(); // Carro aparece ao clicar!
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

                // Aplicar Upgrade
                if (item === 'car1') { player.carLevel = 1; player.maxSpeed = 64; createPlayer(); }
                if (item === 'car2') { player.carLevel = 2; player.maxSpeed = 80; createPlayer(); }
                if (item === 'weapon') player.fireRate *= 0.8;
                if (item === 'fuel') player.fuel = 100;
                if (item === 'tires') player.tireHealth = 100;
                if (item === 'health') player.hp = Math.min(100, player.hp + 25);

                // Inflação de 50% (Arredondado para cima)
                shopPrices[item] = Math.ceil(shopPrices[item] * 1.5);
                btn.dataset.price = shopPrices[item];
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
    player.speed = player.baseSpeed; // Velocidade padrão 150 Km/h
    enemies.forEach(e => scene.remove(e.mesh)); enemies = [];
    bullets.forEach(b => scene.remove(b.mesh)); bullets = [];
}

function spawnEnemy() {
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(4.5, 1.5, 7.5),
        new THREE.MeshStandardMaterial({ color: [0xff00ea, 0x39ff14, 0xff3131][Math.floor(Math.random() * 3)], emissiveIntensity: 0.5 })
    );
    mesh.position.set((Math.random() - 0.5) * 50, 1.2, player.z - 300);
    scene.add(mesh);
    enemies.push({ mesh, hp: 60, lastShot: Date.now(), speed: 5 + Math.random() * 5 });
}

function animate() {
    requestAnimationFrame(animate);
    if (gameState === 'PLAYING') {
        // WASD & Hyper-Speed Logic
        if (keys['KeyW']) player.speed = Math.min(player.speed + 0.5, player.maxSpeed);
        else if (keys['KeyS']) player.speed = Math.max(player.speed - 1.0, 30); // Não para total, mantém fluxo
        else player.speed = (player.speed > player.baseSpeed) ? player.speed - 0.2 : player.speed + 0.2;

        if (keys['KeyA']) player.x = Math.max(player.x - 0.8, -25);
        if (keys['KeyD']) player.x = Math.min(player.x + 0.8, 25);

        player.z -= player.speed * 0.1;
        playerObj.position.set(player.x, 1, player.z);

        // Dynamic Camera Based on Speed
        camera.position.x += (player.x - camera.position.x) * 0.1;
        camera.position.z = player.z + 30 + (player.speed * 0.2);
        camera.lookAt(player.x, 2, player.z - 30);

        // Infinite Road (Seamless Loop)
        if (Math.abs(player.z - road.position.z) > 400) {
            road.position.z = player.z;
        }

        // Shoot
        if (keys.shoot && Date.now() - player.lastShot > player.fireRate) {
            const b = new THREE.Mesh(new THREE.SphereGeometry(0.5), new THREE.MeshBasicMaterial({ color: 0x00f2ff }));
            b.position.set(player.x - 2.2, 1.8, player.z - 4);
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

        if (b.owner === 'PLAYER') {
            enemies.forEach((e, ei) => {
                if (b.mesh.position.distanceTo(e.mesh.position) < 5) {
                    e.hp -= player.damage; scene.remove(b.mesh); bullets.splice(i, 1);
                    if (e.hp <= 0) { spawnExplosion(e.mesh.position); scene.remove(e.mesh); enemies.splice(ei, 1); player.money += 75; player.score += 1000; }
                }
            });
        } else if (b.mesh.position.distanceTo(playerObj.position) < 4) {
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

function spawnExplosion(pos) {
    for (let i = 0; i < 20; i++) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshBasicMaterial({ color: 0xff9100 }));
        p.position.copy(pos);
        scene.add(p);
        particles.push({ mesh: p, life: 1.0, vel: new THREE.Vector3((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2) });
    }
}

function updateUI() {
    UI.money.innerText = `$${player.money}`;
    UI.score.innerText = player.score.toString().padStart(7, '0');
    UI.hpBar.style.width = `${player.hp}%`;
    UI.fuelBar.style.width = `${player.fuel}%`;
    UI.tireBar.style.width = `${player.tireHealth}%`;
    UI.fuelPct.innerText = `${Math.floor(player.fuel)}%`;
    UI.tirePct.innerText = `${Math.floor(player.tireHealth)}%`;
    UI.speed.innerText = Math.max(0, Math.floor(player.speed * 2.8)); // 2.8 fator para escala Km/h

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
