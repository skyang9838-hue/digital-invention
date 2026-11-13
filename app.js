(() => {
const D = window.DATA;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ── 저장 (이 기기 브라우저에만) ──
const KEY = "digital-invention-v1";
let S = {};
try { S = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { S = {}; }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* 저장 안 돼도 화면은 돈다 */ } };
const get = (k, d) => (S[k] === undefined ? d : S[k]);
const set = (k, v) => { S[k] = v; save(); };

// 큰 글씨
try { if (localStorage.getItem("di-big") === "1") document.documentElement.classList.add("big"); } catch (e) {}
$("#bigToggle").onclick = () => {
  const on = document.documentElement.classList.toggle("big");
  try { localStorage.setItem("di-big", on ? "1" : "0"); } catch (e) {}
};

let toastT;
function toast(msg) {
  let t = $(".toast"); if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 1800);
}
async function copy(text) {
  try { await navigator.clipboard.writeText(text); }
  catch (e) { const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); }
  toast("복사했어요");
}
const vid = (url, label) => `<a class="vid" href="${url}" target="_blank" rel="noopener">${esc(label)}</a>`;
const bindInput = (root, sel, key) => $$(sel, root).forEach(el => {
  const k = el.dataset.k || key;
  el.addEventListener("input", () => set(k, el.value));
});

// ── 타이머 ──
let tick = null;
function timerHTML(sec) {
  return `<div class="timer" data-sec="${sec}"><div class="clock">${fmt(sec)}</div>
    <div class="btn-row"><button class="btn" data-t="go">시작</button><button class="btn ghost" data-t="reset">처음으로</button></div></div>`;
}
function fmt(s) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }
function mountTimer(root) {
  const box = $(".timer", root); if (!box) return;
  const total = +box.dataset.sec; let left = total, running = false;
  const clock = $(".clock", box), go = $('[data-t="go"]', box);
  const draw = () => { clock.textContent = fmt(left); box.classList.toggle("end", left === 0); };
  go.onclick = () => {
    if (running) { clearInterval(tick); running = false; go.textContent = "계속"; return; }
    if (left === 0) left = total;
    running = true; go.textContent = "멈춤";
    clearInterval(tick);
    tick = setInterval(() => { left = Math.max(0, left - 1); draw(); if (left === 0) { clearInterval(tick); running = false; go.textContent = "다시"; } }, 1000);
  };
  $('[data-t="reset"]', box).onclick = () => { clearInterval(tick); running = false; left = total; go.textContent = "시작"; draw(); };
}

