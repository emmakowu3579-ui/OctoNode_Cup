/* Minimal, dependency-free leaderboard UI:
 * - loads ../leaderboard/leaderboard.csv
 * - search + filters (model, date)
 * - sortable columns
 * - column toggles
 */
function parseCSV(text){
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split(",");
  const rows = [];
  for(let i=1;i<lines.length;i++){
    if(!lines[i].trim()) continue;
    const cols = [];
    // naive CSV parse with quotes
    let cur="", inQ=false;
    for(let j=0;j<lines[i].length;j++){
      const ch = lines[i][j];
      if(ch === '"'){ inQ = !inQ; continue; }
      if(ch === "," && !inQ){ cols.push(cur); cur=""; continue; }
      cur += ch;
    }
    cols.push(cur);
    const obj = {};
    header.forEach((h, idx) => obj[h] = (cols[idx] ?? "").trim());
    rows.push(obj);
  }
  return rows;
}

function daysAgo(dateStr){
  const d = new Date(dateStr);
  if(isNaN(d.getTime())) return Infinity;
  const now = new Date();
  return (now - d) / (1000*60*60*24);
}

const state = {
  rows: [],
  filtered: [],
  sortKey: "score",
  sortDir: "desc", // asc|desc
  hiddenCols: new Set(),
};

