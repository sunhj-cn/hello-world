(function (CAP) {
  "use strict";

  const H = 15;

  function grid(w) {
    return Array.from({ length: H }, () => Array(w).fill("."));
  }

  function set(g, x, y, c) {
    if (y >= 0 && y < H && x >= 0 && x < g[0].length) g[y][x] = c;
  }

  function fill(g, x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(g, x + i, y + j, c);
  }

  function ground(g, x0, x1) {
    fill(g, x0, 13, x1 - x0, 2, "=");
  }

  function pipe(g, x, height) {
    const top = 13 - height;
    set(g, x, top, "p");
    set(g, x + 1, top, "q");
    for (let y = top + 1; y < 13; y++) {
      set(g, x, y, "P");
      set(g, x + 1, y, "Q");
    }
    return top;
  }

  function stairs(g, x, steps, dir) {
    for (let i = 0; i < steps; i++) {
      const h = dir > 0 ? i + 1 : steps - i;
      for (let j = 0; j < h; j++) set(g, x + i, 12 - j, "H");
    }
  }

  function row(g) {
    return g.map((r) => r.join(""));
  }

  function world11() {
    const W = 230;
    const g = grid(W);
    ground(g, 0, 69);
    ground(g, 72, 86);
    ground(g, 89, 154);
    ground(g, 157, 230);

    set(g, 3, 12, "S");

    set(g, 16, 9, "?");
    fill(g, 20, 9, 3, 1, "#");
    set(g, 21, 9, "!");
    set(g, 22, 9, "?");
    set(g, 22, 5, "?");

    set(g, 22, 12, "g");
    set(g, 29, 12, "g");
    set(g, 40, 12, "g");
    set(g, 42, 12, "g");

    pipe(g, 28, 2);
    pipe(g, 38, 3);
    const p3 = pipe(g, 46, 4);
    set(g, 46, p3, "v");
    const bonus = pipe(g, 57, 4);
    set(g, 57, bonus, "W");

    fill(g, 77, 9, 3, 1, "#");
    set(g, 78, 9, "@");
    set(g, 80, 5, "?");
    set(g, 81, 5, "?");
    fill(g, 94, 9, 8, 1, "#");
    set(g, 95, 9, "?");
    set(g, 97, 9, "?");
    set(g, 96, 5, "+");

    set(g, 82, 12, "k");
    set(g, 100, 12, "g");
    set(g, 102, 12, "g");
    set(g, 113, 12, "k");

    fill(g, 118, 9, 2, 1, "#");
    set(g, 119, 5, "*");
    fill(g, 128, 9, 3, 1, "?");
    set(g, 129, 9, "!");

    pipe(g, 136, 2);
    pipe(g, 148, 3);

    set(g, 141, 12, "g");
    set(g, 160, 12, "g");
    set(g, 162, 12, "k");

    fill(g, 168, 9, 4, 1, "#");
    set(g, 169, 9, "?");
    set(g, 171, 5, "?");

    stairs(g, 181, 8, 1);
    fill(g, 189, 5, 1, 8, "H");
    fill(g, 194, 12, 2, 1, "H");
    stairs(g, 196, 4, -1);

    set(g, 210, 12, "F");
    fill(g, 214, 8, 5, 5, "C");

    return {
      id: "1-1",
      name: "草原出发",
      theme: "overworld",
      time: 400,
      tiles: row(g),
      spawnX: 40,
      spawnY: 176,
      flagX: 210,
      castleX: 214,
      next: "1-2",
      decor: [
        { t: "hill", s: 2, x: 0, y: 13 },
        { t: "bush", s: 3, x: 11, y: 13 },
        { t: "cloud", s: 1, x: 8, y: 3 },
        { t: "cloud", s: 2, x: 19, y: 2 },
        { t: "hill", s: 1, x: 48, y: 13 },
        { t: "bush", s: 1, x: 60, y: 13 },
        { t: "cloud", s: 1, x: 56, y: 3 },
        { t: "cloud", s: 2, x: 88, y: 2 },
        { t: "bush", s: 2, x: 90, y: 13 },
        { t: "hill", s: 2, x: 108, y: 13 },
        { t: "cloud", s: 1, x: 120, y: 3 },
        { t: "bush", s: 3, x: 164, y: 13 },
        { t: "cloud", s: 2, x: 170, y: 2 },
        { t: "hill", s: 1, x: 200, y: 13 }
      ],
      warps: [{ x: 57, dest: "bonus", dir: "down" }]
    };
  }

  function bonus() {
    const W = 48;
    const g = grid(W);
    fill(g, 0, 0, W, 1, "#");
    fill(g, 0, 1, 1, 12, "#");
    fill(g, W - 1, 1, 1, 12, "#");
    ground(g, 0, W);
    fill(g, 4, 8, 16, 1, "o");
    fill(g, 6, 6, 12, 1, "o");
    fill(g, 8, 4, 8, 1, "o");
    fill(g, 22, 9, 3, 1, "#");
    set(g, 23, 9, "!");
    set(g, 3, 12, "S");
    pipe(g, 40, 3);
    set(g, 40, 10, "w");
    return {
      id: "bonus",
      name: "金币密室",
      theme: "underground",
      time: 200,
      tiles: row(g),
      spawnX: 48,
      spawnY: 176,
      flagX: -1,
      next: "1-1",
      decor: [],
      warps: [{ x: 40, dest: "1-1", dir: "down", outX: 960, outY: 192 }],
      bonus: true
    };
  }

  function world12() {
    const W = 210;
    const g = grid(W);
    fill(g, 0, 0, W, 2, "#");
    ground(g, 0, 48);
    ground(g, 51, 90);
    ground(g, 94, 140);
    ground(g, 144, 210);
    fill(g, 0, 2, 1, 11, "#");
    fill(g, W - 1, 2, 1, 11, "#");

    set(g, 3, 12, "S");
    fill(g, 10, 9, 5, 1, "#");
    set(g, 12, 9, "?");
    set(g, 14, 9, "!");
    set(g, 18, 12, "g");
    set(g, 22, 12, "g");
    pipe(g, 28, 3);
    set(g, 28, 10, "v");

    fill(g, 36, 7, 8, 1, "o");
    fill(g, 38, 9, 4, 1, "#");
    set(g, 40, 9, "@");

    set(g, 54, 12, "k");
    set(g, 60, 12, "g");
    fill(g, 64, 5, 6, 1, "#");
    set(g, 66, 5, "?");
    fill(g, 72, 9, 3, 1, "#");

    pipe(g, 80, 4);
    fill(g, 98, 8, 10, 1, "o");
    fill(g, 100, 10, 6, 1, "#");
    set(g, 108, 12, "g");
    set(g, 110, 12, "k");
    set(g, 118, 12, "g");

    fill(g, 122, 9, 4, 1, "?");
    set(g, 123, 9, "*");
    stairs(g, 150, 6, 1);
    fill(g, 156, 7, 1, 6, "H");
    pipe(g, 168, 2);
    set(g, 180, 12, "g");
    stairs(g, 186, 5, 1);
    set(g, 198, 12, "F");
    fill(g, 202, 8, 5, 5, "C");

    return {
      id: "1-2",
      name: "地下通道",
      theme: "underground",
      time: 400,
      tiles: row(g),
      spawnX: 40,
      spawnY: 176,
      flagX: 198,
      castleX: 202,
      next: "1-3",
      decor: []
    };
  }

  function world13() {
    const W = 220;
    const g = grid(W);
    ground(g, 0, 16);
    ground(g, 20, 32);
    ground(g, 36, 48);
    ground(g, 54, 70);
    ground(g, 76, 88);
    ground(g, 94, 110);
    ground(g, 118, 128);
    ground(g, 136, 220);

    set(g, 3, 12, "S");
    fill(g, 10, 9, 3, 1, "?");
    set(g, 11, 9, "!");
    set(g, 24, 12, "g");
    fill(g, 26, 8, 4, 1, "#");
    set(g, 28, 8, "?");

    fill(g, 40, 6, 5, 1, "H");
    set(g, 42, 6, "@");
    set(g, 41, 5, "o");
    set(g, 42, 5, "o");
    set(g, 43, 5, "o");
    set(g, 58, 12, "k");
    set(g, 64, 12, "g");
    fill(g, 66, 9, 3, 1, "#");
    pipe(g, 82, 3);
    set(g, 82, 10, "v");

    fill(g, 98, 7, 6, 1, "H");
    fill(g, 100, 4, 4, 1, "o");
    set(g, 102, 7, "*");
    set(g, 104, 12, "g");
    set(g, 122, 12, "k");

    fill(g, 140, 9, 5, 1, "#");
    set(g, 142, 9, "?");
    set(g, 144, 5, "?");
    set(g, 152, 12, "g");
    set(g, 154, 12, "g");

    stairs(g, 170, 8, 1);
    fill(g, 178, 5, 2, 8, "H");
    stairs(g, 184, 5, -1);
    set(g, 200, 12, "F");
    fill(g, 206, 8, 5, 5, "C");

    return {
      id: "1-3",
      name: "云端跳跃",
      theme: "overworld",
      time: 300,
      tiles: row(g),
      spawnX: 40,
      spawnY: 176,
      flagX: 200,
      castleX: 206,
      next: "win",
      decor: [
        { t: "cloud", s: 2, x: 6, y: 2 },
        { t: "cloud", s: 1, x: 30, y: 3 },
        { t: "hill", s: 1, x: 0, y: 13 },
        { t: "cloud", s: 2, x: 70, y: 2 },
        { t: "bush", s: 2, x: 100, y: 13 },
        { t: "cloud", s: 1, x: 130, y: 3 },
        { t: "cloud", s: 2, x: 160, y: 2 },
        { t: "hill", s: 2, x: 190, y: 13 }
      ]
    };
  }

  CAP.levels = {
    "1-1": world11,
    "1-2": world12,
    "1-3": world13,
    bonus: bonus
  };
})(window.CAP = window.CAP || {});