// ═════════════ 활동 1. 니즈 찾기 ═════════════
const needs = {
  n: 1, proc: "문제 발견", mode: "시연", title: "니즈야! 아이디어를 찾아줘", src: D.sources.needs,
  steps: [
    { t: "니즈란?", html: () => `
      <h2>좋은 발명은 어디서 시작할까?</h2>
      <p class="big-quote">좋은 발명을 하기 위해서는<br><em>사람들이 무엇을 원하는지</em> 알아야 한다!</p>
      <div class="box"><b>니즈(needs)</b> — 사람들이 원하는 것</div>
      <h3>오늘 순서</h3>
      <p>3분 브레인스토밍 → 생성형 AI와 약속 만들기 → AI가 찾아 준 문제 상황 보기 → 프롬프트 직접 써 보기</p>
      <p class="note">원문 4쪽 · 강의안 그림과 문제 상황은 원작자가 생성형 AI(ChatGPT, 뤼튼)로 만들었다고 밝힘</p>` },
    { t: "3분 브레인스토밍", html: () => `
      <h2>3분 브레인스토밍</h2>
      <p class="lead">우리 주변에서 불편한 점, 사람들이 바라는 것을 3분 동안 떠오르는 대로 적어 보세요. 한 줄에 하나씩.</p>
      ${timerHTML(180)}
      <textarea rows="7" data-k="brain" placeholder="예: 비 오는 날 우산꽂이에서 내 우산을 못 찾는다">${esc(get("brain", ""))}</textarea>
      <p class="note" id="brainCount"></p>
      <h3>브레인스토밍을 하고 나서…</h3>
      <div class="box plain"><ol>${D.brainQuestions.map(q => `<li>${esc(q)}</li>`).join("")}</ol></div>
      <p class="note">원문 5~6쪽</p>`,
      on: r => {
        mountTimer(r); bindInput(r, "textarea");
        const ta = $("textarea", r), c = $("#brainCount", r);
        const upd = () => { const n = ta.value.split("\n").filter(x => x.trim()).length; c.textContent = n ? `${n}개 적었어요` : ""; };
        ta.addEventListener("input", upd); upd();
      } },
    { t: "AI와 약속", html: () => `
      <h2>나를 도와줄 생성형 AI, 우리가 직접 약속 만들기</h2>
      <p class="lead">카드를 눌러 하나씩 뒤집어 보세요.</p>
      <div class="flip-grid">${D.promises.map((p, i) => `
        <button class="flip"><div class="in"><div class="f"><small>약속 ${i + 1}</small>눌러서 보기</div><div class="b">${esc(p)}</div></div></button>`).join("")}
      </div>
      <label class="q">우리 반 약속 하나 더</label>
      <input type="text" data-k="promise5" value="${esc(get("promise5", ""))}" placeholder="예: AI가 준 답도 한 번 더 확인한다">
      <p class="note">원문 8쪽</p>`,
      on: r => { $$(".flip", r).forEach(f => f.onclick = () => f.classList.toggle("open")); bindInput(r, "input"); } },
    { t: "AI가 찾은 문제 상황 20", html: () => {
      const sel = get("prob", -1);
      const p = D.problems[sel];
      return `
      <h2>생성형 AI가 분석해 준 문제 상황</h2>
      <p class="lead">강의안 집필진이 생성형 AI로 만든 문제 상황 20개예요. 하나를 골라 "어떻게 해결할까?"를 생각해 보세요.</p>
      <div class="btn-row"><button class="btn" id="rand">🎲 무작위로 하나 뽑기</button></div>
      ${p ? `<div class="prob-detail">
        <span class="pill">문제 상황 ${sel + 1}</span>
        <h3>${esc(p.q)}</h3>
        <dl><dt>무엇</dt><dd>${esc(p.t)}</dd>
        <dt>누가</dt><dd>${esc(p.who)}</dd>
        <dt>불편·위험</dt><dd><ul>${p.pain.map(x => `<li>${esc(x)}</li>`).join("")}</ul></dd>
        <dt>왜 중요?</dt><dd>${esc(p.why)}</dd></dl>
        <label class="q">해결 아이디어 한 줄</label>
        <input type="text" data-k="probIdea${sel}" value="${esc(get("probIdea" + sel, ""))}" placeholder="어떻게 하면 해결할 수 있을까?">
      </div>` : ""}
      <div class="prob-list">${D.problems.map((x, i) => `<button class="prob ${i === sel ? "on" : ""}" data-i="${i}"><span class="n">${i + 1}</span>${esc(x.q)}</button>`).join("")}</div>
      <p class="note">원문 9~48쪽 (문구는 줄여 옮김)</p>`; },
      on: r => {
        $$(".prob", r).forEach(b => b.onclick = () => { set("prob", +b.dataset.i); rerender(); window.scrollTo({ top: 0, behavior: "smooth" }); });
        $("#rand", r).onclick = () => { let i; do { i = Math.floor(Math.random() * 20); } while (i === get("prob", -1)); set("prob", i); rerender(); };
        bindInput(r, "input");
      } },
    { t: "프롬프트 써 보기", html: () => {
      const topic = get("topic", 0), n = get("probN", 5);
      const on = get("parts", D.promptParts.map(() => true));
      return `
      <h2>생성형 AI에게 어떻게 물어볼까요?</h2>
      <p class="lead">프롬프트: 인공지능에게 사용자의 의도를 전달하기 위해 입력하는 '질문, 지시, 명령어'. 조건을 켜고 끄며 결과가 어떻게 달라지는지 비교해 보세요.</p>
      <label class="q">주제</label>
      <div class="seg" id="topic">${D.topics.map((t, i) => `<button class="${i === topic ? "on" : ""}" data-i="${i}">${t.k}</button>`).join("")}</div>
      <label class="q">문제 상황 개수</label>
      <div class="seg" id="probN">${[3, 5, 10].map(x => `<button class="${x === n ? "on" : ""}" data-n="${x}">${x}가지</button>`).join("")}</div>
      <label class="q">넣을 조건</label>
      ${D.promptParts.map((p, i) => `<label class="chk"><input type="checkbox" data-i="${i}" ${on[i] ? "checked" : ""}><div><b>${i + 1}. ${p.k}</b><span>${esc(fill(p.t, topic, n))}</span></div></label>`).join("")}
      <h3>완성된 프롬프트</h3>
      <div class="prompt-out" id="pout">${esc(buildPrompt(topic, n, on))}</div>
      <div class="btn-row">
        <button class="btn" id="cp">📋 복사</button>
        <a class="btn ghost" href="https://chatgpt.com/" target="_blank" rel="noopener">ChatGPT 열기</a>
        <a class="btn ghost" href="https://wrtn.ai/" target="_blank" rel="noopener">뤼튼 열기</a>
      </div>
      <div class="box">초등학생은 교사 시연이나 주변 어른과 함께 쓰는 방식으로 (원문 49쪽). 서비스마다 이용 나이 기준이 있으니 학교 지침을 확인하세요.</div>
      <p class="note">원문 부록 52~61쪽 '프롬프트 쓰는 법 1~7'을 줄여 옮김</p>`; },
      on: r => {
        $$("#topic button", r).forEach(b => b.onclick = () => { set("topic", +b.dataset.i); rerender(); });
        $$("#probN button", r).forEach(b => b.onclick = () => { set("probN", +b.dataset.n); rerender(); });
        $$(".chk input", r).forEach(c => c.onchange = () => {
          const on = get("parts", D.promptParts.map(() => true)).slice(); on[+c.dataset.i] = c.checked; set("parts", on);
          $("#pout", r).textContent = buildPrompt(get("topic", 0), get("probN", 5), on);
        });
        $("#cp", r).onclick = () => copy($("#pout", r).textContent);
      } },
    { t: "정리", html: () => `
      <h2>오늘 수업 후 알게 된 점</h2>
      <p class="big-quote">발명 아이디어는 주변에 흔히 있지만,<br>우리는 <em>그걸 알기 어려울 때</em>가 있습니다.</p>
      ${["발명 아이디어를 얻기 위해 AI를 어떻게 활용할까요?", "어떤 프롬프트가 마음에 들었나요?", "이제 AI를 어떻게 쓰면 좋을까요?"].map((q, i) => `
        <label class="q">${q}</label><textarea rows="2" data-k="needsEnd${i}">${esc(get("needsEnd" + i, ""))}</textarea>`).join("")}
      <div class="btn-row"><a class="btn" href="#bio">다음 활동: 아이디어 발상 →</a></div>
      <p class="note">원문 49·62쪽</p>`,
      on: r => bindInput(r, "textarea") }
  ]
};
function fill(t, topic, n) { const tp = D.topics[topic]; return t.replace("{topic}", `${tp.k}(예: ${tp.ex})`).replace("{n}", n); }
function buildPrompt(topic, n, on) {
  const lines = D.promptParts.map((p, i) => on[i] ? `${i + 1}. ${p.k}: ${fill(p.t, topic, n)}` : null).filter(Boolean);
  return `초등학생 발명 수업에 쓸 "문제 상황"을 만들어 주세요.\n\n${lines.join("\n")}\n\n위 조건을 지켜 ${D.topics[topic].k}에 관한 문제 상황 ${n}가지를 만들어 주세요.`;
}