function renderTable(){
  const tbody = document.querySelector("#tbl tbody");
  tbody.innerHTML = "";
  const rows = state.filtered;

  rows.forEach((r, idx) => {
    const tr = document.createElement("tr");
    const rank = idx + 1;
    const cells = [
      ["rank", rank],
      ["team", r.team],
      ["score", r.score],
      ["timestamp_utc", r.timestamp_utc],
    ];
    
    cells.forEach(([k, v]) => {
      const td = document.createElement("td");
      td.dataset.key = k;
      td.textContent = v;
      if(k === "rank") td.classList.add("rank");
      if(k === "score") td.classList.add("score");
      //if(state.hiddenCols.has(k)) td.style.display = "none";
      if(state.hiddenCols.has(k)) td.classList.add("hidden");
      else td.classList.remove("hidden");

      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  // hide headers accordingly
  document.querySelectorAll("#tbl thead th").forEach(th => {
    const k = th.dataset.key;
    //th.style.display = state.hiddenCols.has(k) ? "none" : "";
    th.classList.toggle("hidden", state.hiddenCols.has(k));

  });

  document.getElementById("status").textContent =
    rows.length ? `${rows.length} result(s)` : "No results";
}



function updateStats(rows){
  if (!rows || rows.length === 0) {
    document.getElementById("statParticipants").textContent = "0";
    document.getElementById("statBest").textContent = "–";
    document.getElementById("statAvg").textContent = "–";
    return;
  }

  // Participants (unique teams)
  const teams = new Set(rows.map(r => r.team));
  document.getElementById("statParticipants").textContent = teams.size;

  // Scores
  const scores = rows
    .map(r => parseFloat(r.score))
    .filter(v => !isNaN(v));

  // Best score
  const best = Math.max(...scores);
  document.getElementById("statBest").textContent = best.toFixed(4);

  // Average score
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  document.getElementById("statAvg").textContent = avg.toFixed(4);

  /*// Most used model
  const modelCount = {};
  rows.forEach(r => {
    if (!r.model) return;
    modelCount[r.model] = (modelCount[r.model] || 0) + 1;
  });

  const topModel = Object.entries(modelCount)
    .sort((a, b) => b[1] - a[1])[0][0];

  document.getElementById("statModel").textContent = topModel.toUpperCase();*/
}



function applyFilters(){
  const q = document.getElementById("search").value.toLowerCase().trim();
  //const model = document.getElementById("modelFilter").value;
  const date = document.getElementById("dateFilter").value;

  let rows = [...state.rows];
/*
  if(model !== "all"){
    rows = rows.filter(r => (r.model || "").toLowerCase() === model);
  }*/

  if(date !== "all"){
    const maxDays = (date === "last30") ? 30 : 180;
    rows = rows.filter(r => daysAgo(r.timestamp_utc) <= maxDays);
  }

  if(q){
    rows = rows.filter(r => {
      const hay = `${r.team} ${r.timestamp_utc}`.toLowerCase();
      return hay.includes(q);
    });
  }

  // Sort
  const k = state.sortKey;
  const dir = state.sortDir === "asc" ? 1 : -1;
  rows.sort((a,b) => {
    let av = a[k], bv = b[k];
    if(k === "score"){
      av = parseFloat(av); bv = parseFloat(bv);
      if(isNaN(av)) av = -Infinity;
      if(isNaN(bv)) bv = -Infinity;
      return (av - bv) * dir;
    }
    // default string
    av = (av ?? "").toString().toLowerCase();
    bv = (bv ?? "").toString().toLowerCase();
    if(av < bv) return -1 * dir;
    if(av > bv) return  1 * dir;
    return 0;
  });

  state.filtered = rows;
  renderTable();
  updateStats(state.filtered);


  

}

function updateSortIndicators() {
  document.querySelectorAll("#tbl thead th").forEach(th => {
    th.classList.remove("sorted-asc", "sorted-desc");

    if (th.dataset.key === state.sortKey) {
      th.classList.add(
        state.sortDir === "asc" ? "sorted-asc" : "sorted-desc"
      );
    }
  });
}


function setupColumnToggles(){
  const cols = [
    ["rank","Rank"],
    ["team","Team"],
    ["score","Score"],
    ["timestamp_utc","Date (UTC)"],
  ];
  
  const wrap = document.getElementById("columnToggles");
  wrap.innerHTML = "";
  cols.forEach(([k,label]) => {
    const id = `col_${k}`;
    const lab = document.createElement("label");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !state.hiddenCols.has(k);
    cb.id = id;
    cb.addEventListener("change", () => {
      if(cb.checked) state.hiddenCols.delete(k);
      else state.hiddenCols.add(k);
      renderTable();
    });
    lab.appendChild(cb);
    const sp = document.createElement("span");
    sp.textContent = label;
    lab.appendChild(sp);
    wrap.appendChild(lab);
  });
  
  
}

function setupSorting(){
  document.querySelectorAll("#tbl thead th").forEach(th => {
    th.addEventListener("click", () => {
      const k = th.dataset.key;
      if(!k) return;
      if(state.sortKey === k){
        state.sortDir = (state.sortDir === "asc") ? "desc" : "asc";
      }else{
        state.sortKey = k;
        state.sortDir = (k === "score") ? "desc" : "asc";
      }
      applyFilters();
    });
  });
}

async function main(){
  const status = document.getElementById("status");
  try{
    const res = await fetch("leaderboard/leaderboard.csv", {cache:"no-store"});
    const txt = await res.text();
    const rows = parseCSV(txt);

    // normalize and compute rank order by score (descending) initially
    const cleaned = rows
      .filter(r => r.team) // ignore empty template line
      .map(r => ({
        timestamp_utc: r.timestamp_utc,
        team: r.team,
        score: r.score,
      }));
      

    state.rows = cleaned;
/*
    // fill model options
    const modelSet = new Set(cleaned.map(r => r.model).filter(Boolean));
    const sel = document.getElementById("modelFilter");
    [...modelSet].sort().forEach(m => {
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = m;
      sel.appendChild(opt);
    });*/

    setupColumnToggles();
    setupSorting();
    

    document.getElementById("search").addEventListener("input", applyFilters);
    //document.getElementById("modelFilter").addEventListener("change", applyFilters);
    document.getElementById("dateFilter").addEventListener("change", applyFilters);

    // default: sort by score desc
    state.sortKey = "score";
    state.sortDir = "desc";
    applyFilters();
  }catch(e){
    status.textContent = "Failed to load leaderboard.";
    console.error(e);
  }
  document.getElementById("showAllCols").onclick = () => {
    state.hiddenCols.clear();
    setupColumnToggles();
    renderTable();
  };
  
  document.getElementById("hideAllCols").onclick = () => {
    document.querySelectorAll("#columnToggles input").forEach(cb => {
      state.hiddenCols.add(cb.id.replace("col_", ""));
    });
    setupColumnToggles();
    renderTable();
  };
}

main();
