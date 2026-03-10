/**
 * Velocity Strategy: 3D Death Race (Geometric Evolution)
 * Final Code for GitHub Migration
 */

// --- THREE.JS CORE ---
let scene, camera, renderer, clock = new THREE.Clock();
let road, playerObj, lastStateBeforeShop = 'MENU';
let enemies = [], bullets = [], particles = [];
let keys = {};

// --- GAME STATE ---
let gameState = 'MENU';
let player = {
    x: 0, z: 0, speed: 0, maxSpeed: 80, hp: 100, money: 0,
    fuel: 100, tireHealth: 100, score: 0, lastShot: 0,
    fireRate: 400, damage: 25
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
    scene.background = new THREE.Color(0x050608);
    scene.fog = new THREE.Fog(0x050608, 40, 350);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 12, 28);
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas'), antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const sun = new THREE.DirectionalLight(0x00f2ff, 1.5);
    sun.position.set(20, 50, 10);
    scene.add(sun);

    // Road (Geometria repetível)
    const roadGeo = new THREE.PlaneGeometry(40, 1000);
    const roadMat = new THREE.MeshStandardMaterial({
        color: 0x111111,
        transparent: true,
        opacity: 0.9
    });
    road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    scene.add(road);

    // Linhas Neon Tiled Digitais
    const gridHelper = new THREE.GridHelper(40, 20, 0x00f2ff, 0x1a1c2c);
    gridHelper.position.y = 0.05;
    scene.add(gridHelper);

    createPlayer();
    setupEvents();
    animate();
}

function createPlayer() {
    playerObj = new THREE.Group();
    // Chassi Azul Claro (Light Blue)
    const chassi = new THREE.Mesh(
        new THREE.BoxGeometry(4, 1.2, 8),
        new THREE.MeshStandardMaterial({ color: 0x00f2ff, emissive: 0x00f2ff, emissiveIntensity: 0.3 })
    );
    playerObj.add(chassi);

    // Cockpit Vidro
    const glass = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, 1, 3),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 })
    );
    glass.position.set(0, 1, -1);
    playerObj.add(glass);

    // Canhão na Esquerda
    const gun = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.5, 3),
        new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    gun.position.set(-2.2, 0.6, 1);
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
    window.addEventListener('mousedown', () => { if (gameState === 'PLAYING') keys.shoot = true; });
    window.addEventListener('mouseup', () => { keys.shoot = false; });

    // Tab Logic
    document.getElementById('tab-start').onclick = () => showTab('start');
    document.getElementById('tab-shop').onclick = () => showTab('shop');
    document.getElementById('start-btn').onclick = handleStart;
    document.getElementById('close-shop-btn').onclick = toggleShop;
    document.getElementById('restart-btn').onclick = handleStart;

    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.onclick = () => {
            const price = parseInt(btn.dataset.price);
            if (player.money >= price) {
                player.money -= price;
                if (btn.dataset.item === 'weapon') player.fireRate *= 0.8;
                if (btn.dataset.item === 'fuel') player.fuel = 100;
                if (btn.dataset.item === 'tires') player.tireHealth = 100;
                if (btn.dataset.item === 'health') player.hp = Math.min(100, player.hp + 25);
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
    player.score = 0; player.x = 0; player.z = 0; player.speed = 0;
    enemies.forEach(e => scene.remove(e.mesh)); enemies = [];
    bullets.forEach(b => scene.remove(b.mesh)); bullets = [];
}

function spawnEnemy() {
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(4, 2, 7),
        new THREE.MeshStandardMaterial({ color: [0xff00ea, 0x39ff14, 0xff3131][Math.floor(Math.random() * 3)] })
    );
    // Armas Inimigas
    const g1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 2), new THREE.MeshBasicMaterial({ color: 0x000 }));
    g1.position.set(-1.2, 0.8, 3); mesh.add(g1);
    const g2 = g1.clone(); g2.position.set(1.2, 0.8, 3); mesh.add(g2);

    mesh.position.set((Math.random() - 0.5) * 30, 1, player.z - 250);
    scene.add(mesh);
    enemies.push({ mesh, hp: 50, lastShot: Date.now(), speed: 0.5 + Math.random() });
}

