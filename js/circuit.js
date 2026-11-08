/* ============================================================
   回路パズル（旧 index.html の回路エディタを、1ページに複数置ける部品に作り直したもの）
   使い方:
     CircuitPuzzle.mount(document.getElementById("pz-not"), {
       id: "s2-not",                 // 達成記録のID
       inputs: ["A"], outputs: ["OUT"],
       gates: ["NOT"],               // パレットに出すゲート
       truth: function (A) { return [A ? 0 : 1]; },
       solution: function (k) { var g = k.add("NOT", 0.45, 0.3); k.wire(k.inp[0], g); k.wire(g, k.out[0]); }
     });
   - 入力の箱をタップすると 0/1 が切り替わり、電気が来ている線（1）が明るく光る
   - 「検証する」で全パターンの真理値表を作って判定。合格すると QUEST.taskDone を呼ぶ
   ============================================================ */
(function (global) {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var VW = 720; // 座標系の横幅（viewBox）。画面幅に合わせて縮む

  var GATE_INFO = {
    NOT: { ins: 1, outs: 1, label: "NOT" },
    AND: { ins: 2, outs: 1, label: "AND" },
    OR: { ins: 2, outs: 1, label: "OR" },
    XOR: { ins: 2, outs: 1, label: "XOR" },
    NAND: { ins: 2, outs: 1, label: "NAND" },
    HA: { ins: 2, outs: 2, label: "半加算器" }
  };

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(e);
    return e;
  }

  function Puzzle(root, def) {
    this.root = root;
    this.def = def;
    this.nodes = [];
    this.pins = [];
    this.wires = [];
    this.uid = 1;
    this.wireStart = null;
    this.tempEnd = null;
    this.drag = null;
    this.inputVals = {};
    var nIn = def.inputs.length;
    var nOut = def.outputs.length;
    this.VH = def.height || Math.max(240, Math.max(nIn, nOut) * 72 + 60);
    this.build();
    this.reset();
    if (global.QUEST && global.QUEST.isTaskDone(def.id)) this.setSolved(true);
  }

  Puzzle.prototype.build = function () {
    var self = this;
    var def = this.def;
    var r = this.root;
    r.classList.add("cp");
    r.setAttribute("data-task", def.id);
    r.innerHTML =
      '<div class="cp-head"><span class="cp-badge">回路の課題</span><span class="cp-title"></span></div>' +
      '<p class="cp-desc"></p>' +
      '<div class="cp-palette" role="toolbar" aria-label="置けるゲート"></div>' +
      '<div class="cp-canvas"></div>' +
      '<div class="cp-tools">' +
      '<button type="button" class="btn btn-primary cp-run">▶ 検証する</button>' +
      '<button type="button" class="btn cp-clear">配線を消す</button>' +
      '<button type="button" class="btn cp-answer">解答例を見る</button>' +
      '<button type="button" class="btn cp-full" aria-pressed="false">⤢ 大きく表示</button>' +
      '<span class="cp-status" aria-live="polite"></span>' +
      "</div>" +
      '<div class="cp-table"></div>' +
      '<details class="cp-help"><summary>🎮 操作方法</summary><ul>' +
      "<li>上のボタンでゲートを置く。箱はドラッグで動かせる</li>" +
      "<li>出力の丸（右側）→ 入力の丸（左側）の順にタップすると線がつながる。線をタップすると消える</li>" +
      "<li>左の入力の箱をタップすると 0 と 1 が切り替わる。1 が流れている線は明るく光る</li>" +
      "<li>ゲート右上の ✕ で取り除く</li></ul></details>";
    r.querySelector(".cp-title").textContent = def.title || "";
    r.querySelector(".cp-desc").innerHTML = def.desc || "";
    var pal = r.querySelector(".cp-palette");
    (def.gates || []).forEach(function (g) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "cp-gate";
      b.textContent = "＋ " + GATE_INFO[g].label;
      b.addEventListener("click", function () {
        var n = self.nodes.filter(function (x) { return x.type !== "INPUT" && x.type !== "OUTPUT"; }).length;
        self.addNode(g, 0.32 + (n % 3) * 0.13, 0.12 + ((n * 0.27) % 0.7));
        self.render();
      });
      pal.appendChild(b);
    });
    this.svg = el("svg", { viewBox: "0 0 " + VW + " " + this.VH, role: "img", "aria-label": "回路の作業台" }, r.querySelector(".cp-canvas"));
    r.querySelector(".cp-run").addEventListener("click", function () { self.verify(); });
    r.querySelector(".cp-clear").addEventListener("click", function () { self.reset(); });
    r.querySelector(".cp-answer").addEventListener("click", function () { self.showSolution(); });
    var fullBtn = r.querySelector(".cp-full");
    fullBtn.addEventListener("click", function () {
      var on = !r.classList.contains("full");
      r.classList.toggle("full", on);
      document.documentElement.classList.toggle("cp-lock", on);
      fullBtn.textContent = on ? "✕ 元の大きさに戻す" : "⤢ 大きく表示";
      fullBtn.setAttribute("aria-pressed", on ? "true" : "false");
      if (!on) r.scrollIntoView({ block: "start" });
    });
    this.bindPointer();
  };

  Puzzle.prototype.reset = function () {
    var self = this;
    this.nodes = []; this.pins = []; this.wires = [];
    this.wireStart = null; this.tempEnd = null;
    var def = this.def;
    var nIn = def.inputs.length, nOut = def.outputs.length;
    def.inputs.forEach(function (name, i) {
      self.addNode("INPUT", 0.02, (i + 0.5) / nIn, { label: name });
      if (!(name in self.inputVals)) self.inputVals[name] = 0;
    });
    def.outputs.forEach(function (name, i) {
      self.addNode("OUTPUT", 0.89, (i + 0.5) / nOut, { label: name });
    });
    this.root.querySelector(".cp-table").innerHTML = "";
    this.setStatus("");
    this.render();
  };

  // x, y は 0〜1 の割合（左上が0）。y は箱の中心
  Puzzle.prototype.addNode = function (type, fx, fy, opts) {
    opts = opts || {};
    var id = this.uid++;
    var info = GATE_INFO[type];
    var ins = type === "INPUT" ? 0 : type === "OUTPUT" ? 1 : info.ins;
    var outs = type === "OUTPUT" ? 0 : type === "INPUT" ? 1 : info.outs;
    var node = { id: id, type: type, label: opts.label || (info ? info.label : type), inPins: [], outPins: [] };
    for (var i = 0; i < ins; i++) { var p = { id: this.uid++, nodeId: id, kind: "in", index: i }; this.pins.push(p); node.inPins.push(p.id); }
    for (var j = 0; j < outs; j++) { var q = { id: this.uid++, nodeId: id, kind: "out", index: j }; this.pins.push(q); node.outPins.push(q.id); }
    node.w = (type === "INPUT" || type === "OUTPUT") ? 64 : (type === "HA" ? 92 : 76);
    node.h = (type === "INPUT" || type === "OUTPUT") ? 40 : Math.max(44, Math.max(ins, outs) * 24);
    node.x = fx * VW;
    node.y = fy * this.VH - node.h / 2;
    if (type !== "INPUT" && type !== "OUTPUT") node.y = Math.max(4, Math.min(this.VH - node.h - 4, node.y));
    this.nodes.push(node);
    return node;
  };

  Puzzle.prototype.getNode = function (id) { return this.nodes.find(function (n) { return n.id === id; }); };
  Puzzle.prototype.getPin = function (id) { return this.pins.find(function (p) { return p.id === id; }); };

  Puzzle.prototype.pinPos = function (pin) {
    var n = this.getNode(pin.nodeId);
    var list = pin.kind === "in" ? n.inPins : n.outPins;
    var gap = 24;
    var y = n.y + n.h / 2 - ((list.length - 1) * gap) / 2 + pin.index * gap;
    return { x: pin.kind === "in" ? n.x : n.x + n.w, y: y };
  };

  // 入力の値 vals（名前→0/1）で回路を計算。返り値: { outputs: {名前: 値}, pinVal: {出力ピンID: 値} }
  Puzzle.prototype.evaluate = function (vals) {
    var self = this;
    var memo = {};
    var visiting = {};
    function outOf(node) {
      if (memo[node.id]) return memo[node.id];
      if (visiting[node.id]) return null; // 輪になっている配線
      visiting[node.id] = true;
      var ins = node.inPins.map(function (pid) {
        var w = self.wires.find(function (x) { return x.toPin === pid; });
        if (!w) return undefined;
        var fp = self.getPin(w.fromPin);
        var r = outOf(self.getNode(fp.nodeId));
        return r ? r[fp.index] : undefined;
      });
      var bad = ins.some(function (v) { return v === undefined; });
      var a = ins[0], b = ins[1], res;
      if (node.type === "INPUT") res = [vals[node.label] ? 1 : 0];
      else if (bad) res = node.type === "HA" ? [undefined, undefined] : [undefined];
      else if (node.type === "NOT") res = [a ? 0 : 1];
      else if (node.type === "AND") res = [a && b ? 1 : 0];
      else if (node.type === "OR") res = [a || b ? 1 : 0];
      else if (node.type === "XOR") res = [a !== b ? 1 : 0];
      else if (node.type === "NAND") res = [a && b ? 0 : 1];
      else if (node.type === "HA") res = [a !== b ? 1 : 0, a && b ? 1 : 0];
      else if (node.type === "OUTPUT") res = [a];
      visiting[node.id] = false;
      memo[node.id] = res;
      return res;
    }
    var outputs = {};
    var pinVal = {};
    this.nodes.forEach(function (n) {
      var r = outOf(n);
      if (n.type === "OUTPUT") outputs[n.label] = r ? r[0] : undefined;
      n.outPins.forEach(function (pid, i) { pinVal[pid] = r ? r[i] : undefined; });
      n._in = n.type === "OUTPUT" ? (r ? r[0] : undefined) : undefined;
    });
    return { outputs: outputs, pinVal: pinVal };
  };

  Puzzle.prototype.render = function () {
    var self = this;
    var svg = this.svg;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var live = this.evaluate(this.inputVals);
    el("rect", { x: 0, y: 0, width: VW, height: this.VH, class: "cp-bg" }, svg);
    this.wires.forEach(function (w) {
      var p1 = self.pinPos(self.getPin(w.fromPin)), p2 = self.pinPos(self.getPin(w.toPin));
      var mx = (p1.x + p2.x) / 2;
      var on = live.pinVal[w.fromPin] === 1;
      var path = el("path", {
        d: "M " + p1.x + " " + p1.y + " C " + mx + " " + p1.y + ", " + mx + " " + p2.y + ", " + p2.x + " " + p2.y,
        class: "cp-wire" + (on ? " on" : "")
      }, svg);
      path.addEventListener("click", function (e) {
        e.stopPropagation();
        self.wires = self.wires.filter(function (x) { return x.id !== w.id; });
        self.render();
      });
    });
    if (this.wireStart && this.tempEnd) {
      var s = this.pinPos(this.getPin(this.wireStart));
      el("path", { d: "M " + s.x + " " + s.y + " L " + this.tempEnd.x + " " + this.tempEnd.y, class: "cp-wire-temp" }, svg);
    }
    this.nodes.forEach(function (n) {
      var g = el("g", { transform: "translate(" + n.x + "," + n.y + ")", class: "cp-node cp-" + n.type.toLowerCase(), "data-node": n.id }, svg);
      var v = n.type === "INPUT" ? (self.inputVals[n.label] ? 1 : 0) : n.type === "OUTPUT" ? n._in : null;
      el("rect", { width: n.w, height: n.h, rx: 8, class: "cp-box" + (v === 1 ? " on" : "") }, g);
      var t = el("text", { x: n.w / 2, y: n.h / 2 + 5, "text-anchor": "middle", class: "cp-label" }, g);
      if (n.type === "INPUT") t.textContent = n.label + "=" + v;
      else if (n.type === "OUTPUT") t.textContent = n.label + "=" + (v === undefined ? "?" : v);
      else t.textContent = n.label;
      if (n.type !== "INPUT" && n.type !== "OUTPUT") {
        var del = el("text", { x: n.w - 5, y: 13, "text-anchor": "end", class: "cp-del" }, g);
        del.textContent = "✕";
        del.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
        del.addEventListener("click", function (e) { e.stopPropagation(); self.deleteNode(n.id); });
      }
      n.inPins.concat(n.outPins).forEach(function (pid) {
        var pin = self.getPin(pid);
        var pos = self.pinPos(pin);
        el("circle", { cx: pos.x, cy: pos.y, r: 18, fill: "transparent", "data-pin": pid }, svg);
        var sel = self.wireStart === pid;
        el("circle", { cx: pos.x, cy: pos.y, r: 9, "data-pin": pid, class: "cp-pin " + pin.kind + (sel ? " sel" : "") }, svg);
        if (n.type === "HA" && pin.kind === "out") {
          var lt = el("text", { x: pos.x - 16, y: pos.y + 4, "text-anchor": "middle", class: "cp-pinlabel" }, svg);
          lt.textContent = pin.index === 0 ? "S" : "C";
        }
      });
    });
  };

  Puzzle.prototype.deleteNode = function (id) {
    var n = this.getNode(id);
    var ids = n.inPins.concat(n.outPins);
    this.wires = this.wires.filter(function (w) { return ids.indexOf(w.fromPin) === -1 && ids.indexOf(w.toPin) === -1; });
    this.pins = this.pins.filter(function (p) { return p.nodeId !== id; });
    this.nodes = this.nodes.filter(function (x) { return x.id !== id; });
    this.render();
  };

  Puzzle.prototype.connect = function (a, b) {
    var pa = this.getPin(a), pb = this.getPin(b);
    if (!pa || !pb) return;
    if (pa.kind === "in" && pb.kind === "out") { var t = pa; pa = pb; pb = t; }
    if (pa.kind !== "out" || pb.kind !== "in" || pa.nodeId === pb.nodeId) return;
    this.wires = this.wires.filter(function (w) { return w.toPin !== pb.id; });
    this.wires.push({ id: this.uid++, fromPin: pa.id, toPin: pb.id });
  };

  Puzzle.prototype.toSvg = function (e) {
    var pt = this.svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    var m = this.svg.getScreenCTM();
    var p = m ? pt.matrixTransform(m.inverse()) : pt;
    return { x: p.x, y: p.y };
  };

  function findUp(target, attr, stop) {
    var t = target;
    while (t && t !== stop) {
      if (t.getAttribute && t.getAttribute(attr) !== null) return t;
      t = t.parentNode;
    }
    return null;
  }

  Puzzle.prototype.bindPointer = function () {
    var self = this;
    var svg = this.svg;
    svg.addEventListener("pointerdown", function (e) {
      var pinEl = findUp(e.target, "data-pin", svg);
      var nodeEl = findUp(e.target, "data-node", svg);
      if (pinEl) {
        e.preventDefault();
        var pid = Number(pinEl.getAttribute("data-pin"));
        var pin = self.getPin(pid);
        if (!self.wireStart) {
          if (pin.kind === "out") self.wireStart = pid;
          else {
            var ex = self.wires.find(function (w) { return w.toPin === pid; });
            if (ex) { self.wires = self.wires.filter(function (w) { return w !== ex; }); self.wireStart = ex.fromPin; }
          }
        } else {
          if (self.wireStart !== pid) self.connect(self.wireStart, pid);
          self.wireStart = null; self.tempEnd = null;
        }
        self.render();
      } else if (nodeEl) {
        e.preventDefault();
        var n = self.getNode(Number(nodeEl.getAttribute("data-node")));
        var p = self.toSvg(e);
        self.drag = { node: n, dx: p.x - n.x, dy: p.y - n.y, sx: p.x, sy: p.y, moved: false };
        try { svg.setPointerCapture(e.pointerId); } catch (err) { /* 古いブラウザ */ }
      } else if (self.wireStart) {
        self.wireStart = null; self.tempEnd = null; self.render();
      }
    });
    var pending = false;
    svg.addEventListener("pointermove", function (e) {
      if (!self.drag && !self.wireStart) return;
      var p = self.toSvg(e);
      if (self.drag) {
        if (Math.abs(p.x - self.drag.sx) + Math.abs(p.y - self.drag.sy) > 6) self.drag.moved = true;
        if (!self.drag.moved) return;
        e.preventDefault();
        self.drag.node.x = Math.max(0, Math.min(VW - self.drag.node.w, p.x - self.drag.dx));
        self.drag.node.y = Math.max(0, Math.min(self.VH - self.drag.node.h, p.y - self.drag.dy));
      } else {
        self.tempEnd = p;
      }
      if (!pending) {
        pending = true;
        requestAnimationFrame(function () { pending = false; self.render(); });
      }
    });
    svg.addEventListener("pointerup", function (e) {
      if (self.drag) {
        var d = self.drag;
        self.drag = null;
        if (!d.moved && d.node.type === "INPUT") {
          self.inputVals[d.node.label] = self.inputVals[d.node.label] ? 0 : 1;
        }
        self.render();
        return;
      }
      if (self.wireStart) {
        var hit = document.elementFromPoint(e.clientX, e.clientY);
        var pinEl = hit ? findUp(hit, "data-pin", svg) : null;
        if (pinEl && Number(pinEl.getAttribute("data-pin")) !== self.wireStart) {
          self.connect(self.wireStart, Number(pinEl.getAttribute("data-pin")));
          self.wireStart = null; self.tempEnd = null;
          self.render();
        }
      }
    });
    svg.addEventListener("pointercancel", function () { self.drag = null; });
  };

  Puzzle.prototype.setStatus = function (txt, kind) {
    var s = this.root.querySelector(".cp-status");
    s.textContent = txt;
    s.className = "cp-status" + (kind ? " " + kind : "");
  };

  Puzzle.prototype.verify = function () {
    var self = this;
    var def = this.def;
    var n = def.inputs.length;
    var rows = [];
    var all = true;
    for (var mask = 0; mask < (1 << n); mask++) {
      var vals = {};
      var inVals = def.inputs.map(function (name, i) {
        var v = (mask >> (n - 1 - i)) & 1; // 左の入力が上の桁（2進数の並びと同じ順）
        vals[name] = v;
        return v;
      });
      var expected = def.truth.apply(null, inVals);
      var res = this.evaluate(vals).outputs;
      var actual = def.outputs.map(function (o) { return res[o]; });
      var ok = actual.every(function (v, i) { return v === expected[i]; });
      if (!ok) all = false;
      rows.push({ inVals: inVals, expected: expected, actual: actual, ok: ok });
    }
    var h = '<table class="cp-tt"><caption>' + (all ? "✓ 全部の入力の組み合わせで一致" : "✗ 一致しない行がある（赤い行）") + "</caption><tr>";
    def.inputs.forEach(function (x) { h += "<th>" + x + "</th>"; });
    def.outputs.forEach(function (x) { h += '<th class="r">' + x + "<small>（回路）</small></th>"; });
    def.outputs.forEach(function (x) { h += '<th class="e">' + x + "<small>（目標）</small></th>"; });
    h += "</tr>";
    rows.forEach(function (r) {
      h += '<tr class="' + (r.ok ? "ok" : "ng") + '">';
      r.inVals.forEach(function (v) { h += "<td>" + v + "</td>"; });
      r.actual.forEach(function (v) { h += '<td class="r">' + (v === undefined ? "−" : v) + "</td>"; });
      r.expected.forEach(function (v) { h += '<td class="e">' + v + "</td>"; });
      h += "</tr>";
    });
    h += "</table>";
    this.root.querySelector(".cp-table").innerHTML = h;
    if (all) {
      this.setSolved(false);
      this.setStatus("✓ 合格！", "ok");
    } else {
      var missing = rows.some(function (r) { return r.actual.some(function (v) { return v === undefined; }); });
      this.setStatus(missing ? "つながっていない線があります（−の欄）" : "✗ まだ一致しない行があります", "ng");
    }
  };

  Puzzle.prototype.setSolved = function (silent) {
    this.root.classList.add("solved");
    var badge = this.root.querySelector(".cp-badge");
    badge.textContent = "✓ 達成";
    if (global.QUEST) global.QUEST.taskDone(this.root, this.def.id);
    else this.root.setAttribute("data-solved", "true");
    if (silent) this.setStatus("この課題は達成済み", "ok");
  };

  Puzzle.prototype.showSolution = function () {
    var self = this;
    if (!this.def.solution) return;
    this.reset();
    var kit = {
      inp: this.nodes.filter(function (n) { return n.type === "INPUT"; }),
      out: this.nodes.filter(function (n) { return n.type === "OUTPUT"; }),
      add: function (type, fx, fy) { return self.addNode(type, fx, fy); },
      wire: function (from, to, toIdx, fromIdx) {
        self.wires.push({ id: self.uid++, fromPin: from.outPins[fromIdx || 0], toPin: to.inPins[toIdx || 0] });
      }
    };
    this.def.solution(kit);
    this.render();
    this.setStatus("解答例を表示中（検証すると合格になります）");
  };

  global.CircuitPuzzle = {
    mount: function (root, def) { return new Puzzle(root, def); }
  };
})(window);
