/* ============================================================
   実験ウィジェット（論理回路CPUクエスト）
   <div class="lab" data-lab="種類" data-id="課題ID" ...> を見つけて組み立てる。
   data-id があるものは、目標を達成すると QUEST.taskDone で課題達成になる。
   ============================================================ */
(function (global) {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";

  function h(html) {
    var d = document.createElement("div");
    d.innerHTML = html;
    return d;
  }
  function done(root) {
    root.classList.add("solved");
    var b = root.querySelector(".lab-badge");
    if (b) b.textContent = "✓ 達成";
    var id = root.getAttribute("data-id");
    if (id && global.QUEST) global.QUEST.taskDone(root, id);
  }
  function wasDone(root) {
    var id = root.getAttribute("data-id");
    return !!(id && global.QUEST && global.QUEST.isTaskDone(id));
  }
  function head(badge, title) {
    return '<div class="lab-head"><span class="lab-badge">' + badge + '</span><span class="lab-title">' + title + "</span></div>";
  }

  /* ---------- 2進数のランプ ---------- */
  function binary(root) {
    var nb = parseInt(root.getAttribute("data-bits") || "4", 10);
    var targets = (root.getAttribute("data-targets") || "").split(",").filter(Boolean).map(Number);
    var bits = [];
    for (var i = 0; i < nb; i++) bits.push(0);
    var got = [];
    var already = wasDone(root);
    if (root.getAttribute("data-id")) root.setAttribute("data-task", root.getAttribute("data-id"));
    root.innerHTML = head("実験", "スイッチ" + nb + "個で数を作る") +
      '<div class="bits"></div><p class="readout"></p>' +
      (targets.length ? '<p style="text-align:center">作る数：</p><div class="target-list"></div>' : "") +
      '<p class="lab-status" aria-live="polite"></p>';
    var bw = root.querySelector(".bits");
    for (var k = 0; k < nb; k++) {
      (function (k) {
        var weight = Math.pow(2, nb - 1 - k);
        var d = document.createElement("div");
        d.className = "bit";
        d.innerHTML = '<button type="button" aria-pressed="false">0</button><small>重み ' + weight + "</small>";
        d.querySelector("button").addEventListener("click", function () {
          bits[k] = bits[k] ? 0 : 1;
          update();
        });
        bw.appendChild(d);
      })(k);
    }
    function value() {
      return bits.reduce(function (s, b) { return s * 2 + b; }, 0);
    }
    function update() {
      var btns = bw.querySelectorAll("button");
      bits.forEach(function (b, i) {
        btns[i].textContent = b;
        btns[i].classList.toggle("on", !!b);
        btns[i].setAttribute("aria-pressed", b ? "true" : "false");
      });
      var v = value();
      var terms = [];
      bits.forEach(function (b, i) { if (b) terms.push(Math.pow(2, nb - 1 - i)); });
      root.querySelector(".readout").innerHTML =
        "2進数 <b>" + bits.join("") + "</b> ＝ " + (terms.length ? terms.join("＋") : "0") + " ＝ 10進数 <b>" + v + "</b>" +
        "　／　16進数 <b>" + v.toString(16).toUpperCase() + "</b>";
      if (targets.length) {
        var now = targets.filter(function (t) { return got.indexOf(t) === -1; })[0];
        if (now !== undefined && v === now) got.push(now);
        var tl = root.querySelector(".target-list");
        tl.innerHTML = "";
        var next = targets.filter(function (t) { return got.indexOf(t) === -1; })[0];
        targets.forEach(function (t) {
          var c = document.createElement("span");
          c.className = "target-chip" + (got.indexOf(t) !== -1 || already ? " done" : t === next ? " now" : "");
          c.textContent = (got.indexOf(t) !== -1 || already ? "✓ " : "") + t;
          tl.appendChild(c);
        });
        var st = root.querySelector(".lab-status");
        if (next === undefined || already) {
          st.textContent = "全部できた！";
          st.className = "lab-status ok";
          if (!root.classList.contains("solved")) done(root);
        } else {
          st.textContent = "いまの目標：" + next + "（重みの大きいほうから、引けるだけ引いてみよう）";
          st.className = "lab-status";
        }
      }
    }
    update();
  }

  /* ---------- CMOS の NOT（トランジスタ2個） ---------- */
  function cmos(root) {
    var A = 0;
    root.innerHTML = head("実験", "トランジスタ2個で作る NOT") +
      '<div class="row"><button type="button" class="btn btn-primary lab-toggle">入力 A を切り替える</button></div>' +
      '<svg viewBox="0 0 420 300" width="420" role="img" aria-label="CMOSのNOT回路">' +
      '<text x="210" y="18" text-anchor="middle" font-size="13" font-weight="900" fill="#b0451c">電源（1）</text>' +
      '<line x1="210" y1="24" x2="210" y2="50" class="w-top" stroke-width="5"/>' +
      '<rect x="160" y="50" width="100" height="56" rx="8" class="t-p" stroke-width="2"/>' +
      '<text x="210" y="74" text-anchor="middle" font-size="13" font-weight="900">pMOS</text>' +
      '<text x="210" y="94" text-anchor="middle" font-size="11" class="t-p-st"></text>' +
      '<line x1="210" y1="106" x2="210" y2="150" class="w-mid1" stroke-width="5"/>' +
      '<circle cx="210" cy="150" r="6" fill="#555"/>' +
      '<line x1="210" y1="150" x2="330" y2="150" class="w-out" stroke-width="5"/>' +
      '<circle cx="350" cy="150" r="20" class="lamp" stroke-width="3"/>' +
      '<text x="350" y="190" text-anchor="middle" font-size="14" font-weight="900" class="out-t"></text>' +
      '<line x1="210" y1="150" x2="210" y2="194" class="w-mid2" stroke-width="5"/>' +
      '<rect x="160" y="194" width="100" height="56" rx="8" class="t-n" stroke-width="2"/>' +
      '<text x="210" y="218" text-anchor="middle" font-size="13" font-weight="900">nMOS</text>' +
      '<text x="210" y="238" text-anchor="middle" font-size="11" class="t-n-st"></text>' +
      '<line x1="210" y1="250" x2="210" y2="276" class="w-bot" stroke-width="5"/>' +
      '<text x="210" y="294" text-anchor="middle" font-size="13" font-weight="900" fill="#31606b">地面（0）</text>' +
      '<line x1="40" y1="150" x2="120" y2="150" stroke="#888" stroke-width="3"/>' +
      '<line x1="120" y1="78" x2="120" y2="222" stroke="#888" stroke-width="3"/>' +
      '<line x1="120" y1="78" x2="160" y2="78" stroke="#888" stroke-width="3"/>' +
      '<line x1="120" y1="222" x2="160" y2="222" stroke="#888" stroke-width="3"/>' +
      '<text x="40" y="140" font-size="14" font-weight="900" class="a-t"></text>' +
      "</svg>" +
      '<p class="lab-status" aria-live="polite"></p>';
    var svg = root.querySelector("svg");
    function q(sel) { return svg.querySelector(sel); }
    function update() {
      var pOn = A === 0, nOn = A === 1, out = A ? 0 : 1;
      q(".t-p").setAttribute("fill", pOn ? "#ffe9a8" : "#e2e6e8");
      q(".t-p").setAttribute("stroke", pOn ? "#d99a12" : "#8a9599");
      q(".t-n").setAttribute("fill", nOn ? "#ffe9a8" : "#e2e6e8");
      q(".t-n").setAttribute("stroke", nOn ? "#d99a12" : "#8a9599");
      q(".t-p-st").textContent = pOn ? "通す（ON）" : "通さない（OFF）";
      q(".t-n-st").textContent = nOn ? "通す（ON）" : "通さない（OFF）";
      var hi = "#f0a91e", lo = "#4f7d86", off = "#c3c9cc";
      q(".w-top").setAttribute("stroke", pOn ? hi : off);
      q(".w-mid1").setAttribute("stroke", pOn ? hi : off);
      q(".w-mid2").setAttribute("stroke", nOn ? lo : off);
      q(".w-bot").setAttribute("stroke", nOn ? lo : off);
      q(".w-out").setAttribute("stroke", out ? hi : lo);
      q(".lamp").setAttribute("fill", out ? "#ffd54f" : "#3a4446");
      q(".lamp").setAttribute("stroke", out ? "#d99a12" : "#6b7779");
      q(".out-t").textContent = "OUT＝" + out;
      q(".a-t").textContent = "A＝" + A;
      q(".a-t").setAttribute("fill", A ? "#d9822b" : "#4f7d86");
      root.querySelector(".lab-status").textContent = A === 0
        ? "A＝0：上の pMOS が通し、下の nMOS は通さない。OUT は電源とつながって 1。"
        : "A＝1：下の nMOS が通し、上の pMOS は通さない。OUT は地面とつながって 0。";
    }
    root.querySelector(".lab-toggle").addEventListener("click", function () { A = A ? 0 : 1; update(); });
    update();
  }

  /* ---------- MOSFET の断面（ゲート電極に電圧→電子が集まって通り道） ---------- */
  function mosfet(root) {
    var V = 0;
    root.innerHTML = head("実験", "nMOS トランジスタの断面") +
      '<div class="row"><button type="button" class="btn btn-primary lab-toggle">ゲート電極の電圧を切り替える</button></div>' +
      '<svg viewBox="0 0 420 200" width="420" role="img" aria-label="MOSトランジスタの断面">' +
      '<rect x="150" y="30" width="120" height="22" rx="3" class="g-el" stroke="#555"/>' +
      '<text x="210" y="46" text-anchor="middle" font-size="12" font-weight="900" class="g-t"></text>' +
      '<rect x="140" y="52" width="140" height="10" fill="#cfe6f5" stroke="#8fb4cc"/>' +
      '<text x="288" y="61" font-size="11" fill="#4d7a96">← うすい絶縁膜</text>' +
      '<rect x="30" y="62" width="360" height="130" fill="#d9d4ea" stroke="#9a92b8"/>' +
      '<text x="210" y="182" text-anchor="middle" font-size="12" fill="#5b5480">シリコン（ふだんは電気を通しにくい）</text>' +
      '<rect x="40" y="62" width="100" height="50" rx="6" fill="#b8d9b2" stroke="#6d9a66"/>' +
      '<text x="90" y="92" text-anchor="middle" font-size="12" font-weight="900">ソース</text>' +
      '<rect x="280" y="62" width="100" height="50" rx="6" fill="#b8d9b2" stroke="#6d9a66"/>' +
      '<text x="330" y="92" text-anchor="middle" font-size="12" font-weight="900">ドレイン</text>' +
      '<g class="electrons"></g>' +
      "</svg>" +
      '<p class="lab-status st" aria-live="polite"></p>';
    var svg = root.querySelector("svg");
    var g = svg.querySelector(".electrons");
    var spread = [[160, 150], [185, 128], [205, 160], [228, 138], [252, 156], [175, 168], [240, 120]];
    var line = [[150, 70], [168, 70], [186, 70], [204, 70], [222, 70], [240, 70], [258, 70]];
    spread.forEach(function () {
      var c = document.createElementNS(NS, "circle");
      c.setAttribute("r", "6");
      c.setAttribute("fill", "#2f6f8f");
      g.appendChild(c);
      var t = document.createElementNS(NS, "text");
      t.setAttribute("font-size", "10"); t.setAttribute("fill", "#fff"); t.setAttribute("text-anchor", "middle");
      t.textContent = "−";
      g.appendChild(t);
    });
    function update() {
      var cs = g.querySelectorAll("circle"), ts = g.querySelectorAll("text");
      var pos = V ? line : spread;
      for (var i = 0; i < cs.length; i++) {
        cs[i].setAttribute("cx", pos[i][0]); cs[i].setAttribute("cy", pos[i][1]);
        ts[i].setAttribute("x", pos[i][0]); ts[i].setAttribute("y", pos[i][1] + 3.5);
      }
      svg.querySelector(".g-el").setAttribute("fill", V ? "#f6c35a" : "#aaa");
      svg.querySelector(".g-t").textContent = V ? "ゲート電極 ＋（1）" : "ゲート電極（0）";
      var st = root.querySelector(".st");
      st.textContent = V ? "＋に引かれた電子が絶縁膜の下に並び、ソースとドレインの間に通り道ができた（通す）"
                         : "電子はばらばら。ソースとドレインの間に通り道がない（通さない）";
      st.className = "lab-status st" + (V ? " ok" : "");
    }
    root.querySelector(".lab-toggle").addEventListener("click", function () { V = V ? 0 : 1; update(); });
    update();
  }

  /* ---------- 4ビットの輪（桁あふれと2の補数） ---------- */
  function wheel(root) {
    var v = 0;
    root.innerHTML = head("実験", "4ビットの数の輪") +
      '<div class="row"><button type="button" class="btn lab-dec">− 1</button><button type="button" class="btn btn-primary lab-inc">＋ 1</button></div>' +
      '<svg viewBox="0 0 360 300" width="360" role="img" aria-label="4ビットの16個の数を輪に並べた図"></svg>' +
      '<p class="readout"></p><p class="lab-status" aria-live="polite"></p>';
    var svg = root.querySelector("svg");
    var cx = 180, cy = 150, R = 118;
    for (var i = 0; i < 16; i++) {
      var ang = (i / 16) * Math.PI * 2 - Math.PI / 2;
      var x = cx + R * Math.cos(ang), y = cy + R * Math.sin(ang);
      var g = document.createElementNS(NS, "g");
      g.setAttribute("data-i", i);
      var c = document.createElementNS(NS, "circle");
      c.setAttribute("cx", x); c.setAttribute("cy", y); c.setAttribute("r", 19);
      g.appendChild(c);
      var t = document.createElementNS(NS, "text");
      t.setAttribute("x", x); t.setAttribute("y", y - 2); t.setAttribute("text-anchor", "middle");
      t.setAttribute("font-size", "10"); t.setAttribute("font-weight", "900");
      t.textContent = ("000" + i.toString(2)).slice(-4);
      g.appendChild(t);
      var t2 = document.createElementNS(NS, "text");
      t2.setAttribute("x", x); t2.setAttribute("y", y + 11); t2.setAttribute("text-anchor", "middle");
      t2.setAttribute("font-size", "9");
      t2.textContent = i + (i >= 8 ? "/" + (i - 16) : "");
      g.appendChild(t2);
      svg.appendChild(g);
    }
    var mid = document.createElementNS(NS, "text");
    mid.setAttribute("x", cx); mid.setAttribute("y", cy + 5); mid.setAttribute("text-anchor", "middle");
    mid.setAttribute("font-size", "12"); mid.setAttribute("fill", "#4b6460"); mid.setAttribute("font-weight", "800");
    mid.textContent = "下段：そのまま／マイナスあり";
    svg.appendChild(mid);
    function update(msg) {
      svg.querySelectorAll("g").forEach(function (g) {
        var i = +g.getAttribute("data-i");
        var c = g.querySelector("circle");
        c.setAttribute("fill", i === v ? "#ffd54f" : i >= 8 ? "#fbe9e8" : "#e9f7f4");
        c.setAttribute("stroke", i === v ? "#c48a06" : i >= 8 ? "#e79a97" : "#8fd1ab");
        c.setAttribute("stroke-width", i === v ? 3 : 1.5);
      });
      var bits = ("000" + v.toString(2)).slice(-4);
      root.querySelector(".readout").innerHTML = "4ビット <b>" + bits + "</b>　そのまま読むと <b>" + v + "</b>　／　マイナスありで読むと <b>" + (v >= 8 ? v - 16 : v) + "</b>";
      root.querySelector(".lab-status").textContent = msg || "";
    }
    root.querySelector(".lab-inc").addEventListener("click", function () {
      var m = v === 15 ? "1111＋1：5桁目の1がこぼれて 0000（桁あふれ）" : v === 7 ? "0111＋1＝1000：マイナスありの読み方では 7 の次が −8 になる" : "";
      v = (v + 1) % 16; update(m);
    });
    root.querySelector(".lab-dec").addEventListener("click", function () {
      var m = v === 0 ? "0000−1：輪を逆に回って 1111。マイナスありの読み方では −1" : v === 8 ? "1000−1＝0111：マイナスありでは −8 の前が 7 になる" : "";
      v = (v + 15) % 16; update(m);
    });
    update("");
  }

  /* ---------- ラッチ（WE＝1 で書き込み、0 で保持） ---------- */
  function latch(root) {
    var D = 0, WE = 0, Q = 0;
    root.innerHTML = head("実験", "1ビットを覚えるラッチ") +
      '<div class="row"><button type="button" class="btn lab-d"></button><button type="button" class="btn lab-we"></button></div>' +
      '<svg viewBox="0 0 420 170" width="420" role="img" aria-label="マルチプレクサの出力を入力へ戻したラッチ">' +
      '<text x="20" y="54" font-size="14" font-weight="900" class="t-d"></text>' +
      '<line x1="60" y1="50" x2="150" y2="50" stroke-width="4" class="w-d"/>' +
      '<path d="M150 30 L200 50 L200 110 L150 130 Z" fill="#ffe9a8" stroke="#d99a12" stroke-width="2"/>' +
      '<text x="172" y="84" text-anchor="middle" font-size="11" font-weight="900">選ぶ</text>' +
      '<text x="160" y="56" font-size="10" fill="#555">1</text><text x="160" y="116" font-size="10" fill="#555">0</text>' +
      '<line x1="175" y1="160" x2="175" y2="122" stroke-width="3" class="w-we"/>' +
      '<text x="185" y="160" font-size="12" font-weight="900" class="t-we"></text>' +
      '<line x1="200" y1="80" x2="300" y2="80" stroke-width="4" class="w-q"/>' +
      '<circle cx="320" cy="80" r="20" stroke-width="3" class="lamp"/>' +
      '<text x="350" y="86" font-size="15" font-weight="900" class="t-q"></text>' +
      '<path d="M270 80 V12 H110 V110 H150" fill="none" stroke-width="3.5" stroke-dasharray="7 4" class="w-fb"/>' +
      '<text x="112" y="26" font-size="11" fill="#555">出力を戻す輪（フィードバック）</text>' +
      "</svg>" +
      '<p class="lab-status" aria-live="polite"></p>';
    var svg = root.querySelector("svg");
    function col(v) { return v ? "#f0a91e" : "#8ea3a0"; }
    function update(msg) {
      if (WE) Q = D;
      root.querySelector(".lab-d").textContent = "D（書き込みたい値）＝" + D;
      root.querySelector(".lab-we").textContent = "WE（書き込み許可）＝" + WE;
      root.querySelector(".lab-we").classList.toggle("btn-primary", !!WE);
      svg.querySelector(".t-d").textContent = "D=" + D;
      svg.querySelector(".t-we").textContent = "WE=" + WE;
      svg.querySelector(".t-q").textContent = "Q=" + Q;
      svg.querySelector(".w-d").setAttribute("stroke", col(D));
      svg.querySelector(".w-we").setAttribute("stroke", WE ? "#d9822b" : "#8ea3a0");
      svg.querySelector(".w-q").setAttribute("stroke", col(Q));
      svg.querySelector(".w-fb").setAttribute("stroke", col(Q));
      svg.querySelector(".lamp").setAttribute("fill", Q ? "#ffd54f" : "#3a4446");
      svg.querySelector(".lamp").setAttribute("stroke", Q ? "#d99a12" : "#6b7779");
      root.querySelector(".lab-status").textContent = msg || (WE ? "書き込み中：Q は D に合わせて変わる" : "保持中：D を変えても Q は変わらない（輪の中で値が回り続ける）");
    }
    root.querySelector(".lab-d").addEventListener("click", function () { D = D ? 0 : 1; update(); });
    root.querySelector(".lab-we").addEventListener("click", function () { WE = WE ? 0 : 1; update(); });
    update();
  }

  /* ---------- 小さな CPU（取り出し → 解読 → 実行） ---------- */
  var PROGRAMS = {
    add: {
      name: "3＋4 を計算して番地5にしまう",
      mem: [["LOAD", 6], ["ADD", 7], ["STORE", 5], ["HALT", 0], 0, 0, 3, 4],
      goal: "番地5 に 7 が入れば完了"
    },
    loop: {
      name: "A が 0 になるまで 1 を引く（くり返し）",
      mem: [["LOAD", 6], ["SUB", 7], ["JZ", 4], ["JMP", 1], ["HALT", 0], 0, 3, 1],
      goal: "JZ で抜けて HALT に着けば完了"
    }
  };
  var OPCODE = { LOAD: "0001", ADD: "0010", SUB: "0011", STORE: "0100", JMP: "0101", JZ: "0110", HALT: "0000" };
  var DESC = {
    LOAD: "番地 n の値をレジスタ A に読み込む",
    ADD: "A に番地 n の値を足す（ALU が足し算を選ぶ）",
    SUB: "A から番地 n の値を引く（ALU が引き算を選ぶ）。答えが0ならゼロフラグ Z＝1",
    STORE: "A の値を番地 n に書き込む",
    JMP: "PC を n に書き換える（そこへ飛ぶ）",
    JZ: "ゼロフラグ Z＝1 なら PC を n に書き換える",
    HALT: "停止する"
  };
  function cpu(root) {
    var names = (root.getAttribute("data-programs") || "add").split(",");
    var finished = {};
    var already = wasDone(root);
    if (root.getAttribute("data-id")) root.setAttribute("data-task", root.getAttribute("data-id"));
    var st;
    root.innerHTML = head("実験", "小さな CPU を1段ずつ動かす") +
      '<div class="row prog-sel"></div>' +
      '<div class="row"><button type="button" class="btn btn-primary lab-step">1段階すすめる</button><button type="button" class="btn lab-run">命令を1つ最後まで</button><button type="button" class="btn lab-reset">最初から</button></div>' +
      '<div class="cpu-grid"><div class="cpu-box"><h4>CPU</h4><table class="regs"></table></div><div class="cpu-box"><h4>メモリ（番地：中身）</h4><table class="mem"></table></div></div>' +
      '<div class="cpu-log" aria-live="polite"></div><p class="lab-status"></p>';
    var sel = root.querySelector(".prog-sel");
    var cur = names[0];
    names.forEach(function (n) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "btn"; b.textContent = PROGRAMS[n].name;
      b.addEventListener("click", function () { cur = n; reset(); });
      b.setAttribute("data-p", n);
      sel.appendChild(b);
    });
    function reset() {
      st = { mem: PROGRAMS[cur].mem.map(function (x) { return Array.isArray(x) ? x.slice() : x; }), pc: 0, A: 0, Z: 0, ir: null, phase: 0, halted: false, hl: -1, wrote: -1 };
      sel.querySelectorAll("button").forEach(function (b) { b.classList.toggle("btn-primary", b.getAttribute("data-p") === cur); });
      log("プログラム「" + PROGRAMS[cur].name + "」を読み込んだ。" + PROGRAMS[cur].goal + "。");
      draw();
    }
    function log(s) { root.querySelector(".cpu-log").innerHTML = s; }
    function fmt(x) {
      return Array.isArray(x) ? x[0] + (x[0] === "HALT" ? "" : " " + x[1]) + ' <small style="color:#888">(' + OPCODE[x[0]] + " " + ("000" + x[1].toString(2)).slice(-4) + ")</small>" : "データ " + x;
    }
    function draw() {
      var ph = ["① 取り出し", "② 解読", "③ 実行"][st.phase];
      root.querySelector(".regs").innerHTML =
        "<tr><td>PC（次の命令の番地）</td><td><b>" + st.pc + "</b></td></tr>" +
        "<tr><td>命令レジスタ</td><td>" + (st.ir ? st.ir[0] + (st.ir[0] === "HALT" ? "" : " " + st.ir[1]) : "―") + "</td></tr>" +
        "<tr><td>レジスタ A</td><td><b>" + st.A + "</b></td></tr>" +
        "<tr><td>ゼロフラグ Z</td><td>" + st.Z + "</td></tr>" +
        "<tr><td>次の段階</td><td>" + (st.halted ? "停止" : ph) + "</td></tr>";
      root.querySelector(".mem").innerHTML = st.mem.map(function (x, i) {
        return '<tr class="' + (i === st.pc && !st.halted ? "pc " : "") + (i === st.hl || i === st.wrote ? "hl" : "") + '"><td>' + i + "</td><td>" + fmt(x) + "</td></tr>";
      }).join("");
    }
    function step() {
      if (st.halted) return;
      st.hl = -1; st.wrote = -1;
      if (st.phase === 0) {
        st.ir = st.mem[st.pc];
        st.hl = st.pc;
        log("① 取り出し：PC＝" + st.pc + " の番地から命令を読み出し、PC を " + (st.pc + 1) + " に進めた。");
        st.pc++;
        st.phase = 1;
      } else if (st.phase === 1) {
        log("② 解読：命令の番号 " + OPCODE[st.ir[0]] + " は「" + st.ir[0] + "」。" + DESC[st.ir[0]].replace("n", st.ir[1]) + "。");
        st.phase = 2;
      } else {
        var op = st.ir[0], n = st.ir[1], msg = "";
        if (op === "LOAD") { st.A = st.mem[n]; st.hl = n; msg = "番地" + n + " の " + st.A + " を A に読み込んだ。"; }
        else if (op === "ADD") { st.A = (st.A + st.mem[n]) & 15; st.Z = st.A === 0 ? 1 : 0; st.hl = n; msg = "A ＋ " + st.mem[n] + " ＝ " + st.A + "。"; }
        else if (op === "SUB") { st.A = (st.A - st.mem[n] + 16) & 15; st.Z = st.A === 0 ? 1 : 0; st.hl = n; msg = "A − " + st.mem[n] + " ＝ " + st.A + "。ゼロフラグ Z＝" + st.Z + "。"; }
        else if (op === "STORE") { st.mem[n] = st.A; st.wrote = n; msg = "A の " + st.A + " を番地" + n + " に書き込んだ。"; }
        else if (op === "JMP") { st.pc = n; msg = "PC を " + n + " に書き換えた。"; }
        else if (op === "JZ") { if (st.Z) { st.pc = n; msg = "Z＝1 なので PC を " + n + " に書き換えた（くり返しを抜ける）。"; } else msg = "Z＝0 なので何もしない。PC は " + st.pc + " のまま。"; }
        else if (op === "HALT") { st.halted = true; msg = "停止した。"; }
        log("③ 実行：" + msg);
        st.phase = 0;
        if (st.halted) {
          finished[cur] = true;
          var all = names.every(function (x) { return finished[x]; });
          var s = root.querySelector(".lab-status");
          if (all || already) { s.textContent = "全部のプログラムを最後まで動かした！"; s.className = "lab-status ok"; if (!root.classList.contains("solved")) done(root); }
          else { s.textContent = "このプログラムは完了。もう1つのプログラムも動かしてみよう。"; s.className = "lab-status"; }
        }
      }
      draw();
    }
    root.querySelector(".lab-step").addEventListener("click", step);
    root.querySelector(".lab-run").addEventListener("click", function () { do { step(); } while (st.phase !== 0 && !st.halted); });
    root.querySelector(".lab-reset").addEventListener("click", reset);
    reset();
    if (already) { done(root); root.querySelector(".lab-status").textContent = "この課題は達成済み"; root.querySelector(".lab-status").className = "lab-status ok"; }
  }

  var KINDS = { binary: binary, cmos: cmos, mosfet: mosfet, wheel: wheel, latch: latch, cpu: cpu };
  global.LAB_KINDS = KINDS;

  function boot() {
    document.querySelectorAll(".lab[data-lab]").forEach(function (root) {
      var f = KINDS[root.getAttribute("data-lab")];
      if (f) f(root);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window);