function animate() {
    requestAnimationFrame(animate);
    if (gameState === 'PLAYING') {
        // WASD Physics
        if (keys['KeyW']) player.speed = Math.min(player.speed + 0.6, player.maxSpeed);
        else if (keys['KeyS']) player.speed = Math.max(player.speed - 0.8, -10);
        else player.speed *= 0.98;

        if (keys['KeyA']) player.x = Math.max(player.x - 0.6, -16);
        if (keys['KeyD']) player.x = Math.min(player.x + 0.6, 16);

        player.z -= player.speed * 0.1;
        playerObj.position.set(player.x, 1, player.z);

        // Camera Follow
        camera.position.x += (player.x - camera.position.x) * 0.1;
        camera.position.z = player.z + 28 + (player.speed * 0.05);
        camera.lookAt(player.x, 2, player.z - 15);

        // Shoot
        if (keys.shoot && Date.now() - player.lastShot > player.fireRate) {
            const b = new THREE.Mesh(new THREE.SphereGeometry(0.4), new THREE.MeshBasicMaterial({ color: 0x00f2ff }));
            b.position.set(player.x - 2.2, 1.6, player.z - 2);
            scene.add(b); bullets.push({ mesh: b, dz: -6, owner: 'PLAYER' });
            player.lastShot = Date.now();
        }

        // Logic
        if (Math.random() < 0.02) spawnEnemy();
        updateSystems();
        updateUI();
    }
    renderer.render(scene, camera);
}

function updateSystems() {
    // Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i]; b.mesh.position.z += b.dz;
        if (Math.abs(b.mesh.position.z - player.z) > 400) { scene.remove(b.mesh); bullets.splice(i, 1); continue; }

        if (b.owner === 'PLAYER') {
            enemies.forEach((e, ei) => {
                if (b.mesh.position.distanceTo(e.mesh.position) < 4) {
                    e.hp -= player.damage; scene.remove(b.mesh); bullets.splice(i, 1);
                    if (e.hp <= 0) { scene.remove(e.mesh); enemies.splice(ei, 1); player.money += 50; player.score += 500; }
                }
            });
        } else if (b.mesh.position.distanceTo(playerObj.position) < 3) {
            hitPlayer(10); scene.remove(b.mesh); bullets.splice(i, 1);
        }
    }

    // Enemies
    enemies.forEach((e, ei) => {
        e.mesh.position.z += player.speed * 0.05 + e.speed;
        if (e.mesh.position.z > player.z + 50) { scene.remove(e.mesh); enemies.splice(ei, 1); }
        if (Date.now() - e.lastShot > 1500 && e.mesh.position.z < player.z) {
            const b = new THREE.Mesh(new THREE.SphereGeometry(0.4), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
            b.position.set(e.mesh.position.x, 1.6, e.mesh.position.z + 4);
            scene.add(b); bullets.push({ mesh: b, dz: 4, owner: 'ENEMY' });
            e.lastShot = Date.now();
        }
        if (e.mesh.position.distanceTo(playerObj.position) < 5) {
            hitPlayer(20); scene.remove(e.mesh); enemies.splice(ei, 1);
        }
    });

    player.fuel -= 0.02; player.tireHealth -= 0.01;
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
    UI.score.innerText = player.score.toString().padStart(6, '0');
    UI.hpBar.style.width = `${player.hp}%`;
    UI.fuelBar.style.width = `${player.fuel}%`;
    UI.tireBar.style.width = `${player.tireHealth}%`;
    UI.fuelPct.innerText = `${Math.floor(player.fuel)}%`;
    UI.tirePct.innerText = `${Math.floor(player.tireHealth)}%`;
    UI.speed.innerText = Math.max(0, Math.floor(player.speed * 2.8));

    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.disabled = player.money < parseInt(btn.dataset.price);
    });
}

window.onload = init3D;
window.onresize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
};
