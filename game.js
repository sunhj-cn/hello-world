(() => {
  "use strict";

  const WORLD = 3600;
  const TAU = Math.PI * 2;
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const minimap = document.getElementById("minimap");
  const miniCtx = minimap.getContext("2d");
  const largeMap = document.getElementById("largeMap");
  const largeCtx = largeMap.getContext("2d");

  const ui = {
    lobby: document.getElementById("lobby"),
    hud: document.getElementById("hud"),
    result: document.getElementById("result"),
    fullMap: document.getElementById("fullMap"),
    alive: document.getElementById("aliveCount"),
    kills: document.getElementById("killCount"),
    zoneLabel: document.getElementById("zoneLabel"),
    zoneTimer: document.getElementById("zoneTimer"),
    healthFill: document.getElementById("healthFill"),
    healthText: document.getElementById("healthText"),
    armorFill: document.getElementById("armorFill"),
    mag: document.getElementById("magAmmo"),
    reserve: document.getElementById("reserveAmmo"),
    weapon: document.getElementById("weaponName"),
    fireMode: document.getElementById("fireMode"),
    medCount: document.getElementById("medCount"),
    prompt: document.getElementById("pickupPrompt"),
    pickupName: document.getElementById("pickupName"),
    planePrompt: document.getElementById("planePrompt"),
    crosshair: document.getElementById("crosshair"),
    killFeed: document.getElementById("killFeed"),
    toast: document.getElementById("toast"),
    compass: document.getElementById("compassText"),
  };

  let width = innerWidth;
  let height = innerHeight;
  let dpr = 1;
  let state = "lobby";
  let lastTime = 0;
  let gameTime = 0;
  let landedAt = 0;
  let camera = { x: WORLD / 2, y: WORLD / 2, shake: 0 };
  let mouse = { x: width / 2, y: height / 2, down: false };
  let keys = {};
  let terrain = {};
  let player = null;
  let bots = [];
  let projectiles = [];
  let particles = [];
  let feed = [];
  let nearestLoot = null;
  let plane = null;
  let zone = null;
  let audio = null;
  let toastTimer = 0;
  let mapOpen = false;
  let rng = mulberry32(421987);
  let touchMove = { x: 0, y: 0 };
  let touchAim = { x: 0, y: 0, firing: false };

  const WEAPONS = [
    { name: "R-5.56", damage: 24, rate: 0.105, magSize: 30, reload: 1.75, speed: 1160, spread: 0.035, color: "#f2c94c" },
    { name: "V9 冲锋枪", damage: 15, rate: 0.062, magSize: 36, reload: 1.4, speed: 960, spread: 0.075, color: "#ef8654" },
  ];

  const BOT_NAMES = [
    "北境孤狼", "海岛斥候", "风暴猎手", "柠檬汽水", "夜航星", "灰色轨迹", "山丘之王", "边境旅人",
    "赤焰", "零度信号", "深海", "战地记者", "公路骑手", "稻草人", "蓝鲸", "荒野行者",
    "疾风07", "沉默火线", "远山", "铁拳", "逆光", "守望者", "霜刃",
  ];

  function mulberry32(seed) {
    return function random() {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function random(min, max) {
    return min + rng() * (max - min);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function resize() {
    width = innerWidth;
    height = innerHeight;
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function generateTerrain() {
    rng = mulberry32(421987);
    const roads = [
      { x: 0, y: 760, w: WORLD, h: 120 },
      { x: 0, y: 2520, w: WORLD, h: 105 },
      { x: 810, y: 0, w: 110, h: WORLD },
      { x: 2660, y: 0, w: 130, h: WORLD },
      { x: 0, y: 0, w: 92, h: 0, diagonal: true },
    ];
    const towns = [
      { x: 570, y: 570, name: "北港" },
      { x: 1810, y: 600, name: "观测站" },
      { x: 2980, y: 620, name: "风车镇" },
      { x: 540, y: 1700, name: "旧工厂" },
      { x: 1760, y: 1730, name: "中心城" },
      { x: 3050, y: 1710, name: "河谷" },
      { x: 650, y: 3040, name: "南部营地" },
      { x: 1900, y: 3000, name: "物流港" },
      { x: 3040, y: 3070, name: "海崖村" },
    ];
    const buildings = [];
    const loot = [];

    towns.forEach((town, townIndex) => {
      const count = townIndex === 4 ? 14 : 8;
      for (let i = 0; i < count; i += 1) {
        const angle = random(0, TAU);
        const radius = random(80, townIndex === 4 ? 330 : 240);
        const w = random(80, 155);
        const h = random(65, 135);
        const building = {
          x: clamp(town.x + Math.cos(angle) * radius - w / 2, 40, WORLD - w - 40),
          y: clamp(town.y + Math.sin(angle) * radius - h / 2, 40, WORLD - h - 40),
          w,
          h,
          tone: Math.floor(random(0, 4)),
        };
        if (!buildings.some((other) => rectsOverlap(building, other, 25))) {
          buildings.push(building);
          const lootCount = Math.floor(random(1, 3.8));
          for (let j = 0; j < lootCount; j += 1) {
            const roll = random(0, 1);
            const type = roll < 0.5 ? "ammo" : roll < 0.72 ? "med" : roll < 0.9 ? "armor" : "crate";
            const side = Math.floor(random(0, 4));
            let lootX;
            let lootY;
            if (side === 0 || side === 2) {
              lootX = building.x + random(16, building.w - 16);
              lootY = side === 0 ? building.y - 20 : building.y + building.h + 20;
            } else {
              lootX = side === 1 ? building.x + building.w + 20 : building.x - 20;
              lootY = building.y + random(16, building.h - 16);
            }
            loot.push({
              x: clamp(lootX, 25, WORLD - 25),
              y: clamp(lootY, 25, WORLD - 25),
              type,
              active: true,
              spin: random(0, TAU),
            });
          }
        }
      }
    });

    const trees = [];
    for (let i = 0; i < 340; i += 1) {
      const tree = { x: random(35, WORLD - 35), y: random(35, WORLD - 35), r: random(12, 25), shade: random(0, 1) };
      if (!buildings.some((b) => pointInExpandedRect(tree, b, 25)) && !onRoad(tree, roads)) trees.push(tree);
    }

    const rocks = [];
    for (let i = 0; i < 75; i += 1) {
      const rock = { x: random(35, WORLD - 35), y: random(35, WORLD - 35), r: random(10, 24), rot: random(0, TAU) };
      if (!buildings.some((b) => pointInExpandedRect(rock, b, 20))) rocks.push(rock);
    }

    terrain = { roads, towns, buildings, trees, rocks, loot };
  }

  function rectsOverlap(a, b, padding = 0) {
    return a.x < b.x + b.w + padding && a.x + a.w + padding > b.x && a.y < b.y + b.h + padding && a.y + a.h + padding > b.y;
  }

  function pointInExpandedRect(point, rect, padding = 0) {
    return point.x > rect.x - padding && point.x < rect.x + rect.w + padding && point.y > rect.y - padding && point.y < rect.y + rect.h + padding;
  }

  function onRoad(point, roads) {
    return roads.some((road) => !road.diagonal && pointInExpandedRect(point, road, 12));
  }

  function makePlayer() {
    return {
      x: -200,
      y: 280,
      r: 15,
      angle: 0,
      hp: 100,
      armor: 50,
      alive: true,
      kills: 0,
      damage: 0,
      speed: 210,
      altitude: 0,
      weaponIndex: 0,
      weapons: [
        { mag: 30, reserve: 120 },
        { mag: 36, reserve: 144 },
      ],
      cooldown: 0,
      reloadTimer: 0,
      healTimer: 0,
      meds: 3,
      invulnerable: 0,
    };
  }

  function spawnBots() {
    bots = BOT_NAMES.map((name, index) => {
      let pos;
      do {
        pos = { x: random(120, WORLD - 120), y: random(120, WORLD - 120) };
      } while (terrain.buildings.some((b) => pointInExpandedRect(pos, b, 25)));
      return {
        id: index,
        name,
        x: pos.x,
        y: pos.y,
        r: 14,
        angle: random(0, TAU),
        hp: 76 + random(0, 24),
        armor: random(0, 55),
        alive: true,
        speed: random(105, 150),
        cooldown: random(0, 1),
        think: random(0, 1),
        wanderAngle: random(0, TAU),
        target: null,
        weapon: rng() > 0.55 ? 1 : 0,
        skill: random(0.35, 0.82),
        color: `hsl(${Math.floor(random(18, 72))} 22% ${Math.floor(random(28, 48))}%)`,
      };
    });
  }

  function resetZone() {
    zone = {
      x: WORLD / 2,
      y: WORLD / 2,
      radius: 1680,
      startX: WORLD / 2,
      startY: WORLD / 2,
      startRadius: 1680,
      targetX: WORLD / 2,
      targetY: WORLD / 2,
      targetRadius: 1680,
      phase: 0,
      timer: 42,
      duration: 18,
      progress: 0,
      shrinking: false,
    };
  }

  function startGame() {
    ensureAudio();
    generateTerrain();
    player = makePlayer();
    spawnBots();
    resetZone();
    projectiles = [];
    particles = [];
    feed = [];
    gameTime = 0;
    landedAt = 0;
    state = "plane";
    plane = { x: -260, y: 360, angle: Math.atan2(2850, 4200), speed: 350 };
    camera.x = plane.x;
    camera.y = plane.y;
    camera.shake = 0;
    ui.lobby.classList.remove("active");
    ui.result.classList.remove("active");
    ui.hud.classList.remove("hidden");
    ui.planePrompt.classList.remove("hidden");
    document.getElementById("mobileJump").classList.remove("hidden");
    showToast("运输机已进入海岛上空 · 选择落点");
    updateHud();
  }

  function jump() {
    if (state !== "plane") return;
    state = "dropping";
    player.x = clamp(plane.x, 60, WORLD - 60);
    player.y = clamp(plane.y, 60, WORLD - 60);
    player.altitude = 700;
    ui.planePrompt.classList.add("hidden");
    document.getElementById("mobileJump").classList.add("hidden");
    showToast("已离机 · 调整方向前往目标区域");
    sound("jump");
  }

  function land() {
    state = "playing";
    player.altitude = 0;
    landedAt = gameTime;
    player.invulnerable = 1.5;
    resolveSolidCollision(player);
    showToast("着陆成功 · 搜集物资，保持警戒");
    sound("land");
  }

  function returnLobby() {
    state = "lobby";
    mouse.down = false;
    ui.hud.classList.add("hidden");
    ui.result.classList.remove("active");
    ui.fullMap.classList.add("hidden");
    ui.lobby.classList.add("active");
  }

  function ensureAudio() {
    if (!audio) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (AudioCtor) audio = new AudioCtor();
    }
    if (audio && audio.state === "suspended") audio.resume();
  }

  function sound(type) {
    if (!audio) return;
    const now = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.connect(gain);
    gain.connect(audio.destination);
    const settings = {
      shot: [110, 48, 0.055, "sawtooth", 0.055],
      hit: [620, 350, 0.07, "square", 0.035],
      pickup: [520, 880, 0.12, "sine", 0.05],
      reload: [180, 120, 0.08, "square", 0.025],
      jump: [230, 90, 0.3, "sine", 0.045],
      land: [80, 40, 0.18, "sine", 0.07],
      hurt: [95, 60, 0.12, "sawtooth", 0.045],
    }[type] || [300, 200, 0.1, "sine", 0.03];
    osc.type = settings[3];
    osc.frequency.setValueAtTime(settings[0], now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, settings[1]), now + settings[2]);
    gain.gain.setValueAtTime(settings[4], now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + settings[2]);
    osc.start(now);
    osc.stop(now + settings[2]);
  }

  function update(dt) {
    if (state === "lobby" || state === "ended") return;
    gameTime += dt;
    camera.shake = Math.max(0, camera.shake - dt * 18);
    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) ui.toast.classList.remove("show");
    }

    if (state === "plane") {
      plane.x += Math.cos(plane.angle) * plane.speed * dt;
      plane.y += Math.sin(plane.angle) * plane.speed * dt;
      player.x = plane.x;
      player.y = plane.y;
      camera.x += (plane.x - camera.x) * Math.min(1, dt * 3);
      camera.y += (plane.y - camera.y) * Math.min(1, dt * 3);
      if (plane.x > WORLD + 70 || plane.y > WORLD + 70) jump();
    } else if (state === "dropping") {
      updateDropping(dt);
    } else if (state === "playing") {
      updatePlayer(dt);
      updateBots(dt);
      updateZone(dt);
      updateProjectiles(dt);
      updateParticles(dt);
      checkLoot();
      checkEndState();
    }
    updateHud();
  }

  function movementVector() {
    let x = 0;
    let y = 0;
    if (keys.KeyW || keys.ArrowUp) y -= 1;
    if (keys.KeyS || keys.ArrowDown) y += 1;
    if (keys.KeyA || keys.ArrowLeft) x -= 1;
    if (keys.KeyD || keys.ArrowRight) x += 1;
    x += touchMove.x;
    y += touchMove.y;
    const length = Math.hypot(x, y);
    return length > 1 ? { x: x / length, y: y / length } : { x, y };
  }

  function updateDropping(dt) {
    const movement = movementVector();
    const parachuteOpen = player.altitude < 300;
    const steerSpeed = parachuteOpen ? 105 : 175;
    player.x = clamp(player.x + movement.x * steerSpeed * dt, 30, WORLD - 30);
    player.y = clamp(player.y + movement.y * steerSpeed * dt, 30, WORLD - 30);
    player.altitude -= (parachuteOpen ? 82 : 165) * dt;
    camera.x += (player.x - camera.x) * Math.min(1, dt * 4);
    camera.y += (player.y - camera.y) * Math.min(1, dt * 4);
    if (player.altitude <= 0) land();
  }

  function updatePlayer(dt) {
    if (!player.alive) return;
    player.cooldown = Math.max(0, player.cooldown - dt);
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    const movement = movementVector();
    const moving = Math.hypot(movement.x, movement.y) > 0.1;
    const old = { x: player.x, y: player.y };
    const sprinting = keys.ShiftLeft || keys.ShiftRight;
    const speed = player.speed * (sprinting ? 1.28 : 1);
    player.x = clamp(player.x + movement.x * speed * dt, player.r, WORLD - player.r);
    player.y = clamp(player.y + movement.y * speed * dt, player.r, WORLD - player.r);
    if (collidesSolid(player)) {
      player.x = old.x;
      player.y = old.y;
      player.x = clamp(player.x + movement.x * speed * dt, player.r, WORLD - player.r);
      if (collidesSolid(player)) player.x = old.x;
      player.y = clamp(player.y + movement.y * speed * dt, player.r, WORLD - player.r);
      if (collidesSolid(player)) player.y = old.y;
    }

    const aimWorld = screenToWorld(mouse.x, mouse.y);
    if (Math.hypot(touchAim.x, touchAim.y) > 0.2) {
      player.angle = Math.atan2(touchAim.y, touchAim.x);
      mouse.x = width / 2 + Math.cos(player.angle) * 110;
      mouse.y = height / 2 + Math.sin(player.angle) * 110;
    } else {
      player.angle = Math.atan2(aimWorld.y - player.y, aimWorld.x - player.x);
    }

    if (player.reloadTimer > 0) {
      player.reloadTimer -= dt;
      if (player.reloadTimer <= 0) finishReload();
    }
    if (player.healTimer > 0) {
      player.healTimer -= dt;
      if (moving || mouse.down || touchAim.firing) {
        player.healTimer = 0;
        showToast("移动或开火中断了治疗");
      } else if (player.healTimer <= 0) {
        player.hp = Math.min(100, player.hp + 65);
        player.meds -= 1;
        showToast("使用急救包 · 生命值已恢复");
        sound("pickup");
      }
    }

    if ((mouse.down || touchAim.firing) && !mapOpen) shootPlayer();
    camera.x += (player.x - camera.x) * Math.min(1, dt * 8);
    camera.y += (player.y - camera.y) * Math.min(1, dt * 8);
  }

  function collidesSolid(entity) {
    return terrain.buildings.some((b) =>
      entity.x + entity.r > b.x &&
      entity.x - entity.r < b.x + b.w &&
      entity.y + entity.r > b.y &&
      entity.y - entity.r < b.y + b.h
    );
  }

  function resolveSolidCollision(entity) {
    for (let tries = 0; tries < 30 && collidesSolid(entity); tries += 1) {
      entity.x += random(-45, 45);
      entity.y += random(-45, 45);
    }
    entity.x = clamp(entity.x, 30, WORLD - 30);
    entity.y = clamp(entity.y, 30, WORLD - 30);
  }

  function shootPlayer() {
    const gun = WEAPONS[player.weaponIndex];
    const ammo = player.weapons[player.weaponIndex];
    if (player.cooldown > 0 || player.reloadTimer > 0 || player.healTimer > 0) return;
    if (ammo.mag <= 0) {
      reload();
      return;
    }
    ammo.mag -= 1;
    player.cooldown = gun.rate;
    player.healTimer = 0;
    fireProjectile(player, player.angle + random(-gun.spread, gun.spread), gun, "player");
    camera.shake = Math.min(8, camera.shake + 2.2);
    ui.crosshair.classList.add("firing");
    setTimeout(() => ui.crosshair.classList.remove("firing"), 70);
    sound("shot");
  }

  function fireProjectile(owner, angle, gun, source) {
    projectiles.push({
      x: owner.x + Math.cos(angle) * 22,
      y: owner.y + Math.sin(angle) * 22,
      lastX: owner.x,
      lastY: owner.y,
      vx: Math.cos(angle) * gun.speed,
      vy: Math.sin(angle) * gun.speed,
      damage: gun.damage,
      life: 1.15,
      source,
      owner,
      color: gun.color,
    });
    for (let i = 0; i < 3; i += 1) {
      particles.push({
        x: owner.x + Math.cos(angle) * 24,
        y: owner.y + Math.sin(angle) * 24,
        vx: Math.cos(angle) * random(35, 100) + random(-25, 25),
        vy: Math.sin(angle) * random(35, 100) + random(-25, 25),
        life: random(0.05, 0.14),
        maxLife: 0.14,
        color: "#ffd65c",
        size: random(2, 5),
      });
    }
  }

  function reload() {
    if (!player || state !== "playing" || player.reloadTimer > 0) return;
    const gun = WEAPONS[player.weaponIndex];
    const ammo = player.weapons[player.weaponIndex];
    if (ammo.mag >= gun.magSize || ammo.reserve <= 0) return;
    player.reloadTimer = gun.reload;
    player.healTimer = 0;
    showToast(`正在更换 ${gun.name} 弹匣…`);
    sound("reload");
  }

  function finishReload() {
    const gun = WEAPONS[player.weaponIndex];
    const ammo = player.weapons[player.weaponIndex];
    const needed = gun.magSize - ammo.mag;
    const moved = Math.min(needed, ammo.reserve);
    ammo.mag += moved;
    ammo.reserve -= moved;
  }

  function heal() {
    if (!player || state !== "playing" || player.healTimer > 0) return;
    if (player.meds <= 0) return showToast("急救包不足");
    if (player.hp >= 95) return showToast("当前生命值无需治疗");
    player.reloadTimer = 0;
    player.healTimer = 3.2;
    showToast("正在使用急救包 · 保持静止");
  }

  function switchWeapon(index) {
    if (!player || index < 0 || index > 1) return;
    player.weaponIndex = index;
    player.reloadTimer = 0;
    player.cooldown = 0.18;
    document.querySelectorAll(".weapon-slot").forEach((slot, i) => slot.classList.toggle("active", i === index));
    updateHud();
  }

  function updateBots(dt) {
    const living = bots.filter((bot) => bot.alive);
    living.forEach((bot) => {
      bot.cooldown = Math.max(0, bot.cooldown - dt);
      bot.think -= dt;
      if (bot.think <= 0) {
        bot.think = random(0.3, 0.8);
        const candidates = living.filter((other) => other !== bot && distance(bot, other) < 520);
        if (player.alive && distance(bot, player) < 620) candidates.push(player);
        bot.target = candidates.sort((a, b) => distance(bot, a) - distance(bot, b))[0] || null;
        if (!bot.target) {
          const zoneDist = Math.hypot(bot.x - zone.x, bot.y - zone.y);
          if (zoneDist > zone.radius * 0.72) bot.wanderAngle = Math.atan2(zone.y - bot.y, zone.x - bot.x) + random(-0.3, 0.3);
          else if (rng() < 0.4) bot.wanderAngle += random(-1.5, 1.5);
        }
      }

      let moveAngle = bot.wanderAngle;
      if (bot.target && bot.target.alive !== false) {
        const targetDist = distance(bot, bot.target);
        const targetAngle = Math.atan2(bot.target.y - bot.y, bot.target.x - bot.x);
        bot.angle = targetAngle;
        if (targetDist > 255) moveAngle = targetAngle;
        else if (targetDist < 145) moveAngle = targetAngle + Math.PI;
        else moveAngle = targetAngle + Math.PI / 2 * (bot.id % 2 ? 1 : -1);
        if (targetDist < 560 && bot.cooldown <= 0 && lineOfSight(bot, bot.target)) {
          const gun = WEAPONS[bot.weapon];
          const error = (1 - bot.skill) * 0.26 + gun.spread;
          fireProjectile(bot, targetAngle + random(-error, error), gun, "bot");
          bot.cooldown = gun.rate * random(2.3, 4.6);
        }
      } else {
        bot.angle += angleDiff(bot.angle, moveAngle) * Math.min(1, dt * 3);
      }

      const oldX = bot.x;
      const oldY = bot.y;
      bot.x = clamp(bot.x + Math.cos(moveAngle) * bot.speed * dt, bot.r, WORLD - bot.r);
      bot.y = clamp(bot.y + Math.sin(moveAngle) * bot.speed * dt, bot.r, WORLD - bot.r);
      if (collidesSolid(bot)) {
        bot.x = oldX;
        bot.y = oldY;
        bot.wanderAngle += Math.PI * random(0.4, 0.9);
      }

      if (Math.hypot(bot.x - zone.x, bot.y - zone.y) > zone.radius) {
        bot.hp -= dt * (zone.phase < 2 ? 2.5 : 5 + zone.phase * 1.7);
        if (bot.hp <= 0) killBot(bot, null, "信号区");
      }
    });
  }

  function angleDiff(from, to) {
    return Math.atan2(Math.sin(to - from), Math.cos(to - from));
  }

  function lineOfSight(from, to) {
    const steps = Math.ceil(distance(from, to) / 45);
    for (let i = 1; i < steps; i += 1) {
      const point = { x: from.x + (to.x - from.x) * i / steps, y: from.y + (to.y - from.y) * i / steps };
      if (terrain.buildings.some((b) => pointInExpandedRect(point, b, 0))) return false;
    }
    return true;
  }

  function updateProjectiles(dt) {
    for (let i = projectiles.length - 1; i >= 0; i -= 1) {
      const bullet = projectiles[i];
      bullet.lastX = bullet.x;
      bullet.lastY = bullet.y;
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;
      let remove = bullet.life <= 0 || bullet.x < 0 || bullet.x > WORLD || bullet.y < 0 || bullet.y > WORLD;
      if (!remove && terrain.buildings.some((b) => pointInExpandedRect(bullet, b, 0))) {
        spawnImpact(bullet.x, bullet.y, "#c8b98a");
        remove = true;
      }
      if (!remove && bullet.source === "player") {
        const hit = bots.find((bot) => bot.alive && distance(bot, bullet) < bot.r + 5);
        if (hit) {
          applyDamage(hit, bullet.damage, player);
          player.damage += Math.round(bullet.damage);
          hit.target = player;
          spawnImpact(bullet.x, bullet.y, "#e9573f");
          flashHit();
          remove = true;
        }
      } else if (!remove && bullet.source === "bot") {
        if (player.alive && bullet.owner !== player && distance(player, bullet) < player.r + 5) {
          applyDamage(player, bullet.damage, bullet.owner);
          spawnImpact(bullet.x, bullet.y, "#e9573f");
          remove = true;
        } else {
          const hitBot = bots.find((bot) => bot.alive && bot !== bullet.owner && distance(bot, bullet) < bot.r + 4);
          if (hitBot) {
            applyDamage(hitBot, bullet.damage, bullet.owner);
            spawnImpact(bullet.x, bullet.y, "#d96c49");
            remove = true;
          }
        }
      }
      if (remove) projectiles.splice(i, 1);
    }
  }

  function applyDamage(target, amount, attacker) {
    if (target === player && player.invulnerable > 0) return;
    let remaining = amount;
    if (target.armor > 0) {
      const absorbed = Math.min(target.armor, amount * 0.55);
      target.armor -= absorbed;
      remaining -= absorbed * 0.72;
    }
    target.hp -= remaining;
    if (target === player) {
      camera.shake = 8;
      sound("hurt");
    }
    if (target.hp <= 0) {
      if (target === player) killPlayer(attacker);
      else killBot(target, attacker);
    }
  }

  function killBot(bot, attacker, reason) {
    if (!bot.alive) return;
    bot.alive = false;
    bot.hp = 0;
    if (attacker === player) player.kills += 1;
    const attackerName = attacker === player ? "你" : attacker ? attacker.name : reason || "信号区";
    addFeed(`${attackerName} <b>淘汰</b> ${bot.name}`);
    if (rng() < 0.65) {
      terrain.loot.push({
        x: bot.x,
        y: bot.y,
        type: rng() < 0.48 ? "ammo" : rng() < 0.7 ? "med" : "armor",
        active: true,
        spin: 0,
      });
    }
    spawnDeathParticles(bot.x, bot.y);
  }

  function killPlayer(attacker) {
    if (!player.alive) return;
    player.alive = false;
    player.hp = 0;
    mouse.down = false;
    const name = attacker && attacker.name ? attacker.name : "信号区";
    addFeed(`${name} <b>淘汰</b> 你`);
    setTimeout(() => endGame(false), 900);
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.93;
      p.vy *= 0.93;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function spawnImpact(x, y, color) {
    for (let i = 0; i < 7; i += 1) {
      const angle = random(0, TAU);
      const speed = random(35, 150);
      particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: random(0.12, 0.35), maxLife: 0.35, color, size: random(2, 4) });
    }
  }

  function spawnDeathParticles(x, y) {
    for (let i = 0; i < 18; i += 1) {
      const angle = random(0, TAU);
      const speed = random(25, 120);
      particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: random(0.3, 0.8), maxLife: 0.8, color: i % 3 ? "#b5a56c" : "#e05b3e", size: random(2, 6) });
    }
  }

  function updateZone(dt) {
    zone.timer -= dt;
    if (!zone.shrinking && zone.timer <= 0) {
      zone.phase += 1;
      zone.shrinking = true;
      zone.progress = 0;
      zone.duration = Math.max(10, 19 - zone.phase * 1.3);
      zone.startX = zone.x;
      zone.startY = zone.y;
      zone.startRadius = zone.radius;
      const radii = [1680, 1190, 800, 500, 285, 135, 55];
      zone.targetRadius = radii[Math.min(zone.phase, radii.length - 1)];
      const maxOffset = Math.max(0, zone.radius - zone.targetRadius) * 0.65;
      const angle = random(0, TAU);
      const offset = random(0, maxOffset);
      zone.targetX = clamp(zone.x + Math.cos(angle) * offset, zone.targetRadius, WORLD - zone.targetRadius);
      zone.targetY = clamp(zone.y + Math.sin(angle) * offset, zone.targetRadius, WORLD - zone.targetRadius);
      zone.timer = zone.duration;
      showToast(`第 ${zone.phase} 阶段信号区开始收缩`);
    } else if (zone.shrinking) {
      zone.progress = clamp(1 - zone.timer / zone.duration, 0, 1);
      const eased = zone.progress * zone.progress * (3 - 2 * zone.progress);
      zone.x = zone.startX + (zone.targetX - zone.startX) * eased;
      zone.y = zone.startY + (zone.targetY - zone.startY) * eased;
      zone.radius = zone.startRadius + (zone.targetRadius - zone.startRadius) * eased;
      if (zone.timer <= 0) {
        zone.x = zone.targetX;
        zone.y = zone.targetY;
        zone.radius = zone.targetRadius;
        zone.shrinking = false;
        zone.timer = Math.max(17, 36 - zone.phase * 3);
      }
    }

    if (player.alive && Math.hypot(player.x - zone.x, player.y - zone.y) > zone.radius) {
      applyDamage(player, dt * (zone.phase < 2 ? 3 : 5 + zone.phase * 2), null);
    }
  }

  function checkLoot() {
    nearestLoot = null;
    let nearestDistance = 58;
    terrain.loot.forEach((loot) => {
      if (!loot.active) return;
      const d = distance(player, loot);
      if (d < nearestDistance) {
        nearestDistance = d;
        nearestLoot = loot;
      }
      loot.spin += 0.025;
    });
    if (nearestLoot) {
      ui.prompt.classList.remove("hidden");
      ui.pickupName.textContent = lootName(nearestLoot.type);
    } else {
      ui.prompt.classList.add("hidden");
    }
  }

  function lootName(type) {
    return { ammo: "通用弹药 × 40", med: "急救包", armor: "战术护甲", crate: "高级物资箱" }[type] || "物资";
  }

  function pickup() {
    if (!nearestLoot || state !== "playing") return;
    const loot = nearestLoot;
    if (loot.type === "ammo") {
      player.weapons[0].reserve += 40;
      player.weapons[1].reserve += 28;
    } else if (loot.type === "med") {
      player.meds += 1;
    } else if (loot.type === "armor") {
      player.armor = Math.min(100, player.armor + 55);
    } else {
      player.weapons[0].reserve += 60;
      player.weapons[1].reserve += 45;
      player.armor = Math.min(100, player.armor + 35);
      player.meds += 1;
    }
    loot.active = false;
    nearestLoot = null;
    showToast(`已拾取 · ${lootName(loot.type)}`);
    sound("pickup");
    ui.prompt.classList.add("hidden");
  }

  function checkEndState() {
    if (player.alive && bots.every((bot) => !bot.alive)) endGame(true);
  }

  function endGame(win) {
    if (state === "ended") return;
    state = "ended";
    const alive = bots.filter((bot) => bot.alive).length + (player.alive ? 1 : 0);
    document.getElementById("resultKicker").textContent = win ? "任务完成" : "本次演习结束";
    document.getElementById("resultTitle").textContent = win ? "成功突围" : "再接再厉";
    document.getElementById("rankNumber").textContent = win ? "1" : String(Math.max(2, alive + 1));
    document.getElementById("resultKills").textContent = player.kills;
    document.getElementById("resultDamage").textContent = player.damage;
    document.getElementById("resultTime").textContent = formatTime(Math.max(0, gameTime - landedAt));
    ui.result.classList.add("active");
    ui.planePrompt.classList.add("hidden");
  }

  function addFeed(html) {
    feed.unshift({ html, life: 6 });
    feed = feed.slice(0, 5);
    ui.killFeed.innerHTML = feed.map((item) => `<div class="kill-line">${item.html}</div>`).join("");
    setTimeout(() => {
      feed.pop();
      ui.killFeed.innerHTML = feed.map((item) => `<div class="kill-line">${item.html}</div>`).join("");
    }, 6000);
  }

  function showToast(text) {
    ui.toast.textContent = text;
    ui.toast.classList.add("show");
    toastTimer = 2.5;
  }

  function flashHit() {
    ui.crosshair.classList.add("hit");
    sound("hit");
    setTimeout(() => ui.crosshair.classList.remove("hit"), 85);
  }

  function updateHud() {
    if (!player || state === "lobby") return;
    const livingBots = bots.filter((bot) => bot.alive).length;
    ui.alive.textContent = livingBots + (player.alive ? 1 : 0);
    ui.kills.textContent = player.kills;
    ui.healthFill.style.width = `${clamp(player.hp, 0, 100)}%`;
    ui.healthFill.style.background = player.hp < 30 ? "#dc493f" : "linear-gradient(90deg, #76b94d, #bad94b)";
    ui.healthText.textContent = Math.ceil(Math.max(0, player.hp));
    ui.armorFill.style.width = `${clamp(player.armor, 0, 100)}%`;
    const ammo = player.weapons[player.weaponIndex];
    const gun = WEAPONS[player.weaponIndex];
    ui.mag.textContent = ammo.mag;
    ui.reserve.textContent = ammo.reserve;
    ui.weapon.textContent = gun.name;
    ui.fireMode.textContent = player.reloadTimer > 0 ? "换弹" : player.healTimer > 0 ? "治疗" : "自动";
    ui.medCount.textContent = player.meds;
    if (zone) {
      ui.zoneLabel.textContent = zone.shrinking ? "安全区正在收缩" : "安全区将在";
      ui.zoneTimer.textContent = formatTime(Math.max(0, zone.timer));
    }
    const degrees = ((player.angle * 180 / Math.PI) + 90 + 360) % 360;
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const heading = directions[Math.round(degrees / 45) % 8];
    ui.compass.textContent = `${Math.floor((degrees + 330) % 360)}　 ${heading}　 ${Math.floor((degrees + 30) % 360)}`;
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  function screenToWorld(x, y) {
    return { x: x - width / 2 + camera.x, y: y - height / 2 + camera.y };
  }

  function worldToScreen(x, y) {
    return { x: x - camera.x + width / 2, y: y - camera.y + height / 2 };
  }

  function visible(x, y, padding = 100) {
    const p = worldToScreen(x, y);
    return p.x > -padding && p.x < width + padding && p.y > -padding && p.y < height + padding;
  }

  function draw() {
    ctx.save();
    const shakeX = camera.shake ? random(-camera.shake, camera.shake) : 0;
    const shakeY = camera.shake ? random(-camera.shake, camera.shake) : 0;
    ctx.translate(shakeX, shakeY);
    drawWorld();
    if (state === "plane") drawPlane();
    if (state === "dropping") drawDroppingPlayer();
    if (state === "playing" || state === "ended") {
      drawLoot();
      drawCharacters();
      drawProjectiles();
      drawParticles();
      drawZone();
    }
    ctx.restore();
    if (state !== "lobby") drawMinimap(miniCtx, minimap.width, true);
  }

  function drawWorld() {
    ctx.fillStyle = "#40573d";
    ctx.fillRect(0, 0, width, height);
    const startX = Math.floor((camera.x - width / 2) / 90) * 90;
    const startY = Math.floor((camera.y - height / 2) / 90) * 90;
    for (let x = startX; x < camera.x + width / 2 + 90; x += 90) {
      for (let y = startY; y < camera.y + height / 2 + 90; y += 90) {
        const p = worldToScreen(x, y);
        const variation = ((Math.abs(x * 13 + y * 7) % 5) / 5);
        ctx.fillStyle = `rgba(${48 + variation * 12},${77 + variation * 10},${46 + variation * 8},0.25)`;
        ctx.fillRect(p.x, p.y, 90, 90);
      }
    }

    terrain.roads.forEach((road) => {
      if (road.diagonal) {
        ctx.save();
        const a = worldToScreen(-200, 3500);
        const b = worldToScreen(3700, -100);
        ctx.strokeStyle = "#777762";
        ctx.lineWidth = 92;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.strokeStyle = "rgba(215,205,155,.42)";
        ctx.lineWidth = 2;
        ctx.setLineDash([24, 28]);
        ctx.stroke();
        ctx.restore();
      } else {
        const p = worldToScreen(road.x, road.y);
        ctx.fillStyle = "#73735f";
        ctx.fillRect(p.x, p.y, road.w, road.h);
        ctx.strokeStyle = "rgba(30,35,27,.38)";
        ctx.lineWidth = 3;
        ctx.strokeRect(p.x, p.y, road.w, road.h);
        ctx.save();
        ctx.strokeStyle = "rgba(224,215,163,.55)";
        ctx.lineWidth = 2;
        ctx.setLineDash([22, 26]);
        ctx.beginPath();
        if (road.w > road.h) {
          ctx.moveTo(p.x, p.y + road.h / 2);
          ctx.lineTo(p.x + road.w, p.y + road.h / 2);
        } else {
          ctx.moveTo(p.x + road.w / 2, p.y);
          ctx.lineTo(p.x + road.w / 2, p.y + road.h);
        }
        ctx.stroke();
        ctx.restore();
      }
    });

    terrain.towns.forEach((town) => {
      if (!visible(town.x, town.y, 250)) return;
      const p = worldToScreen(town.x, town.y);
      ctx.fillStyle = "rgba(255,255,255,.25)";
      ctx.font = "700 17px Arial";
      ctx.textAlign = "center";
      ctx.letterSpacing = "3px";
      ctx.fillText(town.name, p.x, p.y - 150);
    });

    terrain.buildings.forEach((b) => {
      if (!visible(b.x + b.w / 2, b.y + b.h / 2, 180)) return;
      const p = worldToScreen(b.x, b.y);
      ctx.fillStyle = "rgba(0,0,0,.28)";
      ctx.fillRect(p.x + 9, p.y + 11, b.w, b.h);
      const colors = ["#90917d", "#7a8377", "#a08c72", "#68796e"];
      ctx.fillStyle = colors[b.tone];
      ctx.fillRect(p.x, p.y, b.w, b.h);
      ctx.strokeStyle = "rgba(30,31,26,.75)";
      ctx.lineWidth = 4;
      ctx.strokeRect(p.x, p.y, b.w, b.h);
      ctx.fillStyle = "rgba(35,39,34,.28)";
      ctx.fillRect(p.x + b.w * 0.14, p.y + b.h * 0.15, b.w * 0.72, b.h * 0.7);
      ctx.strokeStyle = "rgba(225,225,195,.24)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + b.w * 0.14, p.y + b.h * 0.15);
      ctx.moveTo(p.x + b.w, p.y);
      ctx.lineTo(p.x + b.w * 0.86, p.y + b.h * 0.15);
      ctx.moveTo(p.x, p.y + b.h);
      ctx.lineTo(p.x + b.w * 0.14, p.y + b.h * 0.85);
      ctx.stroke();
    });

    terrain.rocks.forEach((rock) => {
      if (!visible(rock.x, rock.y)) return;
      const p = worldToScreen(rock.x, rock.y);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(rock.rot);
      ctx.fillStyle = "rgba(0,0,0,.25)";
      ctx.beginPath();
      ctx.ellipse(5, 7, rock.r, rock.r * 0.72, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#747a6a";
      ctx.beginPath();
      ctx.ellipse(0, 0, rock.r, rock.r * 0.67, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    });

    terrain.trees.forEach((tree) => {
      if (!visible(tree.x, tree.y, 50)) return;
      const p = worldToScreen(tree.x, tree.y);
      ctx.fillStyle = "rgba(0,0,0,.25)";
      ctx.beginPath();
      ctx.ellipse(p.x + 8, p.y + 9, tree.r * 1.1, tree.r * 0.78, 0.4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = tree.shade > 0.5 ? "#253e27" : "#304a2e";
      ctx.beginPath();
      ctx.arc(p.x, p.y, tree.r, 0, TAU);
      ctx.arc(p.x - tree.r * 0.55, p.y + 2, tree.r * 0.66, 0, TAU);
      ctx.arc(p.x + tree.r * 0.58, p.y + 4, tree.r * 0.68, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(124,155,87,.28)";
      ctx.beginPath();
      ctx.arc(p.x - tree.r * 0.25, p.y - tree.r * 0.27, tree.r * 0.55, 0, TAU);
      ctx.fill();
    });
  }

  function drawLoot() {
    terrain.loot.forEach((loot) => {
      if (!loot.active || !visible(loot.x, loot.y, 50)) return;
      const p = worldToScreen(loot.x, loot.y);
      const colors = { ammo: "#e7c454", med: "#e6e6df", armor: "#66b4dd", crate: "#b26ee5" };
      ctx.save();
      ctx.translate(p.x, p.y + Math.sin(gameTime * 3 + loot.spin) * 2);
      ctx.rotate(loot.spin);
      ctx.shadowColor = colors[loot.type];
      ctx.shadowBlur = 13;
      ctx.fillStyle = colors[loot.type];
      ctx.fillRect(-6, -6, 12, 12);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(255,255,255,.8)";
      ctx.strokeRect(-7, -7, 14, 14);
      ctx.restore();
    });
  }

  function drawCharacters() {
    bots.forEach((bot) => {
      if (bot.alive && visible(bot.x, bot.y, 60)) drawSoldier(bot, false);
      else if (!bot.alive && visible(bot.x, bot.y, 60)) {
        const p = worldToScreen(bot.x, bot.y);
        ctx.fillStyle = "rgba(45,40,30,.5)";
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 18, 7, bot.angle, 0, TAU);
        ctx.fill();
      }
    });
    if (player.alive) drawSoldier(player, true);
  }

  function drawSoldier(entity, isPlayer) {
    const p = worldToScreen(entity.x, entity.y);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(entity.angle);
    ctx.fillStyle = "rgba(0,0,0,.33)";
    ctx.beginPath();
    ctx.ellipse(3, 5, 18, 13, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = isPlayer ? "#d3aa43" : entity.color;
    ctx.beginPath();
    ctx.arc(0, 0, entity.r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = isPlayer ? "#fff0a3" : "rgba(255,255,255,.45)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = isPlayer ? "#3f503c" : "#343b34";
    ctx.fillRect(-4, -11, 13, 22);
    ctx.fillStyle = "#1b211c";
    ctx.fillRect(5, -3, 27, 6);
    ctx.fillStyle = WEAPONS[isPlayer ? player.weaponIndex : entity.weapon].color;
    ctx.fillRect(28, -2, 7, 4);
    ctx.restore();
    if (!isPlayer && distance(player, entity) < 420) {
      ctx.fillStyle = "rgba(0,0,0,.55)";
      ctx.fillRect(p.x - 19, p.y - 28, 38, 4);
      ctx.fillStyle = "#d34c42";
      ctx.fillRect(p.x - 19, p.y - 28, 38 * clamp(entity.hp / 100, 0, 1), 4);
    }
    if (isPlayer) {
      ctx.fillStyle = "rgba(255,255,255,.85)";
      ctx.font = "700 9px Arial";
      ctx.textAlign = "center";
      ctx.fillText("你", p.x, p.y - 24);
    }
  }

  function drawProjectiles() {
    projectiles.forEach((bullet) => {
      if (!visible(bullet.x, bullet.y, 30)) return;
      const p = worldToScreen(bullet.x, bullet.y);
      const lp = worldToScreen(bullet.lastX, bullet.lastY);
      ctx.strokeStyle = bullet.color;
      ctx.lineWidth = 2;
      ctx.shadowColor = bullet.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(lp.x, lp.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.shadowBlur = 0;
    });
  }

  function drawParticles() {
    particles.forEach((particle) => {
      const p = worldToScreen(particle.x, particle.y);
      ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.fillStyle = particle.color;
      ctx.fillRect(p.x - particle.size / 2, p.y - particle.size / 2, particle.size, particle.size);
    });
    ctx.globalAlpha = 1;
  }

  function drawZone() {
    const center = worldToScreen(zone.x, zone.y);
    ctx.save();
    ctx.fillStyle = "rgba(45,92,173,.17)";
    ctx.beginPath();
    ctx.rect(-50, -50, width + 100, height + 100);
    ctx.arc(center.x, center.y, zone.radius, 0, TAU, true);
    ctx.fill("evenodd");
    ctx.strokeStyle = zone.shrinking ? "rgba(96,164,255,.9)" : "rgba(238,242,239,.72)";
    ctx.lineWidth = 4;
    ctx.shadowColor = "#70a7ff";
    ctx.shadowBlur = zone.shrinking ? 16 : 5;
    ctx.beginPath();
    ctx.arc(center.x, center.y, zone.radius, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  function drawPlane() {
    const p = worldToScreen(plane.x, plane.y);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(plane.angle);
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.beginPath();
    ctx.ellipse(15, 18, 72, 24, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#aeb7ac";
    ctx.beginPath();
    ctx.moveTo(62, 0);
    ctx.lineTo(22, -9);
    ctx.lineTo(-25, -58);
    ctx.lineTo(-41, -55);
    ctx.lineTo(-17, -8);
    ctx.lineTo(-66, -11);
    ctx.lineTo(-82, 0);
    ctx.lineTo(-66, 11);
    ctx.lineTo(-17, 8);
    ctx.lineTo(-41, 55);
    ctx.lineTo(-25, 58);
    ctx.lineTo(22, 9);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#303a31";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#465148";
    ctx.fillRect(-55, -5, 104, 10);
    ctx.restore();
  }

  function drawDroppingPlayer() {
    const p = worldToScreen(player.x, player.y);
    const scale = 1 + player.altitude / 360;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(scale, scale);
    ctx.fillStyle = "rgba(0,0,0,.2)";
    ctx.beginPath();
    ctx.arc(8, 10, 11, 0, TAU);
    ctx.fill();
    if (player.altitude < 300) {
      ctx.strokeStyle = "rgba(225,225,210,.75)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-5, -5);
      ctx.lineTo(-34, -55);
      ctx.moveTo(5, -5);
      ctx.lineTo(34, -55);
      ctx.stroke();
      ctx.fillStyle = "#d6c462";
      ctx.beginPath();
      ctx.arc(0, -55, 39, Math.PI, TAU);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#6c6336";
      ctx.stroke();
    }
    ctx.fillStyle = "#d1a942";
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = "rgba(0,0,0,.62)";
    ctx.fillRect(width / 2 - 90, height - 85, 180, 28);
    ctx.fillStyle = "#f2c94c";
    ctx.fillRect(width / 2 - 90, height - 85, 180 * (1 - player.altitude / 700), 28);
    ctx.fillStyle = "#fff";
    ctx.font = "700 11px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`距地面 ${Math.max(0, Math.round(player.altitude))}m`, width / 2, height - 67);
  }

  function drawMinimap(mapCtx, size, local) {
    const scale = size / WORLD;
    mapCtx.clearRect(0, 0, size, size);
    mapCtx.fillStyle = "#365436";
    mapCtx.fillRect(0, 0, size, size);
    terrain.roads.forEach((road) => {
      mapCtx.strokeStyle = "#8a8973";
      mapCtx.fillStyle = "#8a8973";
      if (road.diagonal) {
        mapCtx.lineWidth = Math.max(3, 90 * scale);
        mapCtx.beginPath();
        mapCtx.moveTo(0, size);
        mapCtx.lineTo(size, 0);
        mapCtx.stroke();
      } else {
        mapCtx.fillRect(road.x * scale, road.y * scale, road.w * scale, road.h * scale);
      }
    });
    mapCtx.fillStyle = "#727a6e";
    terrain.buildings.forEach((b) => mapCtx.fillRect(b.x * scale, b.y * scale, Math.max(2, b.w * scale), Math.max(2, b.h * scale)));
    mapCtx.strokeStyle = "rgba(255,255,255,.9)";
    mapCtx.lineWidth = local ? 2 : 3;
    mapCtx.beginPath();
    mapCtx.arc(zone.x * scale, zone.y * scale, zone.radius * scale, 0, TAU);
    mapCtx.stroke();
    if (zone.targetRadius < zone.radius) {
      mapCtx.strokeStyle = "rgba(242,201,76,.72)";
      mapCtx.setLineDash([5, 4]);
      mapCtx.beginPath();
      mapCtx.arc(zone.targetX * scale, zone.targetY * scale, zone.targetRadius * scale, 0, TAU);
      mapCtx.stroke();
      mapCtx.setLineDash([]);
    }
    mapCtx.fillStyle = "#f2c94c";
    mapCtx.beginPath();
    mapCtx.arc(clamp(player.x, 0, WORLD) * scale, clamp(player.y, 0, WORLD) * scale, local ? 4 : 7, 0, TAU);
    mapCtx.fill();
    mapCtx.strokeStyle = "#161a11";
    mapCtx.beginPath();
    mapCtx.moveTo(player.x * scale, player.y * scale);
    mapCtx.lineTo((player.x + Math.cos(player.angle) * (local ? 45 : 70)) * scale, (player.y + Math.sin(player.angle) * (local ? 45 : 70)) * scale);
    mapCtx.stroke();
    if (!local) {
      mapCtx.fillStyle = "rgba(255,255,255,.7)";
      mapCtx.font = "700 12px Arial";
      mapCtx.textAlign = "center";
      terrain.towns.forEach((town) => mapCtx.fillText(town.name, town.x * scale, town.y * scale - 12));
    }
  }

  function toggleMap(force) {
    if (state === "lobby" || state === "ended") return;
    mapOpen = typeof force === "boolean" ? force : !mapOpen;
    ui.fullMap.classList.toggle("hidden", !mapOpen);
    if (mapOpen) drawMinimap(largeCtx, largeMap.width, false);
  }

  function frame(time) {
    const dt = Math.min(0.035, (time - lastTime) / 1000 || 0);
    lastTime = time;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  function bindJoystick(element, target, isAim) {
    let pointerId = null;
    const knob = element.querySelector("i");
    const updateStick = (event) => {
      const rect = element.getBoundingClientRect();
      let dx = event.clientX - (rect.left + rect.width / 2);
      let dy = event.clientY - (rect.top + rect.height / 2);
      const max = rect.width * 0.34;
      const length = Math.hypot(dx, dy);
      if (length > max) {
        dx = dx / length * max;
        dy = dy / length * max;
      }
      target.x = dx / max;
      target.y = dy / max;
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      if (isAim) target.firing = Math.hypot(target.x, target.y) > 0.28;
    };
    element.addEventListener("pointerdown", (event) => {
      pointerId = event.pointerId;
      element.setPointerCapture(pointerId);
      updateStick(event);
    });
    element.addEventListener("pointermove", (event) => {
      if (event.pointerId === pointerId) updateStick(event);
    });
    const end = (event) => {
      if (event.pointerId !== pointerId) return;
      pointerId = null;
      target.x = 0;
      target.y = 0;
      if (isAim) target.firing = false;
      knob.style.transform = "";
    };
    element.addEventListener("pointerup", end);
    element.addEventListener("pointercancel", end);
  }

  addEventListener("resize", resize);
  addEventListener("keydown", (event) => {
    keys[event.code] = true;
    if (event.code === "KeyF") pickup();
    if (event.code === "KeyR") reload();
    if (event.code === "KeyH") heal();
    if (event.code === "Digit1") switchWeapon(0);
    if (event.code === "Digit2") switchWeapon(1);
    if (event.code === "KeyM") toggleMap();
    if (event.code === "Space" && state === "plane") jump();
    if (event.code === "Escape" && mapOpen) toggleMap(false);
  });
  addEventListener("keyup", (event) => {
    keys[event.code] = false;
  });
  canvas.addEventListener("pointermove", (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    ui.crosshair.style.left = `${mouse.x}px`;
    ui.crosshair.style.top = `${mouse.y}px`;
  });
  canvas.addEventListener("pointerdown", (event) => {
    if (event.button === 0) {
      mouse.down = true;
      ensureAudio();
    }
  });
  addEventListener("pointerup", (event) => {
    if (event.button === 0) mouse.down = false;
  });
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());

  document.getElementById("startBtn").addEventListener("click", startGame);
  document.getElementById("restartBtn").addEventListener("click", startGame);
  document.getElementById("lobbyBtn").addEventListener("click", returnLobby);
  document.getElementById("jumpBtn").addEventListener("click", jump);
  document.getElementById("mobileJump").addEventListener("click", jump);
  document.getElementById("mobilePickup").addEventListener("click", pickup);
  document.getElementById("reloadBtn").addEventListener("click", reload);
  document.getElementById("healBtn").addEventListener("click", heal);
  document.getElementById("mapBtn").addEventListener("click", () => toggleMap());
  document.getElementById("closeMap").addEventListener("click", () => toggleMap(false));
  document.querySelectorAll(".weapon-slot").forEach((slot) => slot.addEventListener("click", () => switchWeapon(Number(slot.dataset.slot))));
  bindJoystick(document.getElementById("moveStick"), touchMove, false);
  bindJoystick(document.getElementById("aimStick"), touchAim, true);

  resize();
  generateTerrain();
  player = makePlayer();
  resetZone();
  requestAnimationFrame(frame);
})();