// ═════════════ 활동 2. 자연은 나의 선생님 ═════════════
let M = null;   // 연결 짓기 상태
let MEM = null; // 짝 맞추기 상태
function newMatch() {
  M = { stage: 0, sel: null, done: [new Set(), new Set()], right: [shuffle([0, 1, 2, 3, 4]), shuffle([0, 1, 2, 3, 4])] };
}
function newMem() {
  const cards = [];
  D.memory.forEach((m, i) => { cards.push({ k: "o", i, label: m.o, e: m.oi }); cards.push({ k: "p", i, label: m.p, e: m.pi }); });
  MEM = { cards: shuffle(cards), open: [], got: new Set(), score: [0, 0], turn: 0, lock: false, msg: "" };
}
const bio = {
  n: 2, proc: "아이디어 발상", mode: "실습", title: "자연은 나의 선생님", src: D.sources.bio,
  steps: [
    { t: "생체 모방이란?", html: () => `
      <h2>스파이더맨은 어떻게 벽을 탈까?</h2>
      <div class="btn-row">${vid(D.links.spiderman, "스파이더맨 영상")} ${vid(D.links.sticky, "스티키 로봇 영상")}</div>
      <div class="box plain"><ul><li>거미는 어떻게 벽을 잘 탈 수 있을까요?</li><li>스티키 로봇은 어떤 능력을 가지고 있나요? 어디에 쓰면 좋을까요?</li></ul></div>
      <h3>생체 모방 기술이란?</h3>
      <div class="grid2">
        <div class="box"><b>생체(生體)</b><br>생물의 몸, 살아 있는 몸</div>
        <div class="box"><b>모방(模倣)</b><br>다른 것을 본뜨거나 본받음</div>
      </div>
      <p class="big-quote">말 그대로 <em>'자연을 본떠 하는 기술'</em></p>
      <p>동물이나 식물 같은 생물체가 가진 기능에서 아이디어를 얻어 과학 기술에 접목하는 것</p>
      <div class="btn-row">${vid(D.links.bioIntro, "생체 모방 기술 참고 영상")}</div>
      <p class="note">원문 32~33쪽</p>` },
    { t: "연결 짓기", html: () => {
      if (!M) newMatch();
      const st = M.stage, C = D.connect;
      const left = st === 0 ? C.map((c, i) => ({ i, e: c.oi, t: c.o })) : C.map((c, i) => ({ i, t: c.f }));
      const right = M.right[st].map(i => st === 0 ? { i, t: C[i].f } : { i, e: C[i].pi, t: C[i].p });
      const done = M.done[st];
      const finished = M.done[0].size === 5 && M.done[1].size === 5;
      return `
      <h2>생체 모방 기술로 만든 발명품 연결 짓기</h2>
      <p class="lead">${st === 0 ? "① 왼쪽 생물을 누르고, 그 생물의 특징을 오른쪽에서 고르세요." : "② 이번엔 특징을 누르고, 그 특징을 본뜬 발명품을 고르세요."}</p>
      <div class="seg" style="margin-bottom:12px"><button class="${st === 0 ? "on" : ""}" data-st="0">① 생물 ↔ 특징 ${M.done[0].size}/5</button><button class="${st === 1 ? "on" : ""}" data-st="1">② 특징 ↔ 발명품 ${M.done[1].size}/5</button></div>
      <div class="match">
        <div class="col">${left.map(x => `<button class="mi ${done.has(x.i) ? "ok" : ""} ${M.sel === x.i && !done.has(x.i) ? "sel" : ""}" data-side="L" data-i="${x.i}" data-tag="${C[x.i].o}">${x.e ? `<span class="e">${x.e}</span>` : ""}${esc(x.t)}</button>`).join("")}</div>
        <div class="col">${right.map(x => `<button class="mi ${done.has(x.i) ? "ok" : ""}" data-side="R" data-i="${x.i}" data-tag="✓">${x.e ? `<span class="e">${x.e}</span>` : ""}${esc(x.t)}</button>`).join("")}</div>
      </div>
      ${finished ? `<p class="confetti">🎉 다 맞혔어요! 생물 → 특징 → 발명품</p>` : ""}
      <div class="btn-row"><button class="btn ghost" id="mreset">처음부터</button></div>
      <p class="note">원문 34쪽 탐구 1-3 · 개인 또는 짝 활동</p>`; },
      on: r => {
        $$(".seg button", r).forEach(b => b.onclick = () => { M.stage = +b.dataset.st; M.sel = null; rerender(); });
        $("#mreset", r).onclick = () => { newMatch(); rerender(); };
        $$(".mi", r).forEach(b => b.onclick = () => {
          const i = +b.dataset.i, done = M.done[M.stage];
          if (done.has(i)) return;
          if (b.dataset.side === "L") { M.sel = i; rerender(); return; }
          if (M.sel === null) { toast("왼쪽부터 골라요"); return; }
          if (M.sel === i) {
            done.add(i); M.sel = null;
            if (M.stage === 0 && done.size === 5) M.stage = 1;
            rerender();
          } else { b.classList.remove("no"); void b.offsetWidth; b.classList.add("no"); }
        });
      } },
    { t: "카드 짝 맞추기", html: () => {
      if (!MEM) newMem();
      return `
      <h2>생체 모방 기술 카드 놀이</h2>
      <p class="lead">파란 카드(생물)와 흰 카드(발명품)를 한 장씩 뒤집어요. 짝이면 <b>이유를 말하고</b> 가져가요. 아니면 다시 덮고 상대 차례.</p>
      <div class="mem-head">
        <div class="score"><div data-p="0">🙋 1번 <span>0</span></div><div data-p="1">🙋 2번 <span>0</span></div></div>
        <button class="btn ghost" id="memreset">새 판</button>
      </div>
      <div class="mem">${MEM.cards.map((c, idx) => `
        <button class="mc ${c.k}" data-x="${idx}"><div class="in"><div class="f"></div><div class="b"><div><span class="e">${c.e}</span>${esc(c.label)}</div></div></div></button>`).join("")}</div>
      <div class="mem-msg" id="memmsg"></div>
      <p class="note">원문 33쪽 탐구 1-2 규칙 · 짝 8쌍은 모두 이 차시에 나온 사례</p>`; },
      on: r => {
        const msg = $("#memmsg", r);
        const paint = () => {
          $$(".mc", r).forEach(el => { const x = +el.dataset.x; el.classList.toggle("open", MEM.open.includes(x)); el.classList.toggle("got", MEM.got.has(x)); });
          $$(".score div", r).forEach(el => { const p = +el.dataset.p; el.classList.toggle("turn", MEM.turn === p); $("span", el).textContent = MEM.score[p]; });
          msg.textContent = MEM.msg;
        };
        paint();
        $("#memreset", r).onclick = () => { newMem(); rerender(); };
        $$(".mc", r).forEach(el => el.onclick = () => {
          const x = +el.dataset.x;
          if (MEM.lock || MEM.got.has(x) || MEM.open.includes(x)) return;
          const c = MEM.cards[x];
          if (MEM.open.length === 1 && MEM.cards[MEM.open[0]].k === c.k) { toast(c.k === "o" ? "이번엔 흰 카드(발명품)를 뒤집어요" : "이번엔 파란 카드(생물)를 뒤집어요"); return; }
          MEM.open.push(x); MEM.msg = ""; paint();
          if (MEM.open.length < 2) return;
          const [a, b] = MEM.open.map(i => MEM.cards[i]);
          if (a.i === b.i) {
            MEM.open.forEach(i => MEM.got.add(i)); MEM.open = []; MEM.score[MEM.turn]++;
            const m = D.memory[a.i];
            MEM.msg = MEM.got.size === 16 ? `🎉 끝! ${MEM.score[0] === MEM.score[1] ? "비겼어요" : (MEM.score[0] > MEM.score[1] ? "1번" : "2번") + " 승리"}` : `짝! ${m.o} → ${m.p}. 왜 짝인지 말해 보세요. 한 번 더!`;
            paint();
          } else {
            MEM.lock = true; MEM.msg = "짝이 아니에요. 다음 사람 차례";
            paint();
            setTimeout(() => { MEM.open = []; MEM.turn = 1 - MEM.turn; MEM.lock = false; MEM.msg = ""; paint(); }, 1100);
          }
        });
      } },
    { t: "발명품 구상", html: () => {
      const ci = get("bioC", 0), c = D.creatures[ci], f = get("bioF" + ci, 0);
      const goal = get("bioGoal" + ci, "");
      return `
      <h2>생체 모방 기술을 활용한 발명품 구상하기</h2>
      <p class="lead">생물 하나를 고르고, 특징 하나를 골라 문장을 완성해요.</p>
      <div class="pick">${D.creatures.map((x, i) => `<button class="${i === ci ? "on" : ""}" data-i="${i}"><span class="e">${x.i}</span>${x.k}</button>`).join("")}</div>
      ${c.video ? `<div class="btn-row">${vid(D.links[c.video], c.k + " 참고 영상")}</div>` : ""}
      <h3>${c.k}의 특징</h3>
      <div class="feats">${c.feats.map((t, i) => `<label class="${i + 1 === f ? "on" : ""}"><input type="radio" name="feat" value="${i + 1}" ${i + 1 === f ? "checked" : ""}> <span><b>${"①②③④⑤"[i]}</b> ${esc(t)}</span></label>`).join("")}</div>
      <h3>발명품 목적</h3>
      <p class="sentence">${c.k}의 <span class="blank">${f ? "①②③④⑤"[f - 1] : "( )"}</span>번 특성을 이용해 <input type="text" id="goal" style="display:inline-block;width:min(100%,18em)" value="${esc(goal)}" placeholder="무엇을 하는데"> 에 도움이 되도록 한다.</p>
      <label class="q">발명품 이름</label>
      <input type="text" data-k="bioName" value="${esc(get("bioName", ""))}" placeholder="예: ○○ 장갑">
      <details class="ex"><summary>교재 예시 보기</summary>
        <div class="box"><b>${esc(c.ex.name)}</b><br>${c.k}의 (${"①②③④⑤"[c.ex.n - 1]})번 특성을 이용해 (${esc(c.ex.goal)})에 도움이 되도록 한다.<br><span class="note">${esc(c.ex.desc)}</span></div>
      </details>
      <p class="note">원문 35~37쪽 탐구 2</p>`; },
      on: r => {
        $$(".pick button", r).forEach(b => b.onclick = () => { set("bioC", +b.dataset.i); rerender(); });
        const ci = get("bioC", 0);
        $$('input[name="feat"]', r).forEach(x => x.onchange = () => { set("bioF" + ci, +x.value); rerender(); });
        $("#goal", r).addEventListener("input", e => set("bioGoal" + ci, e.target.value));
        bindInput(r, 'input[data-k]');
      } },
    { t: "오토드로우 스케치", html: () => {
      const ci = get("bioC", 0), c = D.creatures[ci], f = get("bioF" + ci, 0);
      const img = get("bioImg", "");
      return `
      <h2>나는야 오토드로우 화가</h2>
      <p class="lead">오토드로우는 대충 그려도 AI가 비슷한 그림을 추천해 주는 무료 그림판이에요. 가입 없이 바로 써요.</p>
      <div class="grid3">
        <div class="box"><b>1. 열기</b><br>아래 버튼으로 새 창에서 열기 → <b>Start Drawing</b></div>
        <div class="box"><b>2. 그리기</b><br>왼쪽 <b>AutoDraw</b> 도구로 그리면 위에 추천 그림이 떠요. 누르면 바뀌어요</div>
        <div class="box"><b>3. 저장</b><br>왼쪽 위 메뉴(≡) → <b>Download</b>로 그림 파일 저장</div>
      </div>
      <div class="btn-row"><a class="btn" href="${D.links.autodraw}" target="_blank" rel="noopener">✏️ 오토드로우 열기</a>
        <label class="btn soft" style="cursor:pointer">🖼️ 저장한 그림 올리기<input type="file" accept="image/*" id="imgIn" hidden></label></div>
      <div class="card-out" id="card">
        <div class="tag">생체 모방 발명 아이디어</div>
        <h3>${esc(get("bioName", "") || "(발명품 이름)")}</h3>
        <p>${c.i} <b>${c.k}</b>의 ${f ? `${"①②③④⑤"[f - 1]}번 특성(${esc(c.feats[f - 1].split(":")[0])})` : "( )번 특성"}을 이용해 ${esc(get("bioGoal" + ci, "") || "( )")}에 도움이 되도록 한다.</p>
        ${img ? `<img src="${img}" alt="내 스케치">` : `<p class="note">그림을 올리면 여기에 붙어요.</p>`}
      </div>
      <div class="btn-row no-print"><button class="btn ghost" onclick="window.print()">🖨️ 인쇄·PDF</button></div>
      <p class="note">원문 38쪽 탐구 3</p>`; },
      on: r => {
        $("#imgIn", r).onchange = e => {
          const file = e.target.files[0]; if (!file) return;
          const fr = new FileReader();
          fr.onload = () => {
            const im = new Image();
            im.onload = () => { // 저장 용량 때문에 줄여서 보관
              const s = Math.min(1, 800 / Math.max(im.width, im.height));
              const cv = document.createElement("canvas"); cv.width = im.width * s; cv.height = im.height * s;
              const g = cv.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(im, 0, 0, cv.width, cv.height);
              set("bioImg", cv.toDataURL("image/jpeg", .85)); rerender();
            };
            im.src = fr.result;
          };
          fr.readAsDataURL(file);
        };
      } },
    { t: "친구 평가", html: () => {
      const stars = get("peerStars", [0, 0, 0]);
      return `
      <h2>자신의 아이디어 발표하기</h2>
      <p class="lead">친구의 작품을 평가할 때는 <b>단점보다 장점</b>을 찾아 칭찬해요.</p>
      <label class="q">친구 이름 / 작품</label>
      <input type="text" data-k="peerName" value="${esc(get("peerName", ""))}">
      <div style="margin-top:10px">${D.peerCriteria.map((q, i) => `
        <div class="peer-row"><span>${i + 1}. ${esc(q)}</span><span class="stars" data-q="${i}">${[1, 2, 3].map(s => `<button class="${s <= stars[i] ? "on" : ""}" data-s="${s}">★</button>`).join("")}</span></div>`).join("")}</div>
      <label class="q">아이디어의 좋은 점</label>
      <textarea rows="3" data-k="peerGood">${esc(get("peerGood", ""))}</textarea>
      <div class="btn-row"><a class="btn" href="#triz">다음 활동: 설계·개선 →</a></div>
      <p class="note">원문 39쪽 정리 활동 · 심사 기준 3개</p>`; },
      on: r => {
        $$(".stars", r).forEach(g => $$("button", g).forEach(b => b.onclick = () => {
          const st = get("peerStars", [0, 0, 0]).slice(); st[+g.dataset.q] = +b.dataset.s; set("peerStars", st); rerender();
        }));
        bindInput(r, "[data-k]");
      } }
  ]
};

