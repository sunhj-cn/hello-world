(function (CAP) {
  "use strict";

  const C = {
    k: [0, 0, 0],
    w: [252, 252, 252],
    r: [181, 49, 32],
    R: [248, 56, 0],
    s: [252, 160, 68],
    d: [228, 92, 16],
    b: [24, 24, 168],
    B: [92, 148, 252],
    n: [136, 20, 0],
    N: [200, 76, 12],
    o: [248, 216, 0],
    y: [252, 188, 84],
    g: [0, 168, 0],
    G: [128, 208, 16],
    p: [0, 104, 0],
    m: [80, 48, 0],
    M: [184, 112, 48],
    u: [188, 188, 188],
    U: [252, 188, 176],
    h: [252, 188, 176],
    t: [252, 152, 56],
    T: [200, 76, 12],
    f: [248, 248, 248],
    e: [60, 188, 252],
    x: [160, 32, 240],
    z: [252, 116, 180]
  };

  function compile(rows, map) {
    map = map || C;
    const h = rows.length;
    const w = rows[0].length;
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext("2d");
    const im = ctx.createImageData(w, h);
    const data = im.data;
    for (let y = 0; y < h; y++) {
      const row = rows[y];
      for (let x = 0; x < w; x++) {
        const col = map[row[x]];
        if (!col) continue;
        const i = (y * w + x) * 4;
        data[i] = col[0];
        data[i + 1] = col[1];
        data[i + 2] = col[2];
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(im, 0, 0);
    return cv;
  }

  function flip(src) {
    const cv = document.createElement("canvas");
    cv.width = src.width;
    cv.height = src.height;
    const ctx = cv.getContext("2d");
    ctx.translate(src.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(src, 0, 0);
    return cv;
  }

  function recolor(src, from, to) {
    const cv = document.createElement("canvas");
    cv.width = src.width;
    cv.height = src.height;
    const ctx = cv.getContext("2d");
    ctx.drawImage(src, 0, 0);
    const im = ctx.getImageData(0, 0, cv.width, cv.height);
    const d = im.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] === from[0] && d[i + 1] === from[1] && d[i + 2] === from[2]) {
        d[i] = to[0]; d[i + 1] = to[1]; d[i + 2] = to[2];
      }
    }
    ctx.putImageData(im, 0, 0);
    return cv;
  }

  const smallStand = [
    "    rrrr    ",
    "   rrrrrr   ",
    "   rrrrrr   ",
    "   nsssn    ",
    "  nsssssn   ",
    "  nsksskn   ",
    "  sssssss   ",
    "  ssdddss   ",
    "   bbbbb    ",
    "  bb b bb   ",
    "  ww b ww   ",
    "  ww b ww   ",
    "   nnnnn    ",
    "   nn nn    ",
    "   nn nn    ",
    "            "
  ];

  const smallWalk1 = [
    "    rrrr    ",
    "   rrrrrr   ",
    "   rrrrrr   ",
    "   nsssn    ",
    "  nsssssn   ",
    "  nsksskn   ",
    "  sssssss   ",
    "  ssdddss   ",
    "   bbbbb    ",
    "  bb b bb   ",
    "  wwbb ww   ",
    "   w b w    ",
    "   nnnn     ",
    "  nn  nn    ",
    " nn    n    ",
    "            "
  ];

  const smallWalk2 = [
    "    rrrr    ",
    "   rrrrrr   ",
    "   rrrrrr   ",
    "   nsssn    ",
    "  nsssssn   ",
    "  nsksskn   ",
    "  sssssss   ",
    "  ssdddss   ",
    "   bbbbb    ",
    "   bbbbb    ",
    "   wwwww    ",
    "   w b w    ",
    "    nnn     ",
    "    nn      ",
    "    nn      ",
    "            "
  ];

  const smallJump = [
    "    rrrr    ",
    "   rrrrrr   ",
    "   rrrrrr   ",
    "   nsssn    ",
    "  nsssssn   ",
    "  nsksskn   ",
    "  sssssss   ",
    "  ssdddss   ",
    "  bbbbbbb   ",
    " bb b bb b  ",
    " ww b bb ww ",
    " ww     ww  ",
    "  nn   nn   ",
    " nn     nn  ",
    "            ",
    "            "
  ];

  const smallSkid = [
    "    rrrr    ",
    "   rrrrrr   ",
    "   rrrrrr   ",
    "   nsssn    ",
    "  nsksssn   ",
    "  nsssskn   ",
    "  sssssss   ",
    "  ssdddss   ",
    "   bbbbb    ",
    "  bbb bb    ",
    "  www bb    ",
    "    w bb    ",
    "   nnnn     ",
    "  nn  nn    ",
    "            ",
    "            "
  ];

  const smallDie = [
    "            ",
    "    rrrr    ",
    "   rrrrrr   ",
    "   nsssn    ",
    "  nsksskn   ",
    "  sssssss   ",
    "  ss k ss   ",
    "   bbbbb    ",
    "  bb b bb   ",
    "  ww b ww   ",
    "   nnnnn    ",
    "  nn   nn   ",
    "            ",
    "            ",
    "            ",
    "            "
  ];

  const bigHead = [
    "    rrrrrr    ",
    "   rrrrrrrr   ",
    "   rrrrrrrr   ",
    "  rrrrrrrrrr  ",
    "   nnssssnn   ",
    "  nnssssssnn  ",
    "  nnskssksnn  ",
    "  nssssssssn  ",
    "   ssssssss   ",
    "   ssddddss   ",
    "    ssssss    ",
    "              "
  ];

  const bigBodyStand = [
    "    bbbbbb    ",
    "   bbbbbbbb   ",
    "  bb bbbb bb  ",
    "  ww bbbb ww  ",
    "  ww bbbb ww  ",
    "  ww bbbb ww  ",
    "     bbbb     ",
    "    nnnnnn    ",
    "   nnn  nnn   ",
    "   nnn  nnn   ",
    "   nnn  nnn   ",
    "              "
  ];

  const bigBodyWalk1 = [
    "    bbbbbb    ",
    "   bbbbbbbb   ",
    "  bb bbbb bb  ",
    "  ww bbbb ww  ",
    "  ww bbbb ww  ",
    "   w bbbb w   ",
    "     bbbb     ",
    "    nnnnnn    ",
    "   nnn  nnn   ",
    "  nnn    nnn  ",
    " nnn      nn  ",
    "              "
  ];

  const bigBodyWalk2 = [
    "    bbbbbb    ",
    "   bbbbbbbb   ",
    "   bbbbbbbb   ",
    "   wwbbbbww   ",
    "    wbbbbw    ",
    "     bbbb     ",
    "     bbbb     ",
    "     nnnn     ",
    "     nnnn     ",
    "     nnnn     ",
    "     nnnn     ",
    "              "
  ];

  const bigBodyJump = [
    "    bbbbbb    ",
    "   bbbbbbbb   ",
    "  bb bbbb bb  ",
    "  ww bbbb ww  ",
    " ww  bbbb  ww ",
    " ww  bbbb  ww ",
    "     bbbb     ",
    "    nnnnnn    ",
    "   nnn  nnn   ",
    "  nnn    nnn  ",
    "              ",
    "              "
  ];

  function stack(head, body) {
    return head.concat(body);
  }

  const walkerA = [
    "    nnnn    ",
    "   nNNNN    ",
    "  nNNNNnn   ",
    "  NNNNNNN   ",
    " nNwNNNwNn  ",
    " nNNNNNNNn  ",
    " nNNNNNNNn  ",
    "  nNNNNNn   ",
    "  yyyyyyy   ",
    " yk yyy ky  ",
    " yy yyy yy  ",
    "  y  y  y   ",
    "            ",
    "            ",
    "            ",
    "            "
  ];

  const walkerB = [
    "    nnnn    ",
    "   nNNNN    ",
    "  nNNNNnn   ",
    "  NNNNNNN   ",
    " nNwNNNwNn  ",
    " nNNNNNNNn  ",
    " nNNNNNNNn  ",
    "  nNNNNNn   ",
    "  yyyyyyy   ",
    " yk yyy ky  ",
    " yy yyy yy  ",
    " y   y   y  ",
    "            ",
    "            ",
    "            ",
    "            "
  ];

  const walkerFlat = [
    "            ",
    "            ",
    "            ",
    "            ",
    "            ",
    "            ",
    "  nNNNNNNn  ",
    " nNwNNNwNNn ",
    " nNNNNNNNNn ",
    "  yyyyyyyy  ",
    " yk yyyy ky ",
    "            ",
    "            ",
    "            ",
    "            ",
    "            "
  ];

  const turtleA = [
    "     gg     ",
    "    gGGg    ",
    "   gGGGGg   ",
    "   gGwGwg   ",
    "    sssss   ",
    "   sskssk   ",
    "  pggggggp  ",
    " pggGGgGggp ",
    " pggggggggp ",
    "  pggggggp  ",
    "   y    y   ",
    "   yy  yy   ",
    "            ",
    "            ",
    "            ",
    "            "
  ];

  const turtleB = [
    "     gg     ",
    "    gGGg    ",
    "   gGGGGg   ",
    "   gGwGwg   ",
    "    sssss   ",
    "   sskssk   ",
    "  pggggggp  ",
    " pggGGgGggp ",
    " pggggggggp ",
    "  pggggggp  ",
    "    yy yy   ",
    "    y   y   ",
    "            ",
    "            ",
    "            ",
    "            "
  ];

  const shell = [
    "            ",
    "            ",
    "            ",
    "            ",
    "   pggggp   ",
    "  pggGGggp  ",
    " pggGGGGggp ",
    " pggggggggp ",
    "  pggggggp  ",
    "   pggggp   ",
    "            ",
    "            ",
    "            ",
    "            ",
    "            ",
    "            "
  ];

  const plantA = [
    "  g    g    ",
    "  Gg  gG    ",
    "  wGggGw    ",
    "   GkkG     ",
    "   GGGG     ",
    "    pp      ",
    "    pp      ",
    "    pp      ",
    "    pp      ",
    "    pp      ",
    "    pp      ",
    "            ",
    "            ",
    "            ",
    "            ",
    "            "
  ];

  const plantB = [
    " g      g   ",
    " Gg    gG   ",
    " wGggggGw   ",
    "  GkwwkG    ",
    "   GGGG     ",
    "    pp      ",
    "    pp      ",
    "    pp      ",
    "    pp      ",
    "    pp      ",
    "    pp      ",
    "            ",
    "            ",
    "            ",
    "            ",
    "            "
  ];

  const mush = [
    "    rrrr    ",
    "   rrwrrr   ",
    "  rrwwrrrr  ",
    "  rrrrrrrr  ",
    "   rrrrrr   ",
    "    ssss    ",
    "   skssks   ",
    "    ssss    ",
    "            ",
    "            ",
    "            ",
    "            ",
    "            ",
    "            ",
    "            ",
    "            "
  ];

  const oneup = [
    "    gggg    ",
    "   ggwggg   ",
    "  ggwwgggg  ",
    "  gggggggg  ",
    "   gggggg   ",
    "    ssss    ",
    "   skssks   ",
    "    ssss    ",
    "            ",
    "            ",
    "            ",
    "            ",
    "            ",
    "            ",
    "            ",
    "            "
  ];

  const flowerA = [
    "  o  o  o   ",
    "   rwrwr    ",
    "  rwwwwwr   ",
    "   rwrwr    ",
    "     g      ",
    "    gGg     ",
    "   gG Gg    ",
    "            ",
    "            ",
    "            ",
    "            ",
    "            ",
    "            ",
    "            ",
    "            ",
    "            "
  ];

  const flowerB = [
    " o  o  o    ",
    "  ryryry    ",
    " ryyyyyyr   ",
    "  ryryry    ",
    "     g      ",
    "    gGg     ",
    "   gG Gg    ",
    "            ",
    "            ",
    "            ",
    "            ",
    "            ",
    "            ",
    "            ",
    "            ",
    "            "
  ];

  const starA = [
    "     o      ",
    "    oyo     ",
    " ooooyoooo  ",
    "  oyyyyyo   ",
    "   oyyyo    ",
    "  oyo oyo   ",
    " oo     oo  ",
    "            ",
    "            ",
    "            ",
    "            ",
    "            ",
    "            ",
    "            ",
    "            ",
    "            "
  ];

  const coinA = [
    "    oo    ",
    "   oyyo   ",
    "  oywwyo  ",
    "  oywkyo  ",
    "  oywkyo  ",
    "  oywwyo  ",
    "   oyyo   ",
    "    oo    "
  ];

  const coinB = [
    "    oo    ",
    "    yy    ",
    "   ywwy   ",
    "   ywky   ",
    "   ywky   ",
    "   ywwy   ",
    "    yy    ",
    "    oo    "
  ];

  const coinC = [
    "    o     ",
    "    y     ",
    "    y     ",
    "    y     ",
    "    y     ",
    "    y     ",
    "    y     ",
    "    o     "
  ];

  const fireA = [
    "  oR  ",
    " oRRo ",
    " RwwR ",
    " oRRo ",
    "  oR  ",
    "      "
  ];

  const fireB = [
    "  Ro  ",
    " RwwR ",
    " oRRo ",
    " RwwR ",
    "  Ro  ",
    "      "
  ];

  function tileGround() {
    return compile([
      "NNNNNNNNNNNNNNNN",
      "NUhUhUhUhUhUhUhN",
      "UhUhUhUhUhUhUhUh",
      "hUhUNNNNhUhUNNNh",
      "NNNNNkkNNNNNkkNN",
      "kNNkNNNNNkNNNNNk",
      "NNNNNNNNNNNNNNNN",
      "NNNkNNNkNNNkNNNN",
      "kNNNNNNNNNNNNNkN",
      "NNNNNNkNNNNNNNNN",
      "NkNNNNNNNNNkNNNN",
      "NNNNNNNNNNNNNNNN",
      "NNNNkNNNNNNNkNNN",
      "kNNNNNNNNNNNNNNN",
      "NNNNNkNNNNNNNNNk",
      "kkkkkkkkkkkkkkkk"
    ]);
  }

  function tileBrick() {
    return compile([
      "yyyyyyyyyyyyyyyy",
      "NkkkkkkkNkkkkkkk",
      "NhhhhhhhNhhhhhhh",
      "NhhhhhhhNhhhhhhh",
      "yyyyyyyyyyyyyyyy",
      "kkkkNkkkkkkkNkkk",
      "hhhhNhhhhhhhNhhh",
      "hhhhNhhhhhhhNhhh",
      "yyyyyyyyyyyyyyyy",
      "NkkkkkkkNkkkkkkk",
      "NhhhhhhhNhhhhhhh",
      "NhhhhhhhNhhhhhhh",
      "yyyyyyyyyyyyyyyy",
      "kkkkNkkkkkkkNkkk",
      "hhhhNhhhhhhhNhhh",
      "kkkkkkkkkkkkkkkk"
    ]);
  }

  function tileQuestion(frame) {
    const marks = [
      [
        "                ",
        "  oooooooooooo  ",
        " oyyyyyyyyyyyyo ",
        " oyykkyyyyykyyo ",
        " oyykkyyyykkyyo ",
        " oyyyyyyykkyyyo ",
        " oyyyyyykkyyyyo ",
        " oyyyyyykkyyyyo ",
        " oyyyyyyyyyyyyo ",
        " oyyyyyykkyyyyo ",
        " oyyyyyyyyyyyyo ",
        " oyyyyyyyyyyyyo ",
        "  oooooooooooo  ",
        "  kkkkkkkkkkkk  ",
        "                ",
        "                "
      ],
      [
        "                ",
        "  yyyyyyyyyyyy  ",
        " yooooooooooooy ",
        " yooykyyyyykyoy ",
        " yooykyyyykyyoy ",
        " yoyyyyyykyyyoy ",
        " yoyyyyykyyyyoy ",
        " yoyyyyykyyyyoy ",
        " yoyyyyyyyyyyoy ",
        " yoyyyyykyyyyoy ",
        " yoyyyyyyyyyyoy ",
        " yooooooooooooy ",
        "  yyyyyyyyyyyy  ",
        "  kkkkkkkkkkkk  ",
        "                ",
        "                "
      ]
    ];
    return compile(marks[frame]);
  }

  function tileUsed() {
    return compile([
      "NNNNNNNNNNNNNNNN",
      "NhhhhhhhhhhhhhhN",
      "NhhhhhhhhhhhhhhN",
      "NhhhhhhhhhhhhhhN",
      "NhhhhhhhhhhhhhhN",
      "NhhhhhhhhhhhhhhN",
      "NhhhhhhhhhhhhhhN",
      "NhhhhhhhhhhhhhhN",
      "NhhhhhhhhhhhhhhN",
      "NhhhhhhhhhhhhhhN",
      "NhhhhhhhhhhhhhhN",
      "NhhhhhhhhhhhhhhN",
      "NhhhhhhhhhhhhhhN",
      "NhhhhhhhhhhhhhhN",
      "NNNNNNNNNNNNNNNN",
      "kkkkkkkkkkkkkkkk"
    ]);
  }

  function tileHard() {
    return compile([
      "uuuuuuuuuuuuuuuu",
      "uwwwwwwwwwwwwwku",
      "uwwwwwwwwwwwwwku",
      "uwwkkkkkkkkwwwku",
      "uwwkkkkkkkkwwwku",
      "uwwkkkkkkkkwwwku",
      "uwwkkkkkkkkwwwku",
      "uwwwwwwwwwwwwwku",
      "uwwwwwwwwwwwwwku",
      "ukkkkkkkkkkkkkku",
      "ukkkkkkkkkkkkkku",
      "ukkkkkkkkkkkkkku",
      "ukkkkkkkkkkkkkku",
      "ukkkkkkkkkkkkkku",
      "ukkkkkkkkkkkkkku",
      "kkkkkkkkkkkkkkkk"
    ]);
  }

  function tilePipeTop(side) {
    const left = [
      "kkkkkkkkkkkkkkkk",
      "kGGGGGGGGGGGGGGk",
      "kGwwwwwwwwwwwwpk",
      "kGwwwwwwwwwwwwpk",
      "kGggggggggggggpk",
      "kGggggggggggggpk",
      "kGggggggggggggpk",
      "kGggggggggggggpk",
      "kGggggggggggggpk",
      "kGggggggggggggpk",
      "kGggggggggggggpk",
      "kGggggggggggggpk",
      "kGggggggggggggpk",
      "kGggggggggggggpk",
      "kGggggggggggggpk",
      "kGggggggggggggpk"
    ];
    const right = left.map((r) => r.split("").reverse().join(""));
    return compile(side === "L" ? left : right);
  }

  function tilePipeBody(side) {
    const left = [
      "  kGGGGGGGGGpk  ",
      "  kGwwwwwwwwpk  ",
      "  kGggggggggpk  ",
      "  kGggggggggpk  ",
      "  kGggggggggpk  ",
      "  kGggggggggpk  ",
      "  kGggggggggpk  ",
      "  kGggggggggpk  ",
      "  kGggggggggpk  ",
      "  kGggggggggpk  ",
      "  kGggggggggpk  ",
      "  kGggggggggpk  ",
      "  kGggggggggpk  ",
      "  kGggggggggpk  ",
      "  kGggggggggpk  ",
      "  kGggggggggpk  "
    ];
    const right = left.map((r) => r.split("").reverse().join(""));
    return compile(side === "L" ? left : right);
  }

  function makeCloud(size) {
    const w = size === 2 ? 48 : 32;
    const rows = [];
    for (let y = 0; y < 24; y++) rows.push(new Array(w).fill(" "));
    function plot(x, y, c) {
      if (y >= 0 && y < 24 && x >= 0 && x < w) rows[y][x] = c;
    }
    function bump(cx, cy, r) {
      for (let y = -r; y <= r; y++) {
        for (let x = -r; x <= r; x++) {
          if (x * x + y * y <= r * r) {
            const px = cx + x, py = cy + y;
            if (!rows[py] || rows[py][px] === undefined) continue;
            if (rows[py][px] === " ") plot(px, py, "e");
          }
        }
      }
      for (let y = -r + 2; y <= r - 1; y++) {
        for (let x = -r + 2; x <= r - 1; x++) {
          if (x * x + y * y <= (r - 2) * (r - 2)) plot(cx + x, cy + y, "w");
        }
      }
    }
    bump(10, 14, 8);
    bump(20, 10, 9);
    if (size === 2) bump(34, 14, 8);
    else bump(28, 14, 7);
    return compile(rows.map((r) => r.join("")));
  }

  function makeBush(size) {
    const w = size === 3 ? 64 : size === 2 ? 48 : 32;
    const rows = [];
    for (let y = 0; y < 16; y++) rows.push(new Array(w).fill(" "));
    function plot(x, y, c) {
      if (y >= 0 && y < 16 && x >= 0 && x < w) rows[y][x] = c;
    }
    function bump(cx, cy, r) {
      for (let y = -r; y <= r; y++) {
        for (let x = -r; x <= r; x++) {
          if (x * x + y * y <= r * r) {
            const py = cy + y;
            if (py > 15) continue;
            if (rows[py] && rows[py][cx + x] === " ") plot(cx + x, py, "p");
          }
        }
      }
      for (let y = -r + 2; y <= r; y++) {
        for (let x = -r + 2; x <= r - 1; x++) {
          if (x * x + y * y <= (r - 2) * (r - 2)) {
            const py = cy + y;
            if (py <= 15) plot(cx + x, py, "g");
          }
        }
      }
    }
    bump(10, 12, 9);
    bump(22, 8, 10);
    if (size >= 2) bump(36, 12, 9);
    if (size >= 3) bump(50, 10, 9);
    return compile(rows.map((r) => r.join("")));
  }

  function makeHill(size) {
    const w = size === 2 ? 80 : 48;
    const h = size === 2 ? 35 : 22;
    const rows = [];
    for (let y = 0; y < h; y++) rows.push(new Array(w).fill(" "));
    const cx = w / 2, r = w / 2;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = x - cx + 0.5;
        const dy = y - (h - 2);
        if (dx * dx / (r * r) + (dy * dy) / (h * h) <= 1 && dy <= 0) {
          rows[y][x] = x === Math.floor(cx - r + 8) && y > h / 3 && y < h - 4 ? "w" :
            (Math.abs(dx) < 2 && y > 4 && y < 12 ? "p" : "g");
        }
      }
    }
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (rows[y][x] === "g" && (x === 0 || rows[y][x - 1] === " ")) rows[y][x] = "p";
      }
    }
    return compile(rows.map((r) => r.join("")));
  }

  function makeCastle() {
    const rows = [];
    const W = 80, H = 80;
    for (let y = 0; y < H; y++) rows.push(new Array(W).fill(" "));
    function fill(x, y, w, h, c) {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        if (y + j < H && x + i < W && x + i >= 0 && y + j >= 0) rows[y + j][x + i] = c;
      }
    }
    fill(8, 40, 64, 40, "u");
    fill(0, 24, 20, 56, "u");
    fill(60, 24, 20, 56, "u");
    fill(28, 16, 24, 24, "u");
    for (let x = 0; x < 80; x += 8) {
      if (x < 20 || x >= 60) fill(x, 16, 6, 8, "u");
    }
    fill(32, 0, 16, 16, "u");
    fill(36, 4, 8, 8, "k");
    fill(36, 56, 8, 24, "k");
    fill(12, 32, 8, 8, "k");
    fill(60, 32, 8, 8, "k");
    fill(44, 8, 4, 8, "R");
    return compile(rows.map((r) => r.join("")));
  }

  function makeFlag() {
    return compile([
      "gggggggggggg    ",
      "gGGwGGwGGwGg    ",
      "gGGwGGwGGwGg    ",
      "gGGGGGGGGGGg    ",
      "gGGwGGwGGwGg    ",
      "gGGwGGwGGwGg    ",
      "gGGGGGGGGGGg    ",
      "gggggggggggg    ",
      "                ",
      "                "
    ]);
  }

  function makePole() {
    return compile([
      " o ",
      "oyo",
      " o ",
      " u ",
      " u ",
      " u ",
      " u ",
      " u ",
      " u ",
      " u ",
      " u ",
      " u ",
      " u ",
      " u ",
      " u ",
      " u "
    ]);
  }

  const FONT5 = {
    "0": ["xxx", "x x", "x x", "x x", "xxx"],
    "1": ["xx ", " x ", " x ", " x ", "xxx"],
    "2": ["xxx", "  x", "xxx", "x  ", "xxx"],
    "3": ["xxx", "  x", "xxx", "  x", "xxx"],
    "4": ["x x", "x x", "xxx", "  x", "  x"],
    "5": ["xxx", "x  ", "xxx", "  x", "xxx"],
    "6": ["xxx", "x  ", "xxx", "x x", "xxx"],
    "7": ["xxx", "  x", "  x", "  x", "  x"],
    "8": ["xxx", "x x", "xxx", "x x", "xxx"],
    "9": ["xxx", "x x", "xxx", "  x", "xxx"],
    A: ["xxx", "x x", "xxx", "x x", "x x"],
    B: ["xx ", "x x", "xx ", "x x", "xx "],
    C: ["xxx", "x  ", "x  ", "x  ", "xxx"],
    D: ["xx ", "x x", "x x", "x x", "xx "],
    E: ["xxx", "x  ", "xxx", "x  ", "xxx"],
    F: ["xxx", "x  ", "xxx", "x  ", "x  "],
    G: ["xxx", "x  ", "x x", "x x", "xxx"],
    H: ["x x", "x x", "xxx", "x x", "x x"],
    I: ["xxx", " x ", " x ", " x ", "xxx"],
    J: ["  x", "  x", "  x", "x x", "xxx"],
    K: ["x x", "x x", "xx ", "x x", "x x"],
    L: ["x  ", "x  ", "x  ", "x  ", "xxx"],
    M: ["x x", "xxx", "x x", "x x", "x x"],
    N: ["x x", "xx x", "x x", "x x", "x x"],
    O: ["xxx", "x x", "x x", "x x", "xxx"],
    P: ["xxx", "x x", "xxx", "x  ", "x  "],
    Q: ["xxx", "x x", "x x", "x x", "xxxx"],
    R: ["xxx", "x x", "xxx", "x x", "x x"],
    S: ["xxx", "x  ", "xxx", "  x", "xxx"],
    T: ["xxx", " x ", " x ", " x ", " x "],
    U: ["x x", "x x", "x x", "x x", "xxx"],
    V: ["x x", "x x", "x x", "x x", " x "],
    W: ["x x", "x x", "x x", "xxx", "x x"],
    X: ["x x", "x x", " x ", "x x", "x x"],
    Y: ["x x", "x x", " x ", " x ", " x "],
    Z: ["xxx", "  x", " x ", "x  ", "xxx"],
    " ": ["   ", "   ", "   ", "   ", "   "],
    "-": ["   ", "   ", "xxx", "   ", "   "],
    "×": ["x x", " x ", "x x", "   ", "   "],
    "!": [" x ", " x ", " x ", "   ", " x "],
    ".": ["   ", "   ", "   ", "   ", " x "],
    ":": ["   ", " x ", "   ", " x ", "   "],
    "©": ["xxx", "x x", "x  ", "x x", "xxx"]
  };

  FONT5.N = ["xx ", "x x", "x x", "x x", "x x"];
  FONT5.Q = ["xxx", "x x", "x x", "xx ", "  x"];

  function build() {
    const mapK = Object.assign({}, C, { k: [16, 16, 16] });
    const S = {};
    S.small = {
      stand: compile(smallStand, mapK),
      walk: [compile(smallWalk1, mapK), compile(smallStand, mapK), compile(smallWalk2, mapK)],
      jump: compile(smallJump, mapK),
      skid: compile(smallSkid, mapK),
      die: compile(smallDie, mapK)
    };
    S.big = {
      stand: compile(stack(bigHead, bigBodyStand), mapK),
      walk: [
        compile(stack(bigHead, bigBodyWalk1), mapK),
        compile(stack(bigHead, bigBodyStand), mapK),
        compile(stack(bigHead, bigBodyWalk2), mapK)
      ],
      jump: compile(stack(bigHead, bigBodyJump), mapK),
      skid: compile(stack(bigHead, bigBodyStand), mapK)
    };

    function fireify(cv) {
      let out = recolor(cv, C.b, C.w);
      out = recolor(out, [92, 148, 252], C.w);
      out = recolor(out, C.r, C.R);
      return out;
    }
    S.fire = {
      stand: fireify(S.big.stand),
      walk: S.big.walk.map(fireify),
      jump: fireify(S.big.jump),
      skid: fireify(S.big.skid)
    };

    ["small", "big", "fire"].forEach((k) => {
      const pack = S[k];
      pack.standL = flip(pack.stand);
      pack.jumpL = flip(pack.jump);
      pack.skidL = flip(pack.skid);
      pack.walkL = pack.walk.map(flip);
      if (pack.die) pack.dieL = flip(pack.die);
    });

    S.walker = [compile(walkerA, mapK), compile(walkerB, mapK)];
    S.walkerFlat = compile(walkerFlat, mapK);
    S.turtle = [compile(turtleA, mapK), compile(turtleB, mapK)];
    S.turtleL = S.turtle.map(flip);
    S.shell = compile(shell, mapK);
    S.plant = [compile(plantA, mapK), compile(plantB, mapK)];
    S.mush = compile(mush, mapK);
    S.oneup = compile(oneup, mapK);
    S.flower = [compile(flowerA, mapK), compile(flowerB, mapK)];
    S.star = compile(starA, mapK);
    S.coin = [compile(coinA, mapK), compile(coinB, mapK), compile(coinC, mapK), compile(coinB, mapK)];
    S.fireball = [compile(fireA, mapK), compile(fireB, mapK)];
    S.ground = tileGround();
    S.brick = tileBrick();
    S.q0 = tileQuestion(0);
    S.q1 = tileQuestion(1);
    S.used = tileUsed();
    S.hard = tileHard();
    S.pipeTL = tilePipeTop("L");
    S.pipeTR = tilePipeTop("R");
    S.pipeBL = tilePipeBody("L");
    S.pipeBR = tilePipeBody("R");
    S.cloud1 = makeCloud(1);
    S.cloud2 = makeCloud(2);
    S.bush1 = makeBush(1);
    S.bush2 = makeBush(2);
    S.bush3 = makeBush(3);
    S.hill1 = makeHill(1);
    S.hill2 = makeHill(2);
    S.castle = makeCastle();
    S.flag = makeFlag();
    S.pole = makePole();
    S.font = FONT5;
    S.brickBit = compile([
      "yyyy",
      "NhhN",
      "hNNh",
      "kkkk"
    ]);
    return S;
  }

  CAP.buildSprites = build;
  CAP.compileSprite = compile;
})(window.CAP = window.CAP || {});
