(function (CAP) {
  "use strict";

  const TILE = 16;
  const VIEW_W = 256;
  const VIEW_H = 240;
  const HUD = 32;
  const DT = 1000 / 60;

  const SOLID = /[=#?!@+*XHpPqQvWw]/;
  const BLOCK = /[#?!@+*]/;
  const QBLOCK = /[?!@+*]/;

  let canvas, ctx, SPR;
  let acc = 0;
  let last = 0;
  let frame = 0;
  let state = "title";
  let inp = null;

  const save = {
    lives: 3,
    coins: 0,
    score: 0,
    world: "1-1",
    power: 0
  };

  let world = null;
  let player = null;
  let ents = [];
  let particles = [];
  let pops = [];
  let camX = 0;
  let timeLeft = 400;
  let timeAcc = 0;
  let bump = new Map();
  let fireballs = [];
  let invuln = 0;
  let starT = 0;
  let deadT = 0;
  let clearT = 0;
  let startT = 0;
  let pipeT = 0;
  let pipeWarp = null;
  let toastT = 0;
  let toastMsg = "";
  let paused = false;
  let combo = 0;
  let growFlash = 0;
  let flagSlide = 0;
  let fireCd = 0;
  let returnOut = null;

  function showToast(msg, t) {
    toastMsg = msg;
    toastT = t || 120;
    const el = document.getElementById("toast");
    if (el) {
      el.textContent = msg;
      el.classList.remove("hidden");
    }
  }

  function hideToast() {
    const el = document.getElementById("toast");
    if (el) el.classList.add("hidden");
  }

  function pad(n, w) {
    let s = String(Math.max(0, n | 0));
    while (s.length < w) s = "0" + s;
    return s;
  }

  function aabb(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function loadLevel(id, opts) {
    opts = opts || {};
    const maker = CAP.levels[id];
    if (!maker) return;
    const spec = maker();
    const tiles = spec.tiles.map((r) => r.split(""));
    const W = tiles[0].length;
    const H = tiles.length;
    ents = [];
    particles = [];
    pops = [];
    fireballs = [];
    bump = new Map();
    combo = 0;
    camX = 0;
    timeLeft = spec.bonus || opts.keepTime ? timeLeft : spec.time;
    timeAcc = 0;
    starT = 0;
    invuln = opts.keepInvuln ? 60 : 0;
    growFlash = 0;
    flagSlide = 0;
    fireCd = 0;

    let sx = spec.spawnX, sy = spec.spawnY;
    if (opts.outX != null) {
      sx = opts.outX;
      sy = opts.outY;
    }

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const c = tiles[y][x];
        const px = x * TILE, py = y * TILE;
        if (c === "S") {
          if (!opts.outX) {
            sx = px + 2;
            sy = py;
          }
          tiles[y][x] = ".";
        } else if (c === "g") {
          ents.push(makeWalker(px, py));
          tiles[y][x] = ".";
        } else if (c === "k") {
          ents.push(makeTurtle(px, py));
          tiles[y][x] = ".";
        } else if (c === "v") {
          ents.push(makePlant(px, py, x));
          tiles[y][x] = "p";
        } else if (c === "o") {
          ents.push(makeCoin(px + 3, py + 2));
          tiles[y][x] = ".";
        } else if (c === "F" || c === "C") {
          tiles[y][x] = ".";
        }
      }
    }

    world = {
      id: spec.id,
      name: spec.name,
      theme: spec.theme,
      tiles: tiles,
      W: W,
      H: H,
      spec: spec
    };

    const power = save.power;
    player = makePlayer(sx, sy, power);
    if (power > 0) player.y -= 16;
    camX = Math.max(0, Math.min(player.x - 80, Math.max(0, W * TILE - VIEW_W)));

    if (state !== "start") {
      const music = starT ? "star" : spec.theme === "underground" ? "underground" : "overworld";
      CAP.audio.playMusic(music);
    }
  }

  function tileAt(tx, ty) {
    if (!world || ty < 0 || tx < 0 || tx >= world.W) return "=";
    if (ty >= world.H) return ".";
    return world.tiles[ty][tx];
  }

  function isSolid(c) {
    return SOLID.test(c);
  }

  function setTile(tx, ty, c) {
    if (ty >= 0 && ty < world.H && tx >= 0 && tx < world.W) world.tiles[ty][tx] = c;
  }

  function solidsIn(x, y, w, h) {
    const x0 = Math.floor(x / TILE);
    const y0 = Math.floor(y / TILE);
    const x1 = Math.floor((x + w - 0.01) / TILE);
    const y1 = Math.floor((y + h - 0.01) / TILE);
    const hits = [];
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const c = tileAt(tx, ty);
        if (isSolid(c)) hits.push({ tx: tx, ty: ty, c: c });
      }
    }
    return hits;
  }

  function makePlayer(x, y, power) {
    return {
      x: x,
      y: y,
      w: 12,
      h: power > 0 ? 32 : 16,
      vx: 0,
      vy: 0,
      facing: 1,
      power: power || 0,
      onGround: false,
      skid: false,
      walkF: 0,
      duck: false,
      dead: false,
      pole: false
    };
  }

  function makeWalker(x, y) {
    return { kind: "walker", x: x, y: y, w: 16, h: 16, vx: -0.5, vy: 0, dead: false, flat: 0, facing: -1 };
  }

  function makeTurtle(x, y) {
    return { kind: "turtle", x: x, y: y, w: 16, h: 16, vx: -0.45, vy: 0, dead: false, shell: 0, facing: -1 };
  }

  function makePlant(x, y) {
    return { kind: "plant", x: x + 1, y: y + 8, w: 14, h: 24, homeY: y + 8, phase: 0, t: 40 + (x % 90), dead: false };
  }

  function makeCoin(x, y) {
    return { kind: "coin", x: x, y: y, w: 10, h: 14, dead: false, f: 0 };
  }

  function makeItem(kind, x, y) {
    return { kind: kind, x: x, y: y, w: 16, h: 16, vx: kind === "mush" || kind === "oneup" ? 0.7 : 0, vy: -2, emerge: 16, dead: false };
  }

  function addScore(n, x, y) {
    save.score += n;
    if (x != null) pops.push({ t: 50, x: x, y: y, text: String(n) });
  }

  function addCoin() {
    save.coins++;
    CAP.audio.play("coin");
    if (save.coins >= 100) {
      save.coins = 0;
      save.lives++;
      CAP.audio.play("oneup");
      showToast("1UP", 80);
    }
  }

  function spawnDebris(tx, ty) {
    const px = tx * TILE + 8, py = ty * TILE + 8;
    const dirs = [[-2, -4], [2, -4], [-1.2, -2.5], [1.2, -2.5]];
    dirs.forEach((d) => {
      particles.push({ x: px, y: py, vx: d[0], vy: d[1], t: 40, spr: "brick" });
    });
  }

  function stompScore() {
    combo++;
    const table = [100, 200, 400, 800, 1000, 2000, 4000, 8000];
    const n = table[Math.min(combo, table.length) - 1];
    if (combo >= 8) {
      save.lives++;
      CAP.audio.play("oneup");
      pops.push({ t: 50, x: player.x, y: player.y, text: "1UP" });
    } else {
      addScore(n, player.x, player.y);
    }
  }

  function hurtPlayer() {
    if (invuln > 0 || starT > 0 || player.dead || player.pole) return;
    if (player.power > 0) {
      player.power = 0;
      save.power = 0;
      player.h = 16;
      player.y += 16;
      invuln = 90;
      growFlash = 20;
      CAP.audio.play("pipe");
    } else {
      killPlayer();
    }
  }

  function killPlayer() {
    if (player.dead) return;
    player.dead = true;
    player.vy = -6;
    player.vx = 0;
    deadT = 0;
    save.power = 0;
    CAP.audio.play("die");
    state = "dead";
  }

  function bumpBlock(tx, ty, fromBelow) {
    if (!fromBelow) return;
    const c = tileAt(tx, ty);
    bump.set(tx + "," + ty, 8);
    ents.forEach((e) => {
      if (e.dead) return;
      if (e.y + e.h <= ty * TILE + 2 && e.x + e.w > tx * TILE && e.x < tx * TILE + TILE && e.y + e.h > ty * TILE - 8) {
        if (e.kind === "walker" || e.kind === "turtle") {
          e.vy = -4;
          e.vx = -e.vx;
        }
      }
    });

    if (QBLOCK.test(c)) {
      setTile(tx, ty, "X");
      CAP.audio.play("bump");
      const px = tx * TILE, py = ty * TILE;
      if (c === "?") {
        ents.push({ kind: "popcoin", x: px + 4, y: py, t: 18, dead: false });
        addCoin();
        addScore(200, px, py - 8);
      } else if (c === "!") {
        ents.push(makeItem(player.power === 0 ? "mush" : "flower", px, py - 16));
        CAP.audio.play("appear");
      } else if (c === "@") {
        ents.push(makeItem(player.power === 0 ? "mush" : "flower", px, py - 16));
        CAP.audio.play("appear");
      } else if (c === "+") {
        ents.push(makeItem("oneup", px, py - 16));
        CAP.audio.play("appear");
      } else if (c === "*") {
        ents.push(makeItem("star", px, py - 16));
        CAP.audio.play("appear");
      }
    } else if (c === "#") {
      if (player.power > 0) {
        setTile(tx, ty, ".");
        spawnDebris(tx, ty);
        CAP.audio.play("break");
        addScore(50);
      } else {
        CAP.audio.play("bump");
      }
    } else {
      CAP.audio.play("bump");
    }
  }

  function moveActor(e, gravity) {
    e.vy += gravity;
    if (e.vy > 4.8) e.vy = 4.8;
    e.x += e.vx;
    const hitsX = solidsIn(e.x, e.y + 1, e.w, e.h - 2);
    if (hitsX.length) {
      if (e.vx > 0) e.x = hitsX[0].tx * TILE - e.w;
      else e.x = (hitsX[0].tx + 1) * TILE;
      if (e.kind === "shell" || (e.kind === "turtle" && e.shell === 2)) e.vx *= -1;
      else if (e.kind === "walker" || e.kind === "turtle" || e.kind === "mush" || e.kind === "oneup" || e.kind === "star") e.vx *= -1;
      else if (e.kind === "fireball") e.dead = true;
      e.facing = e.vx >= 0 ? 1 : -1;
    }
    e.y += e.vy;
    const hitsY = solidsIn(e.x + 1, e.y, e.w - 2, e.h);
    let grounded = false;
    if (hitsY.length) {
      if (e.vy >= 0) {
        e.y = hitsY[0].ty * TILE - e.h;
        e.vy = 0;
        grounded = true;
        if (e.kind === "fireball") e.vy = -2.2;
      } else {
        e.y = (hitsY[0].ty + 1) * TILE;
        e.vy = 0;
      }
    }
    return grounded;
  }

  function updatePlayer() {
    if (player.dead || player.pole) return;

    if (growFlash > 0) growFlash--;
    if (invuln > 0) invuln--;
    if (starT > 0) {
      starT--;
      if (starT === 0) {
        const music = world.theme === "underground" ? "underground" : "overworld";
        CAP.audio.playMusic(music);
      }
    }
    if (fireCd > 0) fireCd--;

    const run = inp.run;
    const max = run ? 2.55 : 1.4;
    const accx = run ? 0.14 : 0.08;
    player.skid = false;
    const wantDuck = player.power > 0 && inp.down && player.onGround;
    if (wantDuck && !player.duck) {
      player.duck = true;
      if (player.h > 16) {
        player.y += player.h - 16;
        player.h = 16;
      }
    } else if (!wantDuck && player.duck) {
      if (!solidsIn(player.x, player.y - 16, player.w, 16).length) {
        player.y -= 16;
        player.h = 32;
        player.duck = false;
      }
    }

    if (!player.duck) {
      if (inp.left) {
        if (player.vx > 0.3) player.skid = true;
        player.vx -= player.skid ? 0.2 : accx;
        player.facing = -1;
      } else if (inp.right) {
        if (player.vx < -0.3) player.skid = true;
        player.vx += player.skid ? 0.2 : accx;
        player.facing = 1;
      } else {
        if (Math.abs(player.vx) < 0.08) player.vx = 0;
        else player.vx *= 0.86;
      }
    } else {
      if (Math.abs(player.vx) < 0.08) player.vx = 0;
      else player.vx *= 0.8;
    }
    if (player.vx > max) player.vx = max;
    if (player.vx < -max) player.vx = -max;

    if (inp.jumpPressed && player.onGround) {
      player.vy = Math.abs(player.vx) > 1.8 ? -5.55 : -5.05;
      player.onGround = false;
      CAP.audio.play("jump");
      combo = 0;
      try { navigator.vibrate && navigator.vibrate(8); } catch (e) { /* ignore */ }
    }

    const grav = player.vy < 0 && inp.jump ? 0.16 : 0.38;
    player.vy += grav;
    if (player.vy > 4.6) player.vy = 4.6;

    player.x += player.vx;
    if (player.x < camX) player.x = camX;
    if (player.x < 0) player.x = 0;
    if (player.x > world.W * TILE - player.w) player.x = world.W * TILE - player.w;

    const hx = solidsIn(player.x, player.y + 2, player.w, player.h - 4);
    if (hx.length) {
      if (player.vx > 0) player.x = hx[0].tx * TILE - player.w;
      else if (player.vx < 0) player.x = (hx[0].tx + 1) * TILE;
      player.vx = 0;
    }

    player.y += player.vy;
    player.onGround = false;
    const hy = solidsIn(player.x + 1, player.y, player.w - 2, player.h);
    if (hy.length) {
      if (player.vy >= 0) {
        player.y = hy[0].ty * TILE - player.h;
        player.vy = 0;
        player.onGround = true;
      } else {
        const hit = hy.reduce((a, b) => (b.ty > a.ty ? b : a));
        player.y = (hit.ty + 1) * TILE;
        player.vy = 0.2;
        bumpBlock(hit.tx, hit.ty, true);
      }
    }

    if (player.y > world.H * TILE + 8) killPlayer();

    if (Math.abs(player.vx) > 0.2 && player.onGround) player.walkF += run ? 0.35 : 0.22;
    else if (player.onGround) player.walkF = 0;

    if (player.power === 2 && inp.run && fireCd === 0 && fireballs.length < 2 && !player.duck) {
      fireballs.push({
        kind: "fireball",
        x: player.x + (player.facing > 0 ? player.w : -6),
        y: player.y + 8,
        w: 8, h: 8,
        vx: player.facing * 3.2,
        vy: 1,
        t: 90,
        dead: false,
        f: 0
      });
      fireCd = 12;
      CAP.audio.play("fireball");
    }

    tryWarp();
    tryFlag();
  }

  function tryWarp() {
    if (!player.onGround || !inp.down) return;
    const warps = world.spec.warps;
    if (!warps) return;
    const cx = player.x + player.w / 2;
    const ty = Math.floor((player.y + player.h + 1) / TILE);
    warps.forEach((w) => {
      const px = w.x * TILE;
      if (cx < px + 2 || cx > px + 30) return;
      const c = tileAt(Math.floor(cx / TILE), ty);
      if ("pqPQwW".indexOf(c) === -1) return;
      pipeWarp = w;
      pipeT = 0;
      state = "pipe";
      CAP.audio.play("pipe");
    });
  }

  function tryFlag() {
    if (world.spec.flagX < 0 || player.pole) return;
    const fx = world.spec.flagX * TILE + 4;
    if (player.x + player.w > fx && player.x < fx + 8 && player.y < 13 * TILE) {
      player.pole = true;
      player.x = fx - 4;
      player.vx = 0;
      flagSlide = 0;
      state = "clear";
      clearT = 0;
      CAP.audio.stopMusic();
      CAP.audio.play("flag");
      addScore(Math.max(100, (12 * TILE - player.y) * 5 | 0), player.x, player.y);
    }
  }

  function updateEnts() {
    ents.forEach((e) => {
      if (e.dead && e.kind !== "walker") return;
      if (e.kind === "walker") updateWalker(e);
      else if (e.kind === "turtle") updateTurtle(e);
      else if (e.kind === "plant") updatePlant(e);
      else if (e.kind === "coin") {
        e.f++;
        if (!player.dead && aabb(player, e)) {
          e.dead = true;
          addCoin();
          addScore(200, e.x, e.y);
        }
      } else if (e.kind === "popcoin") {
        e.y -= 1.6;
        e.t--;
        if (e.t <= 0) e.dead = true;
      } else if (e.kind === "mush" || e.kind === "oneup" || e.kind === "flower" || e.kind === "star") {
        updateItem(e);
      }
    });
    ents = ents.filter((e) => !e.dead || (e.flat && e.flat > 0));

    fireballs.forEach((f) => {
      f.t--;
      f.f++;
      moveActor(f, 0.25);
      if (f.t <= 0 || f.y > world.H * TILE) f.dead = true;
      ents.forEach((e) => {
        if (f.dead || e.dead) return;
        if ((e.kind === "walker" || e.kind === "turtle" || e.kind === "plant") && aabb(f, e)) {
          f.dead = true;
          defeatEnemy(e, true);
        }
      });
    });
    fireballs = fireballs.filter((f) => !f.dead);

    particles.forEach((p) => {
      p.vy += 0.3;
      p.x += p.vx;
      p.y += p.vy;
      p.t--;
    });
    particles = particles.filter((p) => p.t > 0);
    pops.forEach((p) => { p.y -= 0.4; p.t--; });
    pops = pops.filter((p) => p.t > 0);

    bump.forEach((v, k) => {
      if (v <= 0) bump.delete(k);
      else bump.set(k, v - 1);
    });
  }

  function defeatEnemy(e, flip) {
    if (e.kind === "plant") {
      e.dead = true;
      addScore(200, e.x, e.y);
      CAP.audio.play("stomp");
      return;
    }
    if (flip) {
      e.dead = true;
      particles.push({ x: e.x, y: e.y, vx: 1.2, vy: -3, t: 50, spr: e.kind, flip: true });
      addScore(200, e.x, e.y);
      CAP.audio.play("kick");
    } else if (e.kind === "walker") {
      e.flat = 24;
      e.vx = 0;
      e.h = 8;
      e.y += 8;
      stompScore();
      CAP.audio.play("stomp");
    } else if (e.kind === "turtle") {
      if (e.shell === 0) {
        e.shell = 1;
        e.vx = 0;
        e.h = 14;
        stompScore();
        CAP.audio.play("stomp");
      } else if (e.shell === 2) {
        e.shell = 1;
        e.vx = 0;
        stompScore();
        CAP.audio.play("stomp");
      } else {
        e.shell = 2;
        e.vx = player.facing * 4;
        CAP.audio.play("kick");
        addScore(400, e.x, e.y);
      }
    }
  }

  function updateWalker(e) {
    if (e.flat > 0) {
      e.flat--;
      if (e.flat <= 0) e.dead = true;
      return;
    }
    if (e.x + e.w < camX - 32 || e.x > camX + VIEW_W + 160) return;
    moveActor(e, 0.35);
    if (e.y > world.H * TILE) e.dead = true;
    collideEnemy(e);
  }

  function updateTurtle(e) {
    if (e.x + e.w < camX - 32 || e.x > camX + VIEW_W + 180) return;
    if (e.shell === 1) {
      e.vx = 0;
    }
    moveActor(e, 0.35);
    if (e.y > world.H * TILE) e.dead = true;
    if (e.shell === 2) {
      ents.forEach((o) => {
        if (o === e || o.dead) return;
        if ((o.kind === "walker" || o.kind === "turtle") && aabb(e, o)) defeatEnemy(o, true);
      });
    }
    collideEnemy(e);
  }

  function updatePlant(e) {
    const dist = Math.abs(player.x + player.w / 2 - (e.x + 7));
    e.t--;
    if (e.t <= 0) {
      e.phase = (e.phase + 1) % 4;
      e.t = e.phase === 1 || e.phase === 3 ? 50 : 70;
    }
    let target = e.homeY + 24;
    if ((e.phase === 1 || e.phase === 2) && dist > 24) target = e.homeY - 16;
    e.y += (target - e.y) * 0.12;
    if (!player.dead && aabb(player, { x: e.x, y: e.y, w: e.w, h: Math.max(8, e.homeY + 16 - e.y) })) {
      if (starT > 0) defeatEnemy(e, true);
      else hurtPlayer();
    }
  }

  function updateItem(e) {
    if (e.emerge > 0) {
      e.emerge--;
      e.y -= 1;
      return;
    }
    if (e.kind === "flower") e.vx = 0;
    if (e.kind === "star") {
      if (e.vy === 0) e.vy = -3.5;
      moveActor(e, 0.2);
    } else if (e.kind !== "flower") {
      moveActor(e, 0.3);
    }
    if (!player.dead && aabb(player, e)) collectItem(e);
  }

  function collectItem(e) {
    e.dead = true;
    if (e.kind === "mush") {
      if (player.power === 0) {
        player.power = 1;
        save.power = 1;
        player.y -= 16;
        player.h = 32;
        growFlash = 18;
      }
      CAP.audio.play("power");
      addScore(1000, e.x, e.y);
    } else if (e.kind === "flower") {
      player.power = 2;
      save.power = 2;
      if (player.h < 32) {
        player.y -= 16;
        player.h = 32;
      }
      CAP.audio.play("power");
      addScore(1000, e.x, e.y);
    } else if (e.kind === "oneup") {
      save.lives++;
      CAP.audio.play("oneup");
      pops.push({ t: 50, x: e.x, y: e.y, text: "1UP" });
    } else if (e.kind === "star") {
      starT = 480;
      CAP.audio.play("power");
      CAP.audio.playMusic("star");
      addScore(1000, e.x, e.y);
    }
  }

  function collideEnemy(e) {
    if (player.dead || player.pole || e.dead || e.flat) return;
    if (!aabb(player, e)) return;
    if (starT > 0) {
      defeatEnemy(e, true);
      return;
    }
    const stomp = player.vy > 0 && player.y + player.h - player.vy <= e.y + 6;
    if (stomp) {
      defeatEnemy(e, false);
      player.vy = inp.jump ? -4.6 : -2.8;
      player.y = e.y - player.h;
      try { navigator.vibrate && navigator.vibrate(12); } catch (err) { /* ignore */ }
      return;
    }
    if (e.kind === "turtle" && e.shell === 1) {
      e.shell = 2;
      e.vx = (player.x + player.w / 2 < e.x + e.w / 2 ? 4 : -4);
      CAP.audio.play("kick");
      invuln = Math.max(invuln, 8);
      return;
    }
    if (e.kind === "turtle" && e.shell === 2 && Math.abs(e.vx) > 1) {
      const fromTop = player.y + player.h - 4 < e.y + 6;
      if (fromTop) return;
    }
    hurtPlayer();
  }

  function updateCamera() {
    const target = player.x - 80;
    if (target > camX) camX = target;
    if (player.x < camX + 24) camX = player.x - 24;
    if (camX < 0) camX = 0;
    const max = world.W * TILE - VIEW_W;
    if (camX > max) camX = Math.max(0, max);
  }

  function updatePlay() {
    if (inp.pausePressed) {
      paused = !paused;
      CAP.audio.play("pause");
      if (paused) CAP.audio.stopMusic();
      else CAP.audio.playMusic(starT ? "star" : world.theme === "underground" ? "underground" : "overworld");
    }
    if (paused) return;
    timeAcc++;
    if (timeAcc >= 24) {
      timeAcc = 0;
      timeLeft--;
      if (timeLeft <= 0) {
        timeLeft = 0;
        killPlayer();
        return;
      }
    }
    updatePlayer();
    updateEnts();
    updateCamera();
  }

  function updateDead() {
    deadT++;
    player.vy += 0.25;
    player.y += player.vy;
    if (deadT > 140) {
      save.lives--;
      save.power = 0;
      if (save.lives < 0) {
        state = "gameover";
        deadT = 0;
        CAP.audio.play("gameover");
      } else {
        state = "start";
        startT = 0;
        loadLevel(save.world);
      }
    }
  }

  function updateClear() {
    clearT++;
    if (clearT < 70) {
      const ground = 13 * TILE - player.h;
      if (player.y < ground) player.y += 2.2;
      else player.y = ground;
    } else if (clearT === 70) {
      CAP.audio.play("clear");
    } else if (clearT < 140) {
      player.facing = 1;
      player.x += 1.4;
      player.walkF += 0.3;
      player.pole = false;
      const ground = 13 * TILE - player.h;
      player.y = ground;
    } else if (timeLeft > 0) {
      timeLeft--;
      save.score += 50;
      if (clearT % 4 === 0) CAP.audio.play("coin");
    } else {
      if (world.spec.next === "win") {
        state = "win";
        clearT = 0;
      } else {
        save.world = world.spec.next;
        state = "start";
        startT = 0;
        loadLevel(save.world);
      }
    }
  }

  function updatePipe() {
    pipeT++;
    player.y += 1.4;
    player.vx = 0;
    if (pipeT > 40) {
      const w = pipeWarp;
      if (w.dest === "1-1" && w.outX) {
        state = "play";
        loadLevel("1-1", { outX: w.outX, outY: w.outY, keepTime: true });
        CAP.audio.play("pipe");
      } else {
        state = "play";
        loadLevel(w.dest);
        CAP.audio.play("pipe");
      }
    }
  }

  function tick() {
    if (inp.mutePressed) {
      const m = CAP.audio.toggleMute();
      showToast(m ? "静音" : "音效开", 60);
    }

    if (state === "title") {
      if (inp.startPressed || inp.jumpPressed || inp.anyPressed) {
        CAP.audio.init();
        save.lives = 3;
        save.coins = 0;
        save.score = 0;
        save.world = "1-1";
        save.power = 0;
        state = "start";
        startT = 0;
        loadLevel("1-1");
      }
    } else if (state === "start") {
      startT++;
      if (startT > 90) {
        state = "play";
        const music = world.theme === "underground" ? "underground" : "overworld";
        CAP.audio.playMusic(music);
        if (world.id === "1-1") showToast("水管上按 ▼ 进入", 150);
      }
    } else if (state === "play") updatePlay();
    else if (state === "dead") updateDead();
    else if (state === "clear") updateClear();
    else if (state === "pipe") updatePipe();
    else if (state === "gameover") {
      deadT++;
      if (deadT > 180 && (inp.startPressed || inp.jumpPressed)) {
        state = "title";
        CAP.audio.playMusic("title");
      }
    } else if (state === "win") {
      clearT++;
      if (clearT > 240 && (inp.startPressed || inp.jumpPressed)) {
        state = "title";
        CAP.audio.playMusic("title");
      }
    }

    if (toastT > 0) {
      toastT--;
      if (toastT <= 0) hideToast();
    }
    frame++;
  }

  function skyColor() {
    if (!world) return "#5C94FC";
    return world.theme === "underground" ? "#000000" : "#5C94FC";
  }

  function drawText(x, y, text, scale, color) {
    scale = scale || 1;
    color = color || "#FCFCFC";
    text = String(text).toUpperCase();
    ctx.fillStyle = color;
    for (let i = 0; i < text.length; i++) {
      const g = SPR.font[text[i]] || SPR.font[" "];
      if (!g) continue;
      for (let row = 0; row < g.length; row++) {
        const line = g[row];
        for (let col = 0; col < line.length; col++) {
          if (line[col] === "x") {
            ctx.fillRect(x + (i * 4 + col) * scale, y + row * scale, scale, scale);
          }
        }
      }
    }
  }

  function drawSpr(img, x, y, flipH) {
    if (!img) return;
    const dx = Math.round(x - camX);
    const dy = Math.round(y);
    if (dx + img.width < 0 || dx > VIEW_W) return;
    if (flipH) {
      ctx.save();
      ctx.translate(dx + img.width, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0);
      ctx.restore();
    } else {
      ctx.drawImage(img, dx, dy);
    }
  }

  function tileSprite(c) {
    if (c === "=") return SPR.ground;
    if (c === "#") return SPR.brick;
    if (QBLOCK.test(c)) return (frame >> 3) % 2 ? SPR.q0 : SPR.q1;
    if (c === "X") return SPR.used;
    if (c === "H") return SPR.hard;
    if (c === "p" || c === "v" || c === "W" || c === "w") return SPR.pipeTL;
    if (c === "q") return SPR.pipeTR;
    if (c === "P") return SPR.pipeBL;
    if (c === "Q") return SPR.pipeBR;
    return null;
  }

  function drawWorld() {
    ctx.fillStyle = skyColor();
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    if (world && world.spec.decor) {
      world.spec.decor.forEach((d) => {
        let spr = null;
        if (d.t === "cloud") spr = d.s === 2 ? SPR.cloud2 : SPR.cloud1;
        else if (d.t === "bush") spr = d.s === 3 ? SPR.bush3 : d.s === 2 ? SPR.bush2 : SPR.bush1;
        else if (d.t === "hill") spr = d.s === 2 ? SPR.hill2 : SPR.hill1;
        if (!spr) return;
        const x = d.x * TILE;
        const y = d.t === "cloud" ? d.y * TILE : d.y * TILE - spr.height;
        drawSpr(spr, x, y, false);
      });
    }

    if (!world) return;
    const tx0 = Math.max(0, Math.floor(camX / TILE) - 1);
    const tx1 = Math.min(world.W - 1, Math.floor((camX + VIEW_W) / TILE) + 1);
    for (let ty = 0; ty < world.H; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const c = world.tiles[ty][tx];
        const spr = tileSprite(c);
        if (!spr) continue;
        let oy = 0;
        const b = bump.get(tx + "," + ty);
        if (b) oy = -Math.min(4, b);
        ctx.drawImage(spr, Math.round(tx * TILE - camX), ty * TILE + oy);
      }
    }

    if (world.spec.flagX >= 0) {
      const fx = world.spec.flagX * TILE;
      for (let i = 0; i < 10; i++) {
        ctx.drawImage(SPR.pole, Math.round(fx + 6 - camX), 32 + i * 16);
      }
      const fy = 36 + (state === "clear" ? Math.min(140, clearT * 2.2) : 0);
      drawSpr(SPR.flag, fx - 10, fy, false);
    }
    if (world.spec.castleX) {
      drawSpr(SPR.castle, world.spec.castleX * TILE - 8, 13 * TILE - SPR.castle.height, false);
    }
  }

  function playerSprite() {
    const pack = player.power === 2 ? SPR.fire : player.power === 1 ? SPR.big : SPR.small;
    const left = player.facing < 0;
    if (player.dead) return left ? SPR.small.dieL : SPR.small.die;
    if (!player.onGround && !player.pole) return left ? pack.jumpL : pack.jump;
    if (player.skid) return left ? pack.skidL : pack.skid;
    if (Math.abs(player.vx) > 0.15 && player.onGround) {
      const frames = left ? pack.walkL : pack.walk;
      return frames[(player.walkF | 0) % frames.length];
    }
    return left ? pack.standL : pack.stand;
  }

  function drawEntities() {
    ents.forEach((e) => {
      if (e.kind === "walker") {
        const spr = e.flat ? SPR.walkerFlat : SPR.walker[(frame >> 3) % 2];
        drawSpr(spr, e.x, e.y + (e.flat ? -8 : 0), e.vx > 0);
      } else if (e.kind === "turtle") {
        if (e.shell) drawSpr(SPR.shell, e.x, e.y, false);
        else drawSpr(e.vx > 0 ? SPR.turtleL[(frame >> 3) % 2] : SPR.turtle[(frame >> 3) % 2], e.x, e.y, false);
      } else if (e.kind === "plant") {
        drawSpr(SPR.plant[(frame >> 4) % 2], e.x - 1, e.y, false);
      } else if (e.kind === "coin" || e.kind === "popcoin") {
        drawSpr(SPR.coin[(frame >> 2) % 4], e.x, e.y, false);
      } else if (e.kind === "mush") drawSpr(SPR.mush, e.x, e.y, false);
      else if (e.kind === "oneup") drawSpr(SPR.oneup, e.x, e.y, false);
      else if (e.kind === "flower") drawSpr(SPR.flower[(frame >> 3) % 2], e.x, e.y, false);
      else if (e.kind === "star") drawSpr(SPR.star, e.x, e.y, false);
    });
    fireballs.forEach((f) => drawSpr(SPR.fireball[(f.f >> 1) % 2], f.x, f.y, false));
    particles.forEach((p) => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.t / 40);
      if (p.spr === "brick") ctx.drawImage(SPR.brickBit, Math.round(p.x - camX), p.y);
      ctx.restore();
    });
    pops.forEach((p) => drawText(Math.round(p.x - camX), p.y, p.text, 1, "#FCFCFC"));
  }

  function drawPlayer() {
    if ((invuln > 0 || growFlash > 0) && (frame & 2) && !player.dead) return;
    if (starT > 0 && (frame & 1)) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
    }
    const spr = playerSprite();
    const dx = player.x - (spr.width - player.w) / 2;
    const dy = player.y + player.h - spr.height;
    drawSpr(spr, dx, dy, false);
    if (starT > 0 && (frame & 1)) ctx.restore();
  }

  function drawHUD() {
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(0, 0, VIEW_W, 28);
    drawText(8, 6, "CAP", 1, "#FCFCFC");
    drawText(8, 14, pad(save.score, 6), 1, "#FCFCFC");
    ctx.drawImage(SPR.coin[(frame >> 2) % 4], 88, 10);
    drawText(100, 14, "X" + pad(save.coins, 2), 1, "#FCFCFC");
    drawText(160, 6, "WORLD", 1, "#FCFCFC");
    drawText(168, 14, world ? world.id : "1-1", 1, "#FCFCFC");
    drawText(216, 6, "TIME", 1, "#FCFCFC");
    drawText(224, 14, pad(timeLeft, 3), 1, timeLeft < 100 ? "#F83800" : "#FCFCFC");
  }

  function drawTitle() {
    ctx.fillStyle = "#5C94FC";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.drawImage(SPR.hill2, 10, 208 - SPR.hill2.height);
    ctx.drawImage(SPR.bush3, 140, 208 - SPR.bush3.height);
    ctx.drawImage(SPR.cloud2, 160, 24);
    ctx.drawImage(SPR.cloud1, 40, 40);
    for (let x = 0; x < 16; x++) ctx.drawImage(SPR.ground, x * 16, 208);

    drawText(52, 36, "SUPER", 3, "#F83800");
    drawText(40, 58, "CAP QUEST", 3, "#FCFCFC");
    drawText(70, 86, "SUPER CAP QUEST", 1, "#F8D800");

    ctx.drawImage(SPR.small.stand, 78, 150);
    ctx.drawImage(SPR.walker[(frame >> 4) % 2], 130, 160);
    ctx.drawImage(SPR.coin[(frame >> 2) % 4], 170, 164);

    if ((frame >> 4) & 1) drawText(52, 118, "TAP OR PRESS START", 1, "#FCFCFC");
    drawText(24, 196, "A JUMP   B RUN FIRE", 1, "#1818A8");
    drawText(16, 228, "ORIGINAL TRIBUTE GAME", 1, "#FCFCFC");
  }

  function drawOverlay() {
    if (state === "start") {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      drawText(88, 80, "WORLD " + save.world, 1, "#FCFCFC");
      ctx.drawImage(SPR.small.stand, 100, 110);
      drawText(122, 118, "X " + Math.max(0, save.lives), 1, "#FCFCFC");
      if (world) drawText(80, 150, world.name, 1, "#F8D800");
    }
    if (state === "play" && paused) {
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      drawText(92, 110, "PAUSED", 2, "#FCFCFC");
    }
    if (state === "gameover") {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      drawText(76, 110, "GAME OVER", 2, "#F83800");
      drawText(64, 150, "TAP TO CONTINUE", 1, "#FCFCFC");
    }
    if (state === "win") {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      drawText(40, 70, "WORLD CLEAR", 2, "#F8D800");
      drawText(52, 110, "THANKS FOR PLAYING", 1, "#FCFCFC");
      drawText(68, 140, "SCORE " + pad(save.score, 6), 1, "#FCFCFC");
      if ((frame >> 4) & 1) drawText(64, 180, "TAP TO TITLE", 1, "#FCFCFC");
      if (clearT % 40 === 10) CAP.audio.play("firework");
    }
  }

  function render() {
    ctx.imageSmoothingEnabled = false;
    if (state === "title") {
      drawTitle();
      return;
    }
    drawWorld();
    drawEntities();
    if (player) drawPlayer();
    drawHUD();
    drawOverlay();
  }

  function loop(t) {
    if (!last) last = t;
    acc += Math.min(100, t - last);
    last = t;
    inp = CAP.input.consume();
    while (acc >= DT) {
      tick();
      acc -= DT;
    }
    render();
    requestAnimationFrame(loop);
  }

  function boot() {
    canvas = document.getElementById("game");
    ctx = canvas.getContext("2d");
    SPR = CAP.buildSprites();
    CAP.input.attach();
    CAP.audio.init();
    try { CAP.audio.playMusic("title"); } catch (e) { /* wait for gesture */ }
    requestAnimationFrame(loop);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window.CAP = window.CAP || {});