// ═════════════ 활동 3. 배달 음식 포장 용기 ═════════════
const triz = {
  n: 3, proc: "설계·개선", mode: "실습", title: "배달 음식 포장 용기 디자인", src: D.sources.triz,
  steps: [
    { t: "하나만 바꿨을 뿐인데", html: () => `
      <h2>디자인, 하나만 바꿨을 뿐인데!</h2>
      <p class="lead">배달 음식을 시켰는데 개인 접시나 수저, 물이 없어 불편했던 적 있나요?</p>
      <div class="grid2">
        <div class="box"><h3 style="margin-top:0">🥚 친환경 계란판</h3>계란판에 <b>절취선</b>을 넣어 누구나 쉽게 나눠 냉장고 계란 보관함에 바로 넣을 수 있게 했어요.<div class="btn-row">${vid(D.links.egg, "대한민국학생발명전시회 수상작")}</div></div>
        <div class="box"><h3 style="margin-top:0">🎒 가방걸이 겸용 손잡이</h3>단단한 <b>ㄱ자 손잡이</b>로 바꾸니 손으로 들고, 가방걸이에 걸고, 걸이가 없는 책상에도 걸 수 있어요.<div class="btn-row">${vid(D.links.bag, "대한민국학생발명전시회 수상작")}</div></div>
      </div>
      <p class="big-quote">디자인의 변화만으로 <em>편리해질 수 있다</em></p>
      <p class="note">원문 134~136쪽 생각 열기</p>` },
    { t: "발명 원리 7가지", html: () => {
      const d = get("drawn", -1);
      return `
      <h2>창의적인 생각! 누구나 할 수 있다</h2>
      <p class="lead">트리즈(TRIZ) 40가지 발명 원리 중 7가지예요. 카드를 눌러 예시를 보고, 원리를 뽑아 내 간식에 적용해 보세요.</p>
      <div class="pr-grid">${D.principles.map(p => `
        <button class="flip"><div class="in">
          <div class="f"><span class="e">${p.i}</span>${p.k}<small>${p.q}</small></div>
          <div class="b"><div><b>예시</b> ${esc(p.ex)}<br><br><b>치킨 용기</b> ${esc(p.chicken)}</div></div>
        </div></button>`).join("")}</div>
      <h3>원리 뽑기</h3>
      <div class="btn-row"><button class="btn" id="draw">🎲 원리 하나 뽑기</button></div>
      ${d >= 0 ? `<div class="box"><div class="draw-result">${D.principles[d].i} ${D.principles[d].k} — ${D.principles[d].q}</div>
        <label class="q">내가 좋아하는 간식에 적용하면?</label>
        <input type="text" data-k="snack${d}" value="${esc(get("snack" + d, ""))}" placeholder="예: 아이스크림을 ${D.principles[d].k === "나누기" ? "한 입 크기로 나누어" : "…"}"></div>` : ""}
      <div class="box plain">창의적인 생각은 타고난 재능이 있어야만 하는 게 아니라 <b>연습과 반복</b>으로 얼마든지 할 수 있어요.</div>
      <p class="note">원문 136쪽 탐구 1-1</p>`; },
      on: r => {
        $$(".flip", r).forEach(f => f.onclick = () => f.classList.toggle("open"));
        $("#draw", r).onclick = () => { let i; do { i = Math.floor(Math.random() * 7); } while (i === get("drawn", -1)); set("drawn", i); rerender(); };
        bindInput(r, "[data-k]");
      } },
    { t: "문제점 찾기", html: () => {
      const food = get("food", ""), chk = get("qchk", {});
      return `
      <h2>배달 음식 포장 용기의 문제점과 개선점 찾기</h2>
      <p class="lead">좋아하는 배달 음식을 하나 정하고, 질문을 읽으며 특히 고치고 싶은 것에 체크하세요. 다 할 필요는 없어요.</p>
      <div class="seg" id="foods">${D.foods.map(f => `<button class="${f === food ? "on" : ""}">${f}</button>`).join("")}</div>
      <input type="text" id="foodIn" style="margin-top:8px" value="${esc(D.foods.includes(food) ? "" : food)}" placeholder="직접 쓰기">
      <div class="qcheck" style="margin-top:14px">${D.packQuestions.map((q, i) => `
        <div class="chk ${chk[i] !== undefined ? "on" : ""}" data-i="${i}">
          <input type="checkbox" ${chk[i] !== undefined ? "checked" : ""}>
          <div style="flex:1"><b>${q.k}</b><span>${esc(q.q)}</span>
          <textarea rows="2" placeholder="떠오른 문제점·아이디어 메모">${esc(chk[i] || "")}</textarea></div>
        </div>`).join("")}</div>
      <div class="btn-row">${vid(D.links.pack, "참고 영상")}</div>
      <p class="note">원문 137쪽 탐구 2-1 · 짝끼리 한 사람은 묻고 한 사람은 답해도 좋아요</p>`; },
      on: r => {
        $$("#foods button", r).forEach(b => b.onclick = () => { set("food", b.textContent); rerender(); });
        $("#foodIn", r).addEventListener("input", e => { set("food", e.target.value); $$("#foods button", r).forEach(b => b.classList.remove("on")); });
        $$(".qcheck .chk", r).forEach(row => {
          const i = row.dataset.i, cb = $("input", row), ta = $("textarea", row);
          cb.onchange = () => { const c = { ...get("qchk", {}) }; if (cb.checked) c[i] = c[i] || ""; else delete c[i]; set("qchk", c); row.classList.toggle("on", cb.checked); if (cb.checked) ta.focus(); };
          $("b", row).onclick = $("span", row).onclick = () => { cb.checked = !cb.checked; cb.onchange(); };
          ta.addEventListener("input", () => { const c = { ...get("qchk", {}) }; c[i] = ta.value; set("qchk", c); });
        });
      } },
    { t: "3단계 디자인", html: () => {
      const food = get("food", "") || "(음식)";
      const chk = get("qchk", {});
      const probs = Object.keys(chk).map(i => ({ k: D.packQuestions[i].k, m: chk[i] }));
      const ideas = get("ideas", [{ t: "", p: "", s: false }, { t: "", p: "", s: false }, { t: "", p: "", s: false }]);
      return `
      <h2>새로운 포장 용기의 디자인 구상하기</h2>
      <p class="lead">처음에는 비판하지 말고 떠오르는 아이디어를 자유롭게. 다른 음식 용기의 아이디어를 가져와도 좋아요.</p>
      <div class="grid2">
        <div><h3>1단계 · ${esc(food)}의 문제점</h3>
          ${probs.length ? `<ul>${probs.map(p => `<li><b>${esc(p.k)}</b> ${esc(p.m)}</li>`).join("")}</ul>` : `<p class="note">앞 단계에서 체크한 문제점이 여기에 모여요.</p>`}
          <textarea rows="2" data-k="probMore" placeholder="더 적기">${esc(get("probMore", ""))}</textarea></div>
        <div><h3>2단계 · 아이디어 (가장 현실적인 것에 ★)</h3>
          <div id="ideas">${ideas.map((x, i) => `
            <div class="idea-row" data-i="${i}">
              <button class="star ${x.s ? "on" : ""}" title="가장 현실적">★</button>
              <input type="text" value="${esc(x.t)}" placeholder="아이디어 ${i + 1}">
              <select class="pr-sel"><option value="">원리</option>${D.principles.map(p => `<option ${p.k === x.p ? "selected" : ""}>${p.k}</option>`).join("")}</select>
            </div>`).join("")}</div>
          <button class="btn ghost" id="addIdea">+ 아이디어 칸</button></div>
      </div>
      <details class="ex"><summary>교재 예시 보기 (피자 · 삼각김밥 · 샌드위치)</summary>
        <table class="ex-table"><tr><th>음식</th><th>문제점</th><th>아이디어</th></tr>
        ${D.packExamples.map(e => `<tr><td><b>${e.food}</b></td><td>${e.prob.map(esc).join("<br>")}</td><td>${e.ideas.map(esc).join("<br>")}</td></tr>`).join("")}</table>
        <p class="note">막히면 다른 용기 아이디어를 내 음식에 응용: 피자 상자를 뜯어 그릇으로 → 치킨 용기 일부를 떼어 그릇으로</p>
      </details>
      <p class="note">원문 138~139쪽 탐구 3-1</p>`; },
      on: r => {
        bindInput(r, "[data-k]");
        const cur = () => get("ideas", [{ t: "", p: "", s: false }, { t: "", p: "", s: false }, { t: "", p: "", s: false }]).map(x => ({ ...x }));
        $$(".idea-row", r).forEach(row => {
          const i = +row.dataset.i;
          $("input", row).addEventListener("input", e => { const a = cur(); a[i].t = e.target.value; set("ideas", a); });
          $("select", row).onchange = e => { const a = cur(); a[i].p = e.target.value; set("ideas", a); };
          $(".star", row).onclick = () => { const a = cur(); a.forEach((x, j) => x.s = j === i ? !x.s : false); set("ideas", a); rerender(); };
        });
        $("#addIdea", r).onclick = () => { const a = cur(); a.push({ t: "", p: "", s: false }); set("ideas", a); rerender(); };
      } },
    { t: "설명서·1분 발표", html: () => {
      const ideas = get("ideas", []);
      const best = ideas.find(x => x.s) || ideas.find(x => x.t) || { t: "", p: "" };
      const used = [...new Set(ideas.filter(x => x.t && x.p).map(x => x.p))];
      return `
      <h2>새로운 포장 용기의 디자인 설명서</h2>
      <p class="lead">특징이 드러나게 종이에 자세히 그리고, 설명을 적어요. 모둠에서 1분씩 발표하고, 친구 아이디어에 더하면 좋을 의견은 포스트잇으로.</p>
      <div class="grid2">
        <div>
          <label class="q">용기 이름</label><input type="text" data-k="packName" value="${esc(get("packName", ""))}" placeholder="예: 뜨거운 음식 내게 맡겨! 음식 용기">
          <label class="q">특징 설명</label><textarea rows="4" data-k="packDesc" placeholder="• 용기 윗면에 천이 있어 김이 물방울로 떨어지는 것을 막음&#10;• 식사 후 물티슈로 사용 가능">${esc(get("packDesc", ""))}</textarea>
          <h3>1분 발표</h3>${timerHTML(60)}
        </div>
        <div class="card-out" id="card">
          <div class="tag">${esc(get("food", "") || "배달 음식")} 포장 용기</div>
          <h3 id="cName">${esc(get("packName", "") || "(용기 이름)")}</h3>
          ${best.t ? `<p>★ ${esc(best.t)}</p>` : ""}
          <p style="white-space:pre-wrap" id="cDesc">${esc(get("packDesc", ""))}</p>
          <div class="chips">${used.map(u => `<span class="pill">${esc(u)}</span>`).join("")}</div>
        </div>
      </div>
      <div class="box">📜 <b>디자인권</b>: 디자인을 등록한 사람이 그 디자인과 비슷한 디자인에 대해 갖는 독점적인 권리. 여러분이 만든 포장 용기 디자인도 보호받을 수 있어요. ${vid(D.links.designRight, "디자인권 영상")}</div>
      <div class="btn-row no-print"><button class="btn ghost" onclick="window.print()">🖨️ 인쇄·PDF</button><a class="btn" href="#library">자료실 →</a></div>
      <p class="note">원문 140~141쪽 탐구 3-2·3-3</p>`; },
      on: r => {
        mountTimer(r);
        bindInput(r, "[data-k]");
        $('[data-k="packName"]', r).addEventListener("input", e => { $("#cName", r).textContent = e.target.value || "(용기 이름)"; });
        $('[data-k="packDesc"]', r).addEventListener("input", e => { $("#cDesc", r).textContent = e.target.value; });
      } }
  ]
};

