/* game.js */
/* Tintagel Territory Game — v0.12.5
   Fixes and rules per request:
   1) EP is always eliminated at end-of-round (after bidding resolve or no-contest resolve).
   2) Bidding phase opens with a queue list that shows each contested hex AND the contestants’ names.
   3) Refund rule: if any contestant bids 0 and a different contestant wins with a positive, unique bid,
      refund that winner’s bid amount immediately on resolution of that hex.
      Note: EP is still zeroed at round end; the refund matters during multi-hex bidding resolution ordering.
*/
(function(){
  "use strict";

  // ------------------ DOM ------------------
  const $ = (id)=>document.getElementById(id);
  const $canvas = $("board");
  const ctx = $canvas.getContext("2d");

  // Setup
  const $overlay = $("overlay");
  const $setupGameName = $("setupGameName");
  const $hexRadiusInput = $("hexRadiusInput");
  const $homeSepInput = $("homeSeparationInput");
  const $extraRowsInput = $("extraRowsInput");
  const $pName = $("pName");
  const $pRank = $("pRank");
  const $btnAdd = $("btnAdd");
  const $btnAddSample10 = $("btnAddSample10");
  const $rosterBody = $("rosterBody");
  const $participantCount = $("participantCount");
  const $totalRounds = $("totalRounds");

  // HUD controls
  const $btnGameMenu = $("btnGameMenu");
  const $btnEPMenu = $("btnEPMenu");
  const $btnStartExp = $("btnStartExp");
  const $btnFinishExp = $("btnFinishExp");
  const $btnResolve = $("btnResolve");
  const $btnFinishBidding = $("btnFinishBidding");
  const $btnUndoMove = $("btnUndoMove");
  const $btnReset = $("btnReset");
  const $btnExportDevlog = $("btnExportDevlog");
  const $timeline = $("timeline");
  const $phaseTag = $("phaseTag");
  const $gameNameTag = $("gameNameTag");

  // Zoom
  const $btnZoomIn = $("btnZoomIn");
  const $btnZoomOut = $("btnZoomOut");
  const $btnZoomFit = $("btnZoomFit");

  // Sidebar + popups
  const $epList = $("epList");
  const $epPop = $("epPop");
  const $popName = $("popName");
  const $popPhaseHint = $("popPhaseHint");
  const $popSet = $("popSet");
  const $popApplySet = $("popApplySet");
  const $popClose = $("popClose");

  const $bidPop = $("bidPop");
  const $bidTitle = $("bidTitle");
  const $bidInput = $("bidInput");
  const $bidApply = $("bidApply");
  const $bidClose = $("bidClose");
  const $bidNext = $("bidNext");

  // Game menu
  const $gameMenuPop = $("gameMenuPop");
  const $gmClose = $("gmClose");
  const $gmSave = $("gmSave");
  const $gmCurrentName = $("gmCurrentName");
  const $gmNewName = $("gmNewName");
  const $gmHexRadius = $("gmHexRadius");
  const $gmHomeSep = $("gmHomeSep");
  const $gmExtraRows = $("gmExtraRows");
  const $gmNewCreate = $("gmNewCreate");
  const $gmGameList = $("gmGameList");
  const $gmRoundList = $("gmRoundList");

  // EP Adjustment submenu + assign list
  const $epAdjustPop = $("epAdjustPop");
  const $epMenuClose = $("epMenuClose");
  const $btnAssignEP = $("btnAssignEP");
  const $btnRandEP = $("btnRandEP");
  const $assignListPop = $("assignListPop");
  const $assignList = $("assignList");
  const $assignClose = $("assignClose");

  // Bidding queue window
  const $bidQueuePop = $("bidQueuePop");
  const $bqList = $("bqList");
  const $bqClose = $("bqClose");

  // Legend
  const $legendBox = $("legendBox");

  // Score popup
  const $scorePop = $("scorePop");
  const $scoreClose = $("scoreClose");
  const $scoreTitle = $("scoreTitle");
  const $scoreList = $("scoreList");

  // ------------------ State ------------------
  const CODE_VERSION = "0.12.5";
  const REGISTRY_KEY = "ttg_game_registry";
  const NS = (name)=>({ GAME:`ttg_game:${name}`, ROUNDS:`ttg_round_saves:${name}`, DEVLOG:`ttg_devlog:${name}` });

  const COLORS = ["#e11d48","#22d3ee","#f59e0b","#10b981","#a78bfa","#f43f5e","#14b8a6","#f97316","#84cc16","#06b6d4","#ef4444","#eab308","#34d399","#60a5fa"];
  const RANKS = ["Man-at-Arms","Knight Bachelor","Knight Banneret"];
  const NAME_POOL = ["Bob","Kane","Doug","Andrew","Sato","Caroline","Bobby","Rei","Matt","Tanaka","Aki","Naaman","Sophie","Kai","Fuji","Kiyoka","Taiga","Nakamura","Kang","Taira"];
  const PHASES = { EPADJ:"EP Adjustment", EXP:"Expansion", RES:"Resolve Expansions", BID:"Bidding", END:"Finished" };

  let game = null;
  let ns = NS("default");
  let grid = {
    radius: 6,
    size: 24,
    originX: $canvas.width/2,
    originY: $canvas.height/2,
    zoom: 1,
    offsetX: 0,
    offsetY: 0
  };
  let expansionMode = false;
  let activePid = null;
  let popForPid = null;
  let bidTargetKey = null;

  // triple-click detection
  let lastDbl = { key:null, at:0 };

  // ------------------ Devlog ------------------
  function nowISO(){ return new Date().toISOString(); }
  function getDevlog(){ return JSON.parse(localStorage.getItem(ns.DEVLOG) || "[]"); }
  function appendDevlog(entry){ const list = getDevlog(); list.push(entry); localStorage.setItem(ns.DEVLOG, JSON.stringify(list)); }
  function log(event, details, files){ appendDevlog({ ts: nowISO(), version: CODE_VERSION, game: game?.name||"—", event, details, files: files||[] }); }
  function exportDevlogFile(){
    const list = getDevlog();
    const lines = [];
    lines.push("=== DEVLOG — Tintagel Territory Game ===");
    lines.push(`Exported: ${nowISO()}`);
    lines.push("");
    for(const e of list){
      lines.push(`Timestamp: ${e.ts}`);
      if(e.version) lines.push(`Version: ${e.version}`);
      lines.push(`Game: ${e.game||"—"}`);
      lines.push(`Event: ${e.event}`);
      if(e.files?.length) lines.push(`Files: ${e.files.join(", ")}`);
      if(e.details) { lines.push("Details:"); lines.push(e.details); }
      lines.push("");
    }
    const blob = new Blob([lines.join("\n")], {type:"text/plain"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "DEVLOG_TTG.txt"; a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  }
  $btnExportDevlog?.addEventListener("click", exportDevlogFile);

  // ------------------ Utils ------------------
  const uid = () => (crypto && crypto.randomUUID) ? crypto.randomUUID() : "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  const key = (q,r)=> `${q},${r}`;
  const cubeRound = (q,r)=>{ let x=q, z=r, y=-x-z; let rx=Math.round(x), ry=Math.round(y), rz=Math.round(z);
    const x_diff=Math.abs(rx-x), y_diff=Math.abs(ry-y), z_diff=Math.abs(rz-z);
    if(x_diff>y_diff && x_diff>z_diff) rx=-ry-rz; else if(y_diff>z_diff) ry=-rx-rz; else rz=-rx-ry; return {q:rx,r:rz}; };
  const axialToPixel = (q,r,size)=>{ const x = size * Math.sqrt(3) * (q + r/2); const y = size * 1.5 * r; return {x, y}; };
  const pixelToAxial = (px,py,size,ox,oy)=>{ const x = (px-ox), y = (py-oy); const q = (Math.sqrt(3)/3 * x - 1/3 * y) / size; const r = (2/3 * y) / size; return cubeRound(q,r); };
  const neighbors = (q,r)=>[[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]].map(([dq,dr])=>[q+dq,r+dr]);
  const tilesInRadius = (R)=>{ const arr=[]; for(let q=-R;q<=R;q++){ const r1 = Math.max(-R,-q-R); const r2 = Math.min(R,-q+R); for(let r=r1;r<=r2;r++) arr.push([q,r]); } return arr; };
  const deepClone = (o)=> JSON.parse(JSON.stringify(o));
  function syncExpansionFlag(){ expansionMode = (game?.phase === PHASES.EXP); }
  function homeIndex(pid){ return (game?.participants||[]).findIndex(p=>p.id===pid); }
  function getPlayer(pid){ return game?.participants?.find(p=>p.id===pid) || null; }
  function getNameById(pid){ const p = getPlayer(pid); return p ? p.name : pid; }

  // storage
  function setNamespace(name){ ns = NS(name); }
  function loadGameFromStorage(name){ const raw = localStorage.getItem(NS(name).GAME); if(!raw) return null; try{ return JSON.parse(raw); }catch{ return null; } }
  function saveRegistry(name){
    const list = JSON.parse(localStorage.getItem(REGISTRY_KEY) || "[]");
    if(!list.includes(name)){ list.push(name); localStorage.setItem(REGISTRY_KEY, JSON.stringify(list)); }
  }
  function listGames(){ return JSON.parse(localStorage.getItem(REGISTRY_KEY) || "[]"); }
  const save = ()=> localStorage.setItem(ns.GAME, JSON.stringify(game));
  const load = ()=>{ const raw = localStorage.getItem(ns.GAME); if(!raw) return null; try{ return JSON.parse(raw); }catch{ return null; } };

  // ------------------ Zoom helpers ------------------
  function effectiveSize(){ return grid.size * grid.zoom; }
  function effectiveOriginX(){ return grid.originX + grid.offsetX; }
  function effectiveOriginY(){ return grid.originY + grid.offsetY; }
  function fitToView(){
    const R = grid.radius|0;
    if(R <= 0) { grid.zoom = 1; grid.offsetX = 0; grid.offsetY = 0; redraw(); return; }
    const base = grid.size;
    const mapW = Math.sqrt(3) * base * (2*R + 1);
    const mapH = 1.5 * base * (2*R + 1);
    const margin = 30;
    const z = Math.min( ($canvas.width - margin)/mapW, ($canvas.height - margin)/mapH );
    grid.zoom = Math.max(0.2, Math.min(3, z));
    grid.offsetX = 0;
    grid.offsetY = 0;
    redraw();
  }
  function zoomBy(factor, centerX, centerY){
    const prev = grid.zoom;
    let next = Math.max(0.2, Math.min(3, prev * factor));
    const ex = effectiveOriginX();
    const ey = effectiveOriginY();
    const cx = centerX ?? $canvas.width/2;
    const cy = centerY ?? $canvas.height/2;
    const dx = (cx - ex);
    const dy = (cy - ey);
    grid.offsetX += dx - dx * (next/prev);
    grid.offsetY += dy - dy * (next/prev);
    grid.zoom = next;
    redraw();
  }
  $btnZoomFit?.addEventListener("click", fitToView);
  $btnZoomIn?.addEventListener("click", ()=>zoomBy(1.15));
  $btnZoomOut?.addEventListener("click", ()=>zoomBy(1/1.15));
  $canvas.addEventListener("wheel",(e)=>{
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1/1.12 : 1.12;
    zoomBy(factor, e.offsetX, e.offsetY);
  }, { passive:false });

  // ------------------ Rendering ------------------
  function drawHex(x,y,size,fill,stroke){
    ctx.beginPath();
    for(let i=0;i<6;i++){
      const angle = Math.PI/180 * (60*i - 30);
      const vx = x + size * Math.cos(angle);
      const vy = y + size * Math.sin(angle);
      if(i===0) ctx.moveTo(vx,vy); else ctx.lineTo(vx,vy);
    }
    ctx.closePath();
    if(fill){ ctx.fillStyle=fill; ctx.fill(); }
    ctx.lineWidth = 1;
    ctx.strokeStyle = stroke || "#233";
    ctx.stroke();
  }
  function drawInnerDashed(x,y,size){
    ctx.beginPath();
    for(let i=0;i<6;i++){
      const angle = Math.PI/180 * (60*i - 30);
      const vx = x + (size-6) * Math.cos(angle);
      const vy = y + (size-6) * Math.sin(angle);
      if(i===0) ctx.moveTo(vx,vy); else ctx.lineTo(vx,vy);
    }
    ctx.closePath();
    ctx.setLineDash([3,4]);
    ctx.strokeStyle = "rgba(173,216,230,0.65)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
  }
  function drawQueuedRing(x,y,size,color,highlight=false,strong=false){
    ctx.beginPath();
    for(let i=0;i<6;i++){
      const angle = Math.PI/180 * (60*i - 30);
      const vx = x + (size-2) * Math.cos(angle);
      const vy = y + (size-2) * Math.sin(angle);
      if(i===0) ctx.moveTo(vx,vy); else ctx.lineTo(vx,vy);
    }
    ctx.closePath();
    ctx.lineWidth = strong ? 5 : (highlight ? 4 : 3);
    ctx.strokeStyle = strong ? "#fbbf24" : (highlight ? "#fde047" : color);
    ctx.setLineDash(highlight || strong ? [2,3] : [6,4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  function drawHomeNumber(px,py,num,ghost=false){
    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, 9, 0, Math.PI*2);
    ctx.fillStyle = ghost ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.7)";
    ctx.fill();
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(num), px, py+0.5);
    ctx.restore();
  }
  function redraw(){
    ctx.clearRect(0,0,$canvas.width,$canvas.height);
    const R = grid.radius|0 || 6, size = effectiveSize(), originX = effectiveOriginX(), originY = effectiveOriginY();
    const tiles = tilesInRadius(R);
    const kstr = (q,r)=>key(q,r);

    for(const [q,r] of tiles){
      const {x,y} = axialToPixel(q,r,size);
      const px = originX + x, py = originY + y;
      let fill = "#0a0f18", stroke = "#1d2634";
      const own = game?.ownership?.[kstr(q,r)];
      if(own){
        const p = game.participants?.find(pp=>pp.id===own);
        fill = p ? p.color : "#333"; stroke = "#111";
      }
      drawHex(px,py,size-1, fill, stroke);

      if(game?.hardened && game.hardened[kstr(q,r)]) drawInnerDashed(px,py,size);

      if(game?.pendingMoves){
        for(const pid of Object.keys(game.pendingMoves)){
          for(const m of game.pendingMoves[pid]){
            if(m.q===q && m.r===r){
              if(m.type==="fortify"){ drawInnerDashed(px,py,size); }
              if(m.type==="outpost"){
                const idx = game.participants.findIndex(p=>p.id===pid);
                drawHomeNumber(px,py,idx+1,true);
              }
            }
          }
        }
      }
    }

    if(game?.participants){
      game.participants.forEach((p,idx)=>{
        const home = game.homes?.[p.id];
        if(home){
          const {x,y} = axialToPixel(home.q, home.r, size);
          drawHomeNumber(originX+x, originY+y, idx+1);
        }
        const outs = game.outposts?.[p.id] || [];
        for(const o of outs){
          const {x,y} = axialToPixel(o.q,o.r,size);
          drawHomeNumber(originX+x, originY+y, idx+1);
        }
      });
    }

    if(game?.pendingMoves){
      for(const pid of Object.keys(game.pendingMoves)){
        const color = game.participants.find(p=>p.id===pid)?.color || "#888";
        for(const move of game.pendingMoves[pid]){
          if(move.type==="claim" || move.type==="takeover"){
            const {x,y} = axialToPixel(move.q, move.r, size);
            drawQueuedRing(originX+x, originY+y, size, color, false);
          }
        }
      }
    }

    if(game?.contested){
      const currentKey = currentBidKey();
      for(const k of Object.keys(game.contested)){
        const {q,r} = game.contested[k];
        const {x,y} = axialToPixel(q,r, size);
        const strong = (k === currentKey);
        drawQueuedRing(originX+x, originY+y, size, "#fff", true, strong);
      }
    }

    updateHUD();
    refreshBidQueueWindow();
    renderLegend();
  }

  // ------------------ Board input ------------------
  $canvas.addEventListener("click",(ev)=>{
    if(!game) return;

    const size = effectiveSize();
    const originX = effectiveOriginX();
    const originY = effectiveOriginY();

    if(game.phase === PHASES.EXP && expansionMode){
      if(!activePid) return;
      const rect = $canvas.getBoundingClientRect();
      const ax = pixelToAxial(ev.clientX-rect.left, ev.clientY-rect.top, size, originX, originY);
      if(Math.max(Math.abs(ax.q), Math.abs(ax.r), Math.abs(-ax.q-ax.r)) > grid.radius) return;

      const k = key(ax.q,ax.r);
      const owner = game.ownership[k] || null;
      if(isHome(ax.q, ax.r)) return;
      if(!adjacentToOwnedOrQueued(activePid, ax.q, ax.r)) return;

      const player = getPlayer(activePid);
      if(!player) return;

      const hardenedOwner = game.hardened?.[k] || null;
      const isHardenedAgainst = hardenedOwner && hardenedOwner !== activePid;

      if(owner && owner !== activePid){
        const base = 2;
        const cost = isHardenedAgainst ? base*2 : base;
        if((player.ep|0) < cost) return;
        if(alreadyQueued(activePid, ax.q, ax.r)) return;
        enqueueMove(activePid, ax.q, ax.r, "takeover", cost);
        player.ep = Math.max(0, (player.ep|0) - cost);
      }else if(!owner){
        const base = 1;
        const cost = isHardenedAgainst ? base*2 : base;
        if((player.ep|0) < cost) return;
        if(alreadyQueued(activePid, ax.q, ax.r)) return;
        enqueueMove(activePid, ax.q, ax.r, "claim", cost);
        player.ep = Math.max(0, (player.ep|0) - cost);
      }else{
        return;
      }
      save(); refreshEPList(); redraw();
      log("Queue Expansion", `Player ${player.name} queued (${ax.q},${ax.r}). EP now ${player.ep}.`, []);
      return;
    }

    if(game.phase === PHASES.BID){
      if(!activePid) return;
      const rect = $canvas.getBoundingClientRect();
      const ax = pixelToAxial(ev.clientX-rect.left, ev.clientY-rect.top, size, originX, originY);
      const k = key(ax.q,ax.r);
      const contested = game.contested && game.contested[k];
      if(!contested) return;
      if(k !== currentBidKey()) return;

      if(Object.keys(contested.bids||{}).length===0 && contested.aggressorId && activePid !== contested.aggressorId) return;

      const eligible = contested.participants.includes(activePid) || contested.prevOwnerId === activePid;
      if(!eligible) return;

      openBidPopupFor(k, ax);
      markContestants(contested);
      return;
    }
  });

  // Double-click Fortify (4 EP)
  $canvas.addEventListener("dblclick",(ev)=>{
    if(!game || game.phase !== PHASES.EXP || !expansionMode || !activePid) return;
    const size = effectiveSize();
    const originX = effectiveOriginX();
    const originY = effectiveOriginY();
    const rect = $canvas.getBoundingClientRect();
    const ax = pixelToAxial(ev.clientX-rect.left, ev.clientY-rect.top, size, originX, originY);
    const k = key(ax.q,ax.r);
    if(game.ownership[k] !== activePid) return;
    if(game.hardened?.[k]) return;
    const p = getPlayer(activePid); if(!p) return;
    if((p.ep|0) < 4) return;

    enqueueMove(activePid, ax.q, ax.r, "fortify", 4);
    p.ep = (p.ep|0) - 4;
    save(); refreshEPList(); redraw();
    log("Queue Fortify", `+Fortify at (${ax.q},${ax.r}) by ${p.name}. EP now ${p.ep|0}`, ["game.js"]);

    lastDbl = { key:k, at:performance.now() };
  });

  // Third click after dblclick → Outpost (10 EP)
  $canvas.addEventListener("click",(ev)=>{
    if(!game || game.phase !== PHASES.EXP || !expansionMode || !activePid) return;
    if(!lastDbl.key) return;
    const tnow = performance.now();
    if(tnow - lastDbl.at > 360) { lastDbl.key = null; return; }

    const size = effectiveSize();
    const originX = effectiveOriginX();
    const originY = effectiveOriginY();
    const rect = $canvas.getBoundingClientRect();
    const ax = pixelToAxial(ev.clientX-rect.left, ev.clientY-rect.top, size, originX, originY);
    const k = key(ax.q,ax.r);
    if(k !== lastDbl.key) return;

    const owner = game.ownership[k] || null;
    if(owner !== activePid) { lastDbl.key = null; return; }
    if(isOutpostAt(ax.q,ax.r)) { lastDbl.key = null; return; }
    const p = getPlayer(activePid); if(!p) { lastDbl.key = null; return; }
    if((p.ep|0) < 10) { lastDbl.key = null; return; }

    enqueueMove(activePid, ax.q, ax.r, "outpost", 10);
    p.ep = (p.ep|0) - 10;
    save(); refreshEPList(); redraw();
    log("Queue Outpost", `+Outpost at (${ax.q},${ax.r}) by ${p.name}. EP now ${p.ep|0}`, ["game.js"]);

    lastDbl.key = null;
  }, true);

  // Right-click undo
  $canvas.addEventListener("contextmenu",(e)=>{
    if(game?.phase === PHASES.EXP && expansionMode && activePid){
      e.preventDefault();
      undoLastFor(activePid);
    }
  });

  // ------------------ Bidding helpers ------------------
  function ensureBidOrder(){
    if(!game?.contested) return;
    const items = [];
    for(const k of Object.keys(game.contested)){
      const c = game.contested[k];
      const conflictSeq = Number(game.contestedOrder?.[k] ?? 1e9);
      const ids = new Set(c.participants.concat(c.prevOwnerId ? [c.prevOwnerId] : []));
      const idxList = Array.from(ids).map(homeIndex).filter(i=>i>=0);
      const baseIdx = idxList.length ? Math.min(...idxList) : 1e9;
      items.push({k, conflictSeq, baseIdx, q:c.q, r:c.r});
    }
    items.sort((a,b)=>{
      if(a.conflictSeq !== b.conflictSeq) return a.conflictSeq - b.conflictSeq;
      if(a.baseIdx !== b.baseIdx) return a.baseIdx - b.baseIdx;
      return (a.q - b.q) || (a.r - b.r);
    });
    game._bidKeys = items.map(it=>it.k);
    if(typeof game._bidIndex !== "number") game._bidIndex = 0;
  }
  function currentBidKey(){ if(!game || !game._bidKeys) return null; return game._bidKeys[game._bidIndex] || null; }
  function advanceBidKey(){ if(!game || !game._bidKeys) return; game._bidIndex = Math.min(game._bidKeys.length-1, game._bidIndex + 1); save(); redraw(); }
  function markContestants(c){
    const ids = new Set(c.participants.concat(c.prevOwnerId ? [c.prevOwnerId] : []));
    $epList.querySelectorAll("li").forEach(li=>{
      const pid = li.getAttribute("data-pid");
      li.classList.toggle("contest", ids.has(pid));
      li.classList.toggle("bidding-now", pid === activePid);
    });
  }
  function clearContestMarks(){ $epList.querySelectorAll("li").forEach(li=>{ li.classList.remove("contest"); li.classList.remove("bidding-now"); }); }
  $bidClose?.addEventListener("click", ()=>{ $bidPop.hidden = true; bidTargetKey = null; clearContestMarks(); });

  function openBidPopupFor(k, axial){
    bidTargetKey = k;
    const contested = game.contested[k];
    const current = getPlayer(activePid) || {name:"—", color:"#999", ep:0};

    const existing = Number(contested.bids?.[activePid] ?? 0);
    const cap = ((current.ep|0) || 0) + existing;

    const opps = listOpponents(contested, activePid).map(pid=>{
      const nm = getNameById(pid);
      const v = Number(contested.bids?.[pid] ?? 0);
      return `${nm} (${v})`;
    }).join(", ") || "—";

    const whoFirst = contested.aggressorId ? getNameById(contested.aggressorId) : "—";
    const firstLine = (Object.keys(contested.bids||{}).length===0 && contested.aggressorId && activePid!==contested.aggressorId)
      ? `<div style="color:#f87171;font-weight:700">Aggressor must bid first: ${whoFirst}</div>`
      : "";

    $bidTitle.innerHTML =
      `${firstLine}
       <div style="font-weight:700;margin-bottom:2px;font-size:14px">
         Current bidder: <span style="color:${current.color};">${current.name}</span> [EP: ${cap}]
       </div>
       <div>Hex (${axial.q},${axial.r}) — Opponents: ${opps}</div>`;

    $bidInput.min = 0;
    $bidInput.max = String(cap);
    $bidInput.value = Math.min(existing, cap);

    const rect = $canvas.getBoundingClientRect();
    const size = effectiveSize();
    const {x,y} = axialToPixel(axial.q, axial.r, size);
    $bidPop.style.left = `${Math.min(window.innerWidth-320, rect.left + effectiveOriginX() + x + 12)}px`;
    $bidPop.style.top  = `${Math.max(80, rect.top + effectiveOriginY() + y - 20)}px`;
    $bidPop.hidden = false;
  }

  $bidApply?.addEventListener("click", ()=>{
    if(!bidTargetKey || !game?.contested) return;
    const c = game.contested[bidTargetKey]; if(!c) return;

    if(Object.keys(c.bids||{}).length===0 && c.aggressorId && activePid !== c.aggressorId) return;

    const p = getPlayer(activePid); if(!p) return;
    const prev = Number(c.bids?.[activePid] ?? 0);
    const cap = ((p.ep|0) || 0) + prev;
    let bid = Math.floor(Math.max(0, Number($bidInput.value||0)));
    if(bid > cap) bid = cap;

    const delta = bid - prev;
    if(delta > 0){
      if((p.ep|0) < delta) return;
      p.ep = (p.ep|0) - delta;
    }else if(delta < 0){
      p.ep = (p.ep|0) + (-delta);
    }

    c.bids = c.bids || {};
    c.bids[activePid] = bid;
    save();

    refreshEPList(); updateHUD();
    const [q,r] = bidTargetKey.split(",").map(Number);
    const opps = listOpponents(c, activePid).map(pid => `${getNameById(pid)} (${Number(c.bids?.[pid] ?? 0)})`).join(", ") || "—";
    $bidTitle.innerHTML =
      `<div style="font-weight:700;margin-bottom:2px;font-size:14px">
         Current bidder: <span style="color:${getPlayer(activePid)?.color||"#999"};">${getPlayer(activePid)?.name||"—"}</span> [EP: ${p.ep|0}]
       </div>
       <div>Hex (${q},${r}) — Opponents: ${opps}</div>`;
    log("Bid Entered (immediate pay)", `${p.name} set bid ${bid} (prev ${prev}) on ${bidTargetKey}. EP now ${p.ep|0}`, []);
  });

  $bidNext?.addEventListener("click", ()=>{
    advanceBidKey();
    bidTargetKey = currentBidKey();
    clearContestMarks();
    $bidPop.hidden = true;
  });

  // ------------------ Misc logic helpers ------------------
  function listOpponents(contested, currentId){
    const set = new Set(contested.participants.concat(contested.prevOwnerId ? [contested.prevOwnerId] : []));
    set.delete(currentId);
    return Array.from(set);
  }
  function isHome(q,r){
    if(!game?.homes) return false;
    const k = key(q,r);
    for(const pid of Object.keys(game.homes)){
      const h = game.homes[pid];
      if(h && key(h.q,h.r) === k) return true;
    }
    return false;
  }
  function isOutpostAt(q,r){
    if(!game?.outposts) return false;
    const k = key(q,r);
    for(const pid of Object.keys(game.outposts)){
      if((game.outposts[pid]||[]).some(o=>key(o.q,o.r)===k)) return true;
    }
    return false;
  }
  function adjacentToOwnedOrQueued(pid,q,r){
    for(const [nq,nr] of neighbors(q,r)){ if(game.ownership[key(nq,nr)] === pid) return true; }
    const list = game.pendingMoves?.[pid] || [];
    for(const [nq,nr] of neighbors(q,r)){ if(list.some(m=>m.q===nq && m.r===nr)) return true; }
    return false;
  }
  function alreadyQueued(pid,q,r){ const list = game.pendingMoves?.[pid] || []; return list.some(m=>m.q===q && m.r===r && (m.type==="claim"||m.type==="takeover")); }
  function enqueueMove(playerId,q,r,kind,cost){
    if(!game.seq) game.seq = 1;
    const seq = game.seq++;
    if(!game.pendingMoves) game.pendingMoves = {};
    if(!game.pendingMoves[playerId]) game.pendingMoves[playerId] = [];
    game.pendingMoves[playerId].push({q,r,type: kind||"claim", seq, cost: Number(cost)||0});
  }
  function undoLastFor(pid){
    const list = game.pendingMoves?.[pid] || [];
    if(list.length === 0) return;
    const last = list.pop();
    const p = getPlayer(pid);
    if(p){ p.ep = (p.ep|0) + (Number(last.cost)||0); }
    save(); refreshEPList(); redraw();
    log("Undo", `Removed last ${last.type} at (${last.q},${last.r}) for ${p?.name||pid}. Refunded ${last.cost||0} EP.`, ["game.js"]);
  }

  // ------------------ EP list rendering ------------------
  function refreshEPList(){
    if(!$epList) return;
    $epList.innerHTML = "";
    if(!game?.participants) return;
    game.participants.forEach((p,i)=>{
      const li = document.createElement("li");
      li.setAttribute("data-pid", p.id);
      li.setAttribute("data-index", String(i+1));
      li.tabIndex = 0;
      if(activePid === p.id) li.classList.add("active");
      li.innerHTML = `
        <span class="num" style="background:${p.color}">${i+1}</span>
        <span class="swatch" style="background:${p.color}"></span>
        <span class="name">${p.name}</span>
        <span class="ep">${p.ep|0} EP</span>
      `;
      li.addEventListener("click",()=>{ activePid = p.id; refreshEPList(); updateHUD(); });
      $epList.appendChild(li);
    });
  }

  // ------------------ EP Adjustment UI ------------------
  const confirmPhase = (msg)=> window.confirm(`${msg}\nAre you sure? y/n`);

  $btnEPMenu?.addEventListener("click", ()=>{
    if(game?.phase !== PHASES.EPADJ) return;
    const r = $btnEPMenu.getBoundingClientRect();
    $epAdjustPop.style.left = `${r.left}px`;
    $epAdjustPop.style.top  = `${r.bottom + 6}px`;
    $epAdjustPop.hidden = false;
  });
  $epMenuClose?.addEventListener("click", ()=>{ $epAdjustPop.hidden = true; });

  $btnAssignEP?.addEventListener("click", ()=>{
    if(game?.phase !== PHASES.EPADJ) return;
    buildAssignList();
    const r = $epAdjustPop.getBoundingClientRect();
    $assignListPop.style.left = `${r.left}px`;
    $assignListPop.style.top  = `${r.bottom + 6}px`;
    $assignListPop.hidden = false;
  });
  $assignClose?.addEventListener("click", ()=>{ $assignListPop.hidden = true; });

  function buildAssignList(){
    $assignList.innerHTML = "";
    (game?.participants||[]).forEach((p,i)=>{
      const b = document.createElement("button");
      b.className = "pill";
      b.textContent = `${i+1}. ${p.name} — ${p.ep|0} EP`;
      b.addEventListener("click", ()=>{
        activePid = p.id;
        refreshEPList(); updateHUD();
        openEpEditorAtButton(b, p.id, i+1);
      });
      $assignList.appendChild(b);
    });
  }

  function openEpEditorAtButton(btn, pid, idx){
    popForPid = pid;
    const player = getPlayer(pid); if(!player) return;
    $popName.textContent = `${idx}. ${player.name} — ${player.ep|0} EP`;
    const editable = (game?.phase === PHASES.EPADJ);
    $popPhaseHint.textContent = editable ? "" : "EP can be changed only during EP Adjustment.";
    [...$epPop.querySelectorAll('.pill[data-add]')].forEach(b=>b.disabled = !editable);
    $popSet.disabled = !editable;
    $popApplySet.disabled = !editable;
    const r = btn.getBoundingClientRect();
    const left = Math.min(window.innerWidth - 340, r.right + 8);
    const top  = Math.min(window.innerHeight - 260, r.top + window.scrollY - 6);
    $epPop.style.left = `${left}px`;
    $epPop.style.top  = `${top}px`;
    $epAdjustPop.hidden = true;
    $epPop.hidden = false;
  }

  $popClose?.addEventListener("click", ()=>{ $epPop.hidden = true; popForPid = null; });

  document.addEventListener("keydown",(e)=>{ if(e.key==="Escape") {
    if(!$epPop.hidden){ $epPop.hidden = true; popForPid = null; }
    if(!$assignListPop.hidden){ $assignListPop.hidden = true; }
    if(!$epAdjustPop.hidden){ $epAdjustPop.hidden = true; }
    if(!$bidPop.hidden){ $bidPop.hidden = true; clearContestMarks(); }
    if(!$gameMenuPop.hidden){ $gameMenuPop.hidden = true; }
    if(!$scorePop.hidden){ $scorePop.hidden = true; }
  }});
  document.addEventListener("click",(e)=>{
    if(!$epPop.hidden && !e.target.closest("#epPop") && !e.target.closest("#assignListPop") && !e.target.closest("#epAdjustPop") && !e.target.closest("#btnEPMenu")) {
      $epPop.hidden = true; popForPid = null;
    }
  });

  $epPop?.addEventListener("click",(e)=>{
    const t = e.target;
    if(!t.matches(".pill[data-add]")) return;
    if(game?.phase !== PHASES.EPADJ || !popForPid) return;
    const amt = Number(t.getAttribute("data-add"));
    const p = getPlayer(popForPid); if(!p) return;
    p.ep = Math.max(0, (p.ep|0) + amt);
    save(); refreshEPList(); updateHUD();
    const idx = game.participants.findIndex(q=>q.id===p.id)+1;
    $popName.textContent = `${idx}. ${p.name} — ${p.ep|0} EP`;
    buildAssignList();
    log("EP Adjust", `${amt>=0?"+":""}${amt} EP to ${p.name}. New total: ${p.ep|0}`, ["game.js"]);
  });

  $popApplySet?.addEventListener("click", ()=>{
    if(game?.phase !== PHASES.EPADJ || !popForPid) return;
    const p = getPlayer(popForPid); if(!p) return;
    p.ep = Math.max(0, Number($popSet.value||0)|0);
    save(); refreshEPList(); updateHUD();
    const idx = game.participants.findIndex(q=>q.id===p.id)+1;
    $popName.textContent = `${idx}. ${p.name} — ${p.ep|0} EP`;
    buildAssignList();
    log("EP Set", `Set ${p.name} EP to ${p.ep|0}`, ["game.js"]);
  });

  // ------------------ Roster overlay ------------------
  const tempRoster = [];
  function repaintRoster(){
    if(!$rosterBody) return;
    $rosterBody.innerHTML = "";
    tempRoster.forEach((p,i)=>{
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${i+1}</td><td>${p.name}</td><td>${p.rank}</td>
        <td><span class="badge" style="background:${p.color}"></span></td>
        <td><button class="action" type="button" data-i="${i}">Remove</button></td>`;
      $rosterBody.appendChild(tr);
    });
  }
  $rosterBody?.addEventListener("click",(e)=>{
    const t = e.target;
    if(t.matches("button[data-i]")){
      const i = Number(t.getAttribute("data-i"));
      tempRoster.splice(i,1);
      repaintRoster();
    }
  });
  $btnAdd?.addEventListener("click", ()=>{
    const name = ($pName.value||"").trim();
    const rank = $pRank.value||"";
    if(!name || !rank) return;
    const used = new Set(tempRoster.map(p=>p.color));
    const color = COLORS.find(c=>!used.has(c)) || COLORS[(tempRoster.length)%COLORS.length];
    tempRoster.push({ id: uid(), name, rank, color, ep:0 });
    $pName.value=""; $pRank.value="";
    repaintRoster();
  });
  $btnAddSample10?.addEventListener("click", ()=>{
    const used = new Set(tempRoster.map(p=>p.color));
    for(let i=0;i<10;i++){
      const name = NAME_POOL[(Math.random()*NAME_POOL.length)|0] + (Math.random()<0.2?(" "+(1+((Math.random()*99)|0))):"");
      const rank = RANKS[(Math.random()*RANKS.length)|0];
      const color = COLORS.find(c=>!used.has(c)) || COLORS[(tempRoster.length+i)%COLORS.length];
      used.add(color);
      tempRoster.push({ id: uid(), name, rank, color, ep:0 });
    }
    repaintRoster();
    log("Sample Roster Added", "Inserted 10 random fighters.", ["index.html","game.js"]);
  });

  // ------------------ Start / Seed ------------------
  function startGame(){
    const count = Math.max(2, Number($participantCount?.value||0));
    const rounds = Math.max(1, Number($totalRounds?.value||0)) || 12;
    const gname = ($setupGameName?.value || "").trim() || `Game ${new Date().toLocaleString()}`;
    const rOverride = Number($hexRadiusInput?.value||0);
    const sepInput = Math.max(2, Number($homeSepInput?.value||10));
    const extraRows = Math.max(0, Number($extraRowsInput?.value||5));
    let roster = [...tempRoster];

    if(roster.length === 0){
      for(let i=0;i<count;i++){
        roster.push({ id: uid(), name: `P${i+1}`, rank: "Man-at-Arms", color: COLORS[i % COLORS.length], ep: 0 });
      }
    }
    const n = roster.length;

    let Rhomes;
    if(Number.isFinite(rOverride) && rOverride>=3){
      Rhomes = Math.max(3, rOverride - extraRows);
    }else{
      Rhomes = Math.max(3, Math.ceil((n * sepInput) / 6));
    }
    const mapRadius = (Number.isFinite(rOverride) && rOverride>=3) ? rOverride : (Rhomes + extraRows);

    setNamespace(gname);
    game = {
      name: gname,
      meta:{ version: CODE_VERSION },
      participants: roster,
      ownership: {},
      radius: mapRadius,
      homeRingRadius: Rhomes,
      pendingMoves: {},
      homes: {},
      hardened: {},        // home ring + fortify
      outposts: {},        // pid -> [{q,r}]
      contested: {},
      contestedOrder: {},
      _bidKeys: [],
      _bidIndex: 0,
      seq: 1,
      currentRound: 1,
      totalRounds: rounds,
      phase: PHASES.EPADJ,
      finished: false
    };
    saveRegistry(gname);

    grid.radius = mapRadius;
    seedPeripheryStarts(Rhomes, sepInput);

    // Round 1 starts at 0 EP; award in EPADJ.
    for(const pl of game.participants) pl.ep = 0;

    save();

    if($overlay) $overlay.hidden = true;
    activePid = game.participants[0]?.id || null;
    refreshEPList();
    fitToView();
    redraw();

    log("Game Start", `Game "${gname}" Players=${n}, homeRing=${Rhomes}, mapR=${mapRadius}, Rounds=${rounds}.`, ["index.html","game.js","style.css"]);
  }
  window.__TTG_START = startGame;

  function ringCoords(R){
    const arr=[]; let q=R, r=0;
    const dirs = [[0,-1],[-1,0],[-1,1],[0,1],[1,0],[1,-1]];
    for(let side=0; side<6; side++){
      const [dq,dr] = dirs[side];
      for(let i=0;i<R;i++){ arr.push([q,r]); q+=dq; r+=dr; }
    }
    return arr;
  }

  function seedPeripheryStarts(Rhomes, sep){
    const ring = ringCoords(Rhomes);
    const ringLen = ring.length;
    const n = game.participants.length;
    const step = Math.max(sep|0, Math.floor(ringLen / n) || 1);
    let idx = 0;
    game.participants.forEach((p)=>{
      const [q,r] = ring[idx % ringLen];
      game.ownership[key(q,r)] = p.id;
      game.homes[p.id] = {q,r};
      for(const [nq,nr] of neighbors(q,r)){
        game.hardened[key(nq,nr)] = p.id;
      }
      idx += step;
    });
  }

  // ------------------ Phase control ------------------
  function updateHUD(){
    if(!game){ $timeline.textContent = "No game loaded"; $phaseTag.textContent = "Phase: —"; $gameNameTag.textContent = "Game: —"; return; }
    const p = getPlayer(activePid);
    const ep = p ? (p.ep|0) : 0;
    const queued = p && game.pendingMoves?.[p.id] ? game.pendingMoves[p.id].length : 0;
    $timeline.textContent = `Round ${game.currentRound} / ${game.totalRounds} | Active: ${p ? p.name : "—"} | EP: ${ep} | Queued: ${queued}`;
    $phaseTag.textContent = `Phase: ${game.phase}`;
    $gameNameTag.textContent = `Game: ${game.name}`;

    const locked = (game.phase === PHASES.END || game.finished);
    const inEP = (game.phase === PHASES.EPADJ) && !locked;

    $btnEPMenu.disabled         = !inEP;
    $btnStartExp.disabled       = !inEP;
    $btnFinishExp.disabled      = !(game.phase === PHASES.EXP && expansionMode) || locked;
    $btnResolve.disabled        = !(game.phase === PHASES.EXP && !expansionMode) || locked;
    $btnFinishBidding.disabled  = (game.phase !== PHASES.BID) || locked;
    $btnUndoMove.disabled       = !(game.phase === PHASES.EXP && expansionMode && queued > 0) || locked;

    $btnEPMenu.classList.toggle("hot", inEP);
    $btnStartExp.classList.toggle("hot", inEP);
    $btnFinishExp.classList.toggle("hot", game.phase===PHASES.EXP && expansionMode && !locked);
    $btnResolve.classList.toggle("hot", game.phase===PHASES.EXP && !expansionMode && !locked);
    $btnFinishBidding.classList.toggle("hot", game.phase===PHASES.BID && !locked);

    // Auto show the Bidding Queue window during Bidding
    $bidQueuePop.hidden = (game.phase !== PHASES.BID || !game._bidKeys || game._bidKeys.length===0 || locked);
  }

  $btnRandEP?.addEventListener("click", ()=>{
    if(!game?.participants || game.phase !== PHASES.EPADJ || game.finished) return;
    for(const pl of game.participants){
      const gain = 2 + Math.floor(Math.random()*19);
      pl.ep = (pl.ep|0) + gain;
    }
    save(); updateHUD(); refreshEPList();
    $epAdjustPop.hidden = true;
    log("Randomize EPs", "Granted random EP [2..20] to each participant.", ["game.js"]);
  });

  $btnStartExp?.addEventListener("click", ()=>{
    if(!game || game.phase !== PHASES.EPADJ || game.finished) return;
    if(!confirmPhase("Start Expansion phase")) return;
    game.phase = PHASES.EXP; expansionMode = true;
    save(); updateHUD();
    log("Phase", "Entered Expansion; input opened.", ["game.js"]);
  });

  $btnFinishExp?.addEventListener("click", ()=>{
    if(!game || game.finished) return;
    if(!confirmPhase("Finish Expansion input")) return;
    expansionMode = false; save(); updateHUD();
    log("Phase", "Expansion input closed (still in Expansion until Resolve).", []);
  });

  $btnUndoMove?.addEventListener("click", ()=>{
    if(!game || game.phase !== PHASES.EXP || !expansionMode || !activePid || game.finished) return;
    undoLastFor(activePid);
  });

  $btnResolve?.addEventListener("click", ()=>{
    if(!game || game.finished) return;
    if(!confirmPhase("Resolve Expansions and move to Bidding or next round")) return;

    game.phase = PHASES.RES; save(); updateHUD();

    const map = {};
    for(const pid of Object.keys(game.pendingMoves||{})){
      for(const m of game.pendingMoves[pid]){
        const k = key(m.q,m.r);
        if(!map[k]) map[k] = { ownerBefore: game.ownership[k] || null, q:m.q, r:m.r, claims: [], seqs: [], specials: [] };
        if(m.type==="claim" || m.type==="takeover"){
          map[k].claims.push({ pid, type: m.type || "claim", seq: m.seq||1e9 });
          map[k].seqs.push(m.seq||1e9);
        }else{
          map[k].specials.push({ pid, type:m.type, seq:m.seq||1e9 });
        }
      }
    }
    for(const pid of Object.keys(game.pendingMoves||{})) game.pendingMoves[pid] = [];
    game.contested = {};
    game.contestedOrder = {};
    let applied = 0;

    for(const k of Object.keys(map)){
      const item = map[k];
      const ownerBefore = item.ownerBefore;
      const uniq = Array.from(new Set(item.claims.map(c=>c.pid)));

      if(uniq.length === 1){
        game.ownership[k] = uniq[0];
        applied++;
      }else if(uniq.length > 1){
        const sortedClaims = item.claims.slice().sort((a,b)=>a.seq-b.seq);
        const sortedSeqs = sortedClaims.map(c=>c.seq);
        const conflictSeq = sortedSeqs[1];

        // determine aggressor
        let occupiedBy = ownerBefore || null;
        let aggressorId = null;
        for(let i=0;i<sortedClaims.length;i++){
          const c = sortedClaims[i];
          if(occupiedBy === null){
            if(i===0){
              occupiedBy = c.pid;
            }else{
              aggressorId = c.pid; break;
            }
          }else{
            if(c.pid !== occupiedBy){ aggressorId = c.pid; break; }
          }
        }

        game.contested[k] = {
          q:item.q, r:item.r,
          participants: uniq,
          prevOwnerId: ownerBefore,
          bids: {},
          aggressorId
        };
        game.contestedOrder[k] = conflictSeq;
      }
    }

    // apply specials where owner matches initiator
    for(const k of Object.keys(map)){
      const item = map[k];
      for(const s of item.specials){
        if(s.type === "fortify"){
          if(game.ownership[k] === s.pid){ game.hardened[k] = s.pid; }
        }else if(s.type === "outpost"){
          if(game.ownership[k] === s.pid){
            if(!game.outposts[s.pid]) game.outposts[s.pid] = [];
            const exists = game.outposts[s.pid].some(o=>key(o.q,o.r)===k);
            if(!exists) game.outposts[s.pid].push({q:item.q, r:item.r});
          }
        }
      }
    }

    save();
    ensureBidOrder();

    // If there are contested hexes, enter Bidding and show the queue window immediately
    if(Object.keys(game.contested).length > 0){
      game.phase = PHASES.BID;
      save();
      updateHUD();
      refreshBidQueueWindow(); // builds list with contestants
      redraw();
      log("Resolve Expansions (pre-bid)", `Applied ${applied} non-contested claims. Contested=${Object.keys(game.contested).length}`, ["game.js"]);
    }else{
      purgeDisconnected();
      // No contests: round ends here. Zero all remaining EP.
      for(const pl of game.participants) pl.ep = 0;
      save();
      if(isFinalRound()) { endGameAndScore(); }
      else { autoSaveAndAdvance(); }
      save(); updateHUD();
    }
  });

  $btnFinishBidding?.addEventListener("click", ()=>{
    if(!game || game.finished) return;
    if(!confirmPhase("Finish Bidding and advance round")) return;

    let awarded = 0;
    for(const k of Object.keys(game.contested||{})){
      const c = game.contested[k];
      const bids = c.bids || {};
      const candidates = new Set(c.participants.concat(c.prevOwnerId ? [c.prevOwnerId] : []));
      let bestPid = null, bestVal = -1, tie = false;
      for(const pid of candidates){
        const v = Number(bids[pid]||0);
        if(v > bestVal){ bestVal = v; bestPid = pid; tie = false; }
        else if(v === bestVal){ tie = true; }
      }

      const isOutpostHere = (()=>{
        if(!c.prevOwnerId) return false;
        const outs = game.outposts?.[c.prevOwnerId] || [];
        return outs.some(o=>o.q===c.q && o.r===c.r);
      })();

      const anyZero = Array.from(candidates).some(pid => Number(bids[pid]||0) === 0);

      if(bestVal > 0 && !tie){
        if(isOutpostHere && bestVal < 11){
          if(c.prevOwnerId) game.ownership[k] = c.prevOwnerId;
        }else{
          game.ownership[k] = bestPid;
          // Outpost transfer
          if(isOutpostHere){
            const arrOld = game.outposts[c.prevOwnerId] || [];
            game.outposts[c.prevOwnerId] = arrOld.filter(o=>!(o.q===c.q && o.r===c.r));
            if(!game.outposts[bestPid]) game.outposts[bestPid] = [];
            const exists = game.outposts[bestPid].some(o=>o.q===c.q && o.r===c.r);
            if(!exists) game.outposts[bestPid].push({q:c.q, r:c.r});
          }
          awarded++;

          // Refund rule: if any contestant bid zero and winner has positive bid, refund winner’s bid.
          if(anyZero){
            const winP = getPlayer(bestPid);
            if(winP){
              winP.ep = (winP.ep|0) + bestVal;
              log("Bid Refund", `Refunded ${bestVal} EP to ${winP.name} at Hex (${c.q},${c.r}) due to zero-bid opponent.`, []);
            }
          }
        }
      }else{
        if(c.prevOwnerId) game.ownership[k] = c.prevOwnerId;
        else delete game.ownership[k];
      }
    }
    game.contested = {};
    game.contestedOrder = {};
    game._bidKeys = [];
    game._bidIndex = 0;
    $bidPop.hidden = true; bidTargetKey = null; clearContestMarks();

    save(); refreshEPList(); redraw();
    log("Bidding Resolved", `Awarded ${awarded} contested hexes.`, ["game.js"]);

    purgeDisconnected();

    // Round ends here: zero remaining EP now (after any refunds).
    for(const pl of game.participants) pl.ep = 0;
    save();

    if(isFinalRound()) { endGameAndScore(); }
    else { autoSaveAndAdvance(); }
    save(); updateHUD();
  });

  function isFinalRound(){ return game.currentRound >= game.totalRounds; }

  function autoSaveAndAdvance(){
    const saves = JSON.parse(localStorage.getItem(ns.ROUNDS) || "[]");
    saves.push({ ts: nowISO(), round: game.currentRound, data: deepClone(game) });
    localStorage.setItem(ns.ROUNDS, JSON.stringify(saves));
    log("AutoSave Round", `Saved snapshot end of round ${game.currentRound}.`, ["game.js"]);
    // advance
    game.currentRound = Math.min(game.totalRounds, game.currentRound + 1);
    game.phase = PHASES.EPADJ; // EP already zeroed at round end.
  }

  // ------------------ Scoring ------------------
  function countHexes(){
    const tally = {};
    for(const pid of (game.participants||[]).map(p=>p.id)) tally[pid]=0;
    for(const k of Object.keys(game.ownership||{})){
      const pid = game.ownership[k];
      if(pid in tally) tally[pid] += 1;
    }
    return tally;
  }

  function endGameAndScore(){
    const saves = JSON.parse(localStorage.getItem(ns.ROUNDS) || "[]");
    saves.push({ ts: nowISO(), round: game.currentRound, data: deepClone(game) });
    localStorage.setItem(ns.ROUNDS, JSON.stringify(saves));

    const tally = countHexes();
    const rows = game.participants.map((p)=>({
      pid: p.id,
      name: p.name,
      color: p.color,
      hexes: tally[p.id]||0
    })).sort((a,b)=> b.hexes - a.hexes || a.name.localeCompare(b.name));

    const top = rows[0];
    const ties = rows.filter(r=>r.hexes === top.hexes);
    let titleHtml;
    if(ties.length === 1){
      titleHtml = `
        <div style="font-weight:900;font-size:22px;letter-spacing:.5px;margin-bottom:6px;">
          WINNER:
          <span style="padding:2px 8px;border-radius:999px;border:2px solid #fbbf24;background:#1f2937;color:#fff;margin-left:6px;">
            ${top.name} — ${top.hexes} hexes
          </span>
        </div>`;
    }else{
      const pair = ties.map(t=>t.name).join(" & ");
      titleHtml = `
        <div style="font-weight:900;font-size:20px;letter-spacing:.5px;margin-bottom:6px;color:#f87171">
          TIE FOR FIRST:
          <span style="padding:2px 8px;border-radius:999px;border:2px solid #f87171;background:#1f2937;color:#fff;margin-left:6px;">
            ${pair} — ${top.hexes} hexes
          </span>
        </div>
        <div style="font-weight:700;color:#fde047;margin-bottom:6px;">
          Mandatory Challenge: tied fighters must duel to determine final victory.
        </div>`;
    }

    if($scoreTitle && $scoreList){
      $scoreTitle.innerHTML = titleHtml;
      $scoreList.innerHTML = rows.map((r,i)=>`
        <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #223;">
          <span style="width:22px;display:inline-grid;place-items:center;font-weight:700">${i+1}</span>
          <span style="width:14px;height:14px;border-radius:50%;background:${r.color};border:1px solid #0006"></span>
          <span style="flex:1;font-weight:600">${r.name}</span>
          <span style="font-variant-numeric:tabular-nums">${r.hexes}</span>
        </div>`).join("");
      $scorePop.hidden = false;
    }

    game.phase = PHASES.END;
    game.finished = true;
    save();
    updateHUD();
    log("Final Scores", `Top=${rows[0]?.name||"—"} hexes=${rows[0]?.hexes||0} ${rows.length>1 && rows[1]?.hexes===rows[0]?.hexes ? "(tie)" : ""}`, ["game.js"]);
  }

  $scoreClose?.addEventListener("click", ()=>{ $scorePop.hidden = true; });

  function purgeDisconnected(){
    const keep = new Set();
    for(const p of game.participants){
      const roots = [];
      const home = game.homes[p.id]; if(home) roots.push(home);
      const outs = game.outposts?.[p.id] || [];
      outs.forEach(o=>roots.push(o));

      const seen = new Set();
      const queue = [];
      roots.forEach(r=>{
        const k = key(r.q,r.r);
        if(game.ownership[k] === p.id && !seen.has(k)){ seen.add(k); queue.push(k); }
      });

      while(queue.length){
        const kk = queue.shift();
        const [q,r] = kk.split(",").map(Number);
        keep.add(kk);
        for(const [nq,nr] of neighbors(q,r)){
          const nk = key(nq,nr);
          if(seen.has(nk)) continue;
          if(game.ownership[nk] === p.id){
            seen.add(nk); queue.push(nk);
          }
        }
      }
    }
    let removed = 0;
    for(const k of Object.keys(game.ownership)){
      const pid = game.ownership[k];
      if(game.ownership[k] === pid && !keep.has(k)){ delete game.ownership[k]; removed++; }
    }
    if(removed>0) log("Connectivity Purge", `Removed ${removed} disconnected tiles (homes+outposts as anchors).`, ["game.js"]);
    save(); redraw();
  }

  // ------------------ Game menu ------------------
  function openGameMenu(){
    $gmCurrentName.textContent = game?.name || "—";
    $gmRoundList.innerHTML = "";
    const rlist = JSON.parse(localStorage.getItem(ns.ROUNDS) || "[]");
    if(rlist.length === 0){
      const p = document.createElement("p"); p.textContent = "No saved rounds yet for this game."; $gmRoundList.appendChild(p);
    }else{
      rlist.forEach(s=>{
        const b = document.createElement("button");
        b.className = "pill";
        b.textContent = `Round ${s.round} — ${new Date(s.ts).toLocaleString()}`;
        b.addEventListener("click", ()=>{
          game = deepClone(s.data);
          setNamespace(game.name||"default");
          grid.radius = game.radius || grid.radius;
          activePid = game.participants?.[0]?.id || null;
          syncExpansionFlag();
          save();
          refreshEPList(); fitToView(); redraw();
          log("Load Round", `Loaded snapshot of round ${s.round} for "${game.name}".`, ["game.js"]);
          $gameMenuPop.hidden = true;
        });
        $gmRoundList.appendChild(b);
      });
    }
    $gmGameList.innerHTML = "";
    const games = listGames();
    if(games.length === 0){
      const p = document.createElement("p"); p.textContent = "No saved games yet."; $gmGameList.appendChild(p);
    }else{
      games.forEach(name=>{
        const b = document.createElement("button");
        b.className = "pill";
        b.textContent = name;
        b.addEventListener("click", ()=>{
          const loaded = loadGameFromStorage(name);
          if(!loaded) return;
          setNamespace(name);
          game = loaded;
          grid.radius = game.radius || grid.radius;
          activePid = game.participants?.[0]?.id || null;
          syncExpansionFlag();
          if($overlay) $overlay.hidden = true;
          refreshEPList(); fitToView(); redraw();
          log("Load Game", `Opened "${name}".`, ["game.js"]);
          $gameMenuPop.hidden = true;
        });
        $gmGameList.appendChild(b);
      });
    }
    $gameMenuPop.style.left = "24px";
    $gameMenuPop.style.top = "140px";
    $gameMenuPop.hidden = false;
  }
  $btnGameMenu?.addEventListener("click", openGameMenu);

  $gmClose?.addEventListener("click", ()=>{ $gameMenuPop.hidden = true; });

  $gmSave?.addEventListener("click", ()=>{
    if(!game) return;
    saveRegistry(game.name);
    save();
    $gmCurrentName.textContent = game.name;
    log("Save Game", `Saved "${game.name}".`, []);
  });

  $gmNewCreate?.addEventListener("click", ()=>{
    const name = ($gmNewName.value||"").trim(); if(!name) return;
    const rOverride = Number($gmHexRadius.value||0);
    const gmSep = Math.max(2, Number($gmHomeSep.value||10));
    const gmExtra = Math.max(0, Number($gmExtraRows.value||5));
    setNamespace(name);
    let Rh = Math.max(3, rOverride ? (rOverride - gmExtra) : 6);
    const shell = { name, meta:{version:CODE_VERSION}, participants:[], ownership:{}, radius: Math.max(3, rOverride|| (Rh+gmExtra)), homeRingRadius: Rh, pendingMoves:{}, homes:{}, hardened:{}, outposts:{}, contested:{}, contestedOrder:{}, _bidKeys:[], _bidIndex:0, seq:1, currentRound:1, totalRounds:12, phase:PHASES.EPADJ, finished:false };
    game = shell;
    saveRegistry(name); save();
    if($overlay){
      $overlay.hidden = false;
      $("setupGameName").value = name;
      $("hexRadiusInput").value = rOverride>0 ? String(rOverride) : "";
      $("homeSeparationInput").value = String(gmSep);
      $("extraRowsInput").value = String(gmExtra);
    }
    refreshEPList(); fitToView(); redraw();
    log("New Game Created", `Shell created "${name}" radius=${game.radius}`, ["index.html","game.js"]);
    $gameMenuPop.hidden = true;
  });

  // Reset game
  $btnReset?.addEventListener("click", ()=>{
    if(!confirmPhase("Reset current game data and local saves")) return;
    if(game){
      localStorage.removeItem(ns.GAME);
      localStorage.removeItem(ns.ROUNDS);
      localStorage.removeItem(ns.DEVLOG);
    }else{
      localStorage.clear();
    }
    location.reload();
  });

  // ------------------ Bidding queue window ------------------
  function refreshBidQueueWindow(){
    if(!$bqList) return;
    if(!game || game.phase !== PHASES.BID || !game._bidKeys || game._bidKeys.length===0 || game.finished){
      $bidQueuePop.hidden = true; return;
    }
    $bidQueuePop.hidden = false;
    $bqList.innerHTML = "";
    const idx = game._bidIndex|0;
    game._bidKeys.forEach((k,i)=>{
      const c = game.contested[k]; if(!c) return;
      const contestants = Array.from(new Set(c.participants.concat(c.prevOwnerId ? [c.prevOwnerId] : [])))
        .map(pid => getNameById(pid)).join(", ");
      const label = `Hex (${c.q},${c.r}) — ${contestants}`;
      const b = document.createElement("button");
      b.className = "pill";
      b.textContent = `${i+1}. ${label}`;
      b.disabled = (i !== idx);
      b.addEventListener("click", ()=>{
        if(i !== idx) return;
        const axial = {q:c.q, r:c.r};
        redraw();

        if(Object.keys(c.bids||{}).length===0 && c.aggressorId && activePid !== c.aggressorId) return;

        const allowed = c.participants.includes(activePid) || c.prevOwnerId === activePid;
        if(allowed){
          openBidPopupFor(k, axial);
          markContestants(c);
        }
      });
      $bqList.appendChild(b);
    });
  }
  $bqClose?.addEventListener("click", ()=>{ $bidQueuePop.hidden = true; });

  // ------------------ Legend ------------------
  function renderLegend(){
    if(!$legendBox) return;
    $legendBox.innerHTML = `
      <div class="legend-title">Legend</div>
      <div class="legend-item"><span class="legend-swatch owned"></span><span>Owned Hex</span></div>
      <div class="legend-item"><span class="legend-swatch dashed"></span><span>Hardened / Fortified (attack costs x2; fortify costs 4)</span></div>
      <div class="legend-item"><span class="legend-swatch home"></span><span>Home Hex (numbered)</span></div>
      <div class="legend-item"><span class="legend-swatch outpost"></span><span>Fortified Outpost (cost 10; requires ≥ 11 to take)</span></div>
      <div class="legend-note">Expansion from home or any outpost. Right-click to undo last queued move.</div>
    `;
  }

  // ------------------ Boot ------------------
  function boot(){
    redraw();
    const last = listGames();
    if(last.length){
      const name = last[last.length-1];
      setNamespace(name);
      const loaded = load();
      if(loaded){
        game = loaded;
        grid.radius = game.radius||grid.radius;
        if(!game.outposts) game.outposts = {};
        if(typeof game.finished!=="boolean") game.finished = false;
        syncExpansionFlag();
        if($overlay) $overlay.hidden = true;
        fitToView();
      }
    }
    if(!game){ if($overlay) $overlay.hidden = false; renderLegend(); return; }
    activePid = game.participants?.[0]?.id || null;
    refreshEPList();
    redraw();
    log("Boot", `Loaded game "${game.name}".`, []);
  }
  boot();
})();