const ACTS = { needs, bio, triz };

// ═════════════ 첫 화면 · 자료실 ═════════════
function home() {
  return `
  <section class="hero">
    <div class="kicker">찾아가는 과학발명교실 연수 · 디지털과 연계한 발명 수업</div>
    <h1>문제를 찾고, 자연에서 배우고,<br>원리로 고친다</h1>
    <p>발명의 세 과정을 공식 발명 교재 활동 하나씩으로 체험해요. 교실에서도 이 주소 그대로 쓰면 돼요. 적은 내용은 이 기기에만 저장돼요.</p>
  </section>
  <div class="flow">
    ${["needs", "bio", "triz"].map(k => { const a = ACTS[k]; return `
      <a href="#${k}" class="r-${k}">
        <div class="emo">${{ needs: "🔍", bio: "🦎", triz: "📦" }[k]}</div>
        <div class="step">${a.n}. ${a.proc}</div>
        <h2>${a.title}</h2>
        <p>${{ needs: "생성형 AI와 약속을 만들고, AI가 찾아 준 문제 상황과 프롬프트로 니즈를 찾는다.", bio: "생물과 발명품을 짝 짓고, 생물의 특징을 골라 발명품을 구상해 오토드로우로 그린다.", triz: "발명 원리 7가지로 연습하고, 배달 음식 포장의 불편을 찾아 새 용기를 디자인한다." }[k]}</p>
        <span class="pill">${a.mode}</span><span class="pill gray">${{ needs: "초등 전 학년", bio: "3~4 과학", triz: "6 미술" }[k]}</span>
      </a>`; }).join("")}
  </div>
  <p class="note">교재: 한국발명진흥회 「니즈야! 아이디어를 찾아줘」(2026) · 특허청 「쓱쏙 발명」(2025) · 특허청 「국/사/미 속 스마트 발명 도전하기」(2022). 교재 사진 대신 이모지를 썼어요.</p>`;
}
function library() {
  const plan = [
    ["1. 문제 발견", "니즈야! 아이디어를 찾아줘", "브레인스토밍 → AI 약속 → 문제 상황 20 → 프롬프트", "교사 PC, 생성형 AI 계정(교사)", "1차시"],
    ["2. 아이디어 발상", "자연은 나의 선생님", "생체 모방 개념 → 연결 짓기 → 카드 놀이 → 구상 → 오토드로우", "노트북·태블릿 1인 1대(오토드로우는 가입 없음), 색연필", "교재 4~6차시 → 줄여서 2차시"],
    ["3. 설계·개선", "배달 음식 포장 용기", "디자인 변화 → 발명 원리 7 → 문제점 찾기 → 3단계 디자인 → 1분 발표", "색연필·사인펜, 포스트잇, 기기(선택)", "2차시"]
  ];
  return `
  <div class="act-head"><div><div class="step">자료실</div><h1>교실로 가져가기</h1></div></div>
  <div class="lib-group"><h2>오늘 활동 한눈에</h2>
    <div style="overflow-x:auto"><table class="plan-table"><tr><th>과정</th><th>활동</th><th>순서</th><th>준비물</th><th>시간</th></tr>
    ${plan.map(r => `<tr>${r.map((c, i) => `<td>${i === 1 ? `<b>${c}</b>` : esc(c)}</td>`).join("")}</tr>`).join("")}</table></div>
  </div>
  ${D.library.map(g => `<div class="lib-group"><h2>${esc(g.group)}</h2>
    ${g.items.map(x => `<a class="lib-item" href="${x.u}" target="_blank" rel="noopener"><div><b>${esc(x.t)}</b><span>${esc(x.m)}</span></div><span class="go">↗</span></a>`).join("")}</div>`).join("")}
  <div class="btn-row"><button class="btn ghost" id="wipe">이 기기에 적은 내용 모두 지우기</button></div>`;
}

// ═════════════ 라우터 ═════════════
const app = $("#app");
function route() {
  const [r, s] = (location.hash.slice(1) || "home").split("/");
  return { r: ACTS[r] || r === "library" ? r : "home", s: Math.max(0, (+s || 1) - 1) };
}
function rerender(keepScroll) {
  const y = window.scrollY;
  render();
  if (keepScroll) window.scrollTo(0, y);
}
function render() {
  clearInterval(tick);
  const { r, s } = route();
  document.body.className = "r-" + r;
  $$("#tabs a").forEach(a => a.classList.toggle("on", a.dataset.r === r));
  if (r === "home") { app.innerHTML = home(); return; }
  if (r === "library") {
    app.innerHTML = library();
    $("#wipe").onclick = () => { S = {}; save(); M = null; MEM = null; toast("지웠어요"); };
    return;
  }
  const a = ACTS[r], step = Math.min(s, a.steps.length - 1), st = a.steps[step];
  const seen = get("seen", {}); seen[r + step] = 1; set("seen", seen);
  app.innerHTML = `
    <div class="act-head">
      <div><div class="step">${a.n}. ${a.proc} · <span class="pill">${a.mode}</span></div><h1>${a.title}</h1></div>
      <a class="src" href="${a.src.url}" target="_blank" rel="noopener">📘 ${esc(a.src.label)} ↗</a>
    </div>
    <div class="stepper">${a.steps.map((x, i) => `<button class="${i === step ? "on" : ""} ${seen[r + i] ? "done" : ""}" data-i="${i}">${i + 1}. ${x.t}</button>`).join("")}</div>
    <section class="panel" id="panel">${st.html()}</section>
    <div class="nav-row">
      <button class="btn ghost" id="prev" ${step === 0 ? "disabled" : ""}>← 이전</button>
      ${step < a.steps.length - 1 ? `<button class="btn" id="next">다음: ${a.steps[step + 1].t} →</button>` : ""}
    </div>`;
  const go = i => { location.hash = `${r}/${i + 1}`; };
  $$(".stepper button").forEach(b => b.onclick = () => go(+b.dataset.i));
  $("#prev").onclick = () => go(step - 1);
  const nx = $("#next"); if (nx) nx.onclick = () => go(step + 1);
  if (st.on) st.on($("#panel"));
  const on = $(".stepper .on"); if (on) on.scrollIntoView({ block: "nearest", inline: "center" });
}
window.addEventListener("hashchange", () => { render(); window.scrollTo(0, 0); });
render();
})();
