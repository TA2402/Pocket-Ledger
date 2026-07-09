const { useState, useEffect, useRef } = React;

// ————— The tracker's own color dialect, ported from Excel —————
const C = {
  navy: "#1F3864", ink: "#22304A", paper: "#F7F5F0", card: "#FFFFFF",
  yellow: "#FFF2CC", yellowInk: "#7A5F12", green: "#1E7B34", greenSoft: "#E7F2E9",
  orange: "#E8944A", orangeSoft: "#FBEEDF", red: "#C33F2E", redSoft: "#F9E7E4",
  line: "#E4E0D6", gray: "#8B8577",
};
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

// Exact category → class map from the Excel Settings sheet
const CLASS_MAP = {
  "Groceries":"Needs","Eating Out":"Wants","Healthcare":"Needs","Personal Spending":"Wants",
  "Shopping":"Wants","Transport":"Needs","Travel":"Annual","Family & Gifts":"Annual",
  "Subscriptions":"Wants","Pokémon & Collectibles":"Hobby","Hobby":"Hobby","Card Flips (test)":"Flips",
  "Other Needs":"Needs","Other Expense":"Wants","Transfer to VN Account":"Transfer","Rent":"Needs",
  "Electricity":"Needs","Water":"Needs","Internet":"Needs","Gas":"Needs","Phone":"Needs",
  "Insurance":"Needs","Gym":"Needs","Investing":"Savings/Invest","Emergency Fund":"Savings/Invest",
  "Parents Support":"Income","Internship Salary":"Income","Scholarship":"Income","Deposit Refund":"Income",
  "Card Sales":"Income","Side Income":"Income","Gifts":"Income","Investment Income":"Income","Other Income":"Income",
};
const EXPENSE_CATS = ["Groceries","Eating Out","Transport","Personal Spending","Shopping","Subscriptions",
  "Pokémon & Collectibles","Card Flips (test)","Healthcare","Phone","Gym","Rent","Travel","Family & Gifts",
  "Other Needs","Other Expense","Hobby","Transfer to VN Account","Investing","Emergency Fund"];
const INCOME_CATS = ["Card Sales","Internship Salary","Parents Support","Scholarship","Deposit Refund",
  "Side Income","Gifts","Investment Income","Other Income"];
const FREQUENT = ["Groceries","Eating Out","Transport","Personal Spending","Pokémon & Collectibles","Card Flips (test)"];

const DEFAULT_RULES = [
  ["LIDL","Groceries"],["ALDI","Groceries"],["REWE","Groceries"],["EDEKA","Groceries"],["NETTO","Groceries"],
  ["PENNY","Groceries"],["KAUFLAND","Groceries"],["DM ","Groceries"],["UBER","Transport"],["BOLT","Transport"],
  ["FLIX","Transport"],["BVG","Transport"],["DB ","Transport"],["MCDON","Eating Out"],["KFC","Eating Out"],
  ["RESTAURANT","Eating Out"],["CAFE","Eating Out"],["PIZZ","Eating Out"],["AMAZON","Shopping"],
  ["ZALANDO","Shopping"],["SPOTIFY","Subscriptions"],["NETFLIX","Subscriptions"],["ICLOUD","Subscriptions"],
  ["APPLE.COM/BILL","Subscriptions"],["VODAFONE","Phone"],["TELEKOM","Phone"],["O2","Phone"],
  ["APOTHEKE","Healthcare"],["CARDMARKET","Card Flips (test)"],
  ["ALBERT HEIJN","Groceries"],["AH TO GO","Groceries"],["JUMBO","Groceries"],["SUPERMAR","Groceries"],
  ["AMAZING ORIENTAL","Groceries"],["KEBAP","Eating Out"],["DONER","Eating Out"],
];

const todayISO = () => new Date().toISOString().slice(0, 10);
const uk = (iso) => { const [y,m,d] = iso.split("-"); return `${d}/${m}/${y}`; };
const N = (v) => Number(String(v ?? "").replace(",", "."));
const eur = (n, dp=2) => "€" + Number(n).toLocaleString("en-GB",{minimumFractionDigits:dp,maximumFractionDigits:dp});

function PocketLedger() {
  const [tab, setTab] = useState("log");
  const [txns, setTxns] = useState([]);
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [kpi, setKpi] = useState(null);
  const [startRow, setStartRow] = useState(90);
  const [decimalComma, setDecimalComma] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { (async () => {
    try {
      const r = await window.storage.get("pocket-ledger-v1");
      if (r && r.value) {
        const s = JSON.parse(r.value);
        setTxns(s.txns||[]); setRules(s.rules||DEFAULT_RULES); setKpi(s.kpi||null);
        setStartRow(s.startRow||90); setDecimalComma(s.decimalComma!==false);
      }
    } catch (e) { /* first run — nothing stored yet */ }
    setLoaded(true);
  })(); }, []);

  useEffect(() => { if (!loaded) return;
    const t = setTimeout(async () => {
      try { await window.storage.set("pocket-ledger-v1",
        JSON.stringify({ txns, rules, kpi, startRow, decimalComma })); } catch (e) { console.error(e); }
    }, 400);
    return () => clearTimeout(t);
  }, [txns, rules, kpi, startRow, decimalComma, loaded]);

  const say = (msg) => { setToast(msg); setTimeout(()=>setToast(null), 2200); };
  const addTxns = (rows) => setTxns((p)=>[...p, ...rows]);

  return (
    <div style={{minHeight:"100vh", background:C.paper, color:C.ink, fontFamily:"-apple-system, system-ui, sans-serif",
      maxWidth:480, margin:"0 auto", paddingBottom:24}}>
      <header style={{background:C.navy, color:"#fff", padding:"14px 16px 10px"}}>
        <div style={{fontSize:11, letterSpacing:2, opacity:.75, textTransform:"uppercase"}}>Finance Tracker 2026</div>
        <div style={{fontSize:19, fontWeight:700}}>Pocket ledger</div>
      </header>
      <nav style={{position:"sticky", top:0, zIndex:40, background:C.navy, display:"flex",
        borderBottom:`3px solid ${C.orange}`}}>
        {[["log","Log"],["import","Import"],["export","Export"],["status","Status"],["settings","Set-up"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{flex:1, padding:"11px 0 12px", background:"none", border:"none",
            color: tab===k ? "#fff" : "rgba(255,255,255,.55)", fontWeight: tab===k?700:500, fontSize:13,
            borderBottom: tab===k?`3px solid ${C.yellow}`:"3px solid transparent", marginBottom:-3, cursor:"pointer"}}>{l}</button>
        ))}
      </nav>

      {tab==="log" && <LogTab addTxns={addTxns} kpi={kpi} say={say}/>}
      {tab==="import" && <ImportTab rules={rules} txns={txns} addTxns={addTxns} say={say}/>}
      {tab==="export" && <ExportTab txns={txns} setTxns={setTxns} startRow={startRow} setStartRow={setStartRow}
        decimalComma={decimalComma} kpi={kpi} say={say}/>}
      {tab==="status" && <StatusTab kpi={kpi} setKpi={setKpi} txns={txns} say={say}/>}
      {tab==="settings" && <SettingsTab rules={rules} setRules={setRules} decimalComma={decimalComma}
        setDecimalComma={setDecimalComma} txns={txns} setTxns={setTxns} setKpi={setKpi} say={say}/>}

      {toast && <div style={{position:"sticky", bottom:16, display:"table", margin:"0 auto", background:C.ink,
        color:"#fff", padding:"9px 18px", borderRadius:99, fontSize:13, zIndex:50}}>{toast}</div>}
    </div>
  );
}

// ————— LOG —————
function LogTab({ addTxns, kpi, say }) {
  const [amt, setAmt] = useState(""); const [type, setType] = useState("Expense");
  const [cat, setCat] = useState(null); const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState(""); const [more, setMore] = useState(false);
  const cats = type==="Expense" ? EXPENSE_CATS : INCOME_CATS;
  const rate = kpi?.rate ? N(kpi.rate) : null;
  const val = parseFloat(String(amt).replace(",", "."));
  const cls = cat ? CLASS_MAP[cat] : null;

  const save = () => {
    if (!val || !cat) { say(!val ? "Type an amount first" : "Pick a category"); return; }
    addTxns([{ id: Date.now()+Math.random(), date, type, cat, amount: Math.round(val*100)/100, note, src:"tap" }]);
    setAmt(""); setNote(""); setCat(null); say("Saved — waiting in Export");
  };

  return (
    <div style={{padding:16}}>
      <div style={{background:C.yellow, borderRadius:14, padding:"18px 16px 12px", border:`1px solid #EBD9A0`}}>
        <div style={{fontSize:11, color:C.yellowInk, letterSpacing:1.5, textTransform:"uppercase"}}>Amount — yellow means you type it</div>
        <div style={{display:"flex", alignItems:"baseline", gap:8}}>
          <span style={{fontSize:30, color:C.yellowInk, fontFamily:MONO}}>€</span>
          <input inputMode="decimal" value={amt} onChange={(e)=>setAmt(e.target.value)} placeholder="0,00"
            style={{flex:1, fontSize:40, fontWeight:700, fontFamily:MONO, background:"none", border:"none",
              outline:"none", color:C.ink, width:"100%"}}/>
        </div>
        {rate && val>0 && <div style={{fontSize:12, color:C.yellowInk, fontFamily:MONO}}>≈ {Math.round(val*rate).toLocaleString("en-GB")} ₫</div>}
      </div>

      <div style={{display:"flex", gap:8, marginTop:12}}>
        {["Expense","Income"].map((t)=>(
          <button key={t} onClick={()=>{setType(t); setCat(null);}} style={{flex:1, padding:"10px 0", borderRadius:10,
            border:`1.5px solid ${type===t ? (t==="Income"?C.green:C.red) : C.line}`,
            background: type===t ? (t==="Income"?C.greenSoft:C.redSoft) : C.card,
            color: type===t ? (t==="Income"?C.green:C.red) : C.gray, fontWeight:700, cursor:"pointer"}}>{t}</button>
        ))}
      </div>

      <div style={{marginTop:14}}>
        <div style={{fontSize:11, color:C.gray, letterSpacing:1.5, textTransform:"uppercase", marginBottom:6}}>Category</div>
        <div style={{display:"flex", flexWrap:"wrap", gap:7}}>
          {(type==="Expense" ? [...FREQUENT, ...cats.filter(c=>!FREQUENT.includes(c))] : cats).map((c)=>(
            <button key={c} onClick={()=>setCat(c)} style={{padding:"7px 12px", borderRadius:99, fontSize:13,
              border:`1.5px solid ${cat===c?C.navy:C.line}`, background:cat===c?C.navy:C.card,
              color:cat===c?"#fff":C.ink, cursor:"pointer"}}>{c}</button>
          ))}
        </div>
        {cls && <div style={{fontSize:12, color:C.gray, marginTop:8}}>
          {cls==="Income" ? "Counts as money in." :
           cls==="Hobby" ? "Comes out of the Pokémon fun pot." :
           cls==="Flips" ? "Comes out of the flip bankroll." :
           cls==="Savings/Invest" ? "Counts against the invest pot." :
           cls==="Transfer" ? "Moves money — not spending." :
           `Counts against this month's ${cls} budget.`}</div>}
      </div>

      <button onClick={()=>setMore(!more)} style={{marginTop:12, background:"none", border:"none", color:C.navy,
        fontSize:13, fontWeight:600, cursor:"pointer", padding:0}}>{more?"− Hide":"+ Date & note"}</button>
      {more && <div style={{display:"flex", gap:8, marginTop:8}}>
        <input type="date" value={date} onChange={(e)=>setDate(e.target.value)}
          style={{padding:"9px 10px", borderRadius:10, border:`1px solid ${C.line}`, background:C.card, fontSize:14}}/>
        <input value={note} onChange={(e)=>setNote(e.target.value)} placeholder="Note (optional)"
          style={{flex:1, padding:"9px 12px", borderRadius:10, border:`1px solid ${C.line}`, background:C.card, fontSize:14}}/>
      </div>}

      <button onClick={save} style={{width:"100%", marginTop:16, padding:"15px 0", borderRadius:12, border:"none",
        background:C.navy, color:"#fff", fontSize:16, fontWeight:700, cursor:"pointer"}}>Save transaction</button>
      <p style={{fontSize:12, color:C.gray, marginTop:12, lineHeight:1.5}}>
        Saved entries wait in the Export tab until you paste them into Excel — the spreadsheet stays the source of truth.
      </p>
    </div>
  );
}

// ————— IMPORT —————
function parseAmount(s, commaDecimal) {
  if (s == null) return NaN;
  let t = String(s).replace(/[€$\s]/g, "");
  const lastComma = t.lastIndexOf(","), lastDot = t.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) t = lastComma > lastDot ? t.replace(/\./g,"").replace(",",".") : t.replace(/,/g,"");
  else if (lastComma > -1) t = commaDecimal || t.length-lastComma<=3 ? t.replace(/\./g,"").replace(",",".") : t.replace(/,/g,"");
  return parseFloat(t);
}
function parseDate(s) {
  const t = String(s).trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = t.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})/);
  if (m) { const y = m[3].length===2 ? "20"+m[3] : m[3]; return `${y}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`; }
  return null;
}
function ImportTab({ rules, txns, addTxns, say }) {
  const [raw, setRaw] = useState(""); const [rows, setRows] = useState(null);
  const [map, setMap] = useState({date:0, desc:1, amount:2}); const [flip, setFlip] = useState(false);
  const [preview, setPreview] = useState(null);
  const [fileName, setFileName] = useState(null);
  const fileRef = useRef(null);

  const readFile = (file) => {
    if (!file) return;
    const readAs = (enc) => new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result); fr.onerror = () => rej(fr.error);
      fr.readAsText(file, enc);
    });
    (async () => {
      try {
        let text = await readAs("UTF-8");
        if (text.includes("\uFFFD")) text = await readAs("ISO-8859-1"); // German bank exports are often Latin-1
        setRaw(text); setFileName(file.name); setRows(null); setPreview(null);
        say(`${file.name} loaded — tap “Read the file”`);
      } catch (e) { say("Couldn't read that file — try copy-paste instead"); }
    })();
  };

  const parse = () => {
    const lines = raw.split(/\r?\n/).filter(l=>l.trim());
    if (lines.length<1) { say("Paste your bank CSV first"); return; }
    const delim = (lines[0].match(/;/g)||[]).length >= (lines[0].match(/,/g)||[]).length ? ";" : ",";
    const grid = lines.map(l=>l.split(delim).map(c=>c.replace(/^"|"$/g,"").trim()));
    const hasHeader = grid[0].some(c=>/date|datum|amount|betrag|desc|verwendung/i.test(c));
    setRows({grid: hasHeader?grid.slice(1):grid, header: hasHeader?grid[0]:grid[0].map((_,i)=>`Column ${i+1}`)});
    setPreview(null);
  };
  const build = () => {
    const out = [];
    for (const r of rows.grid) {
      const iso = parseDate(r[map.date]); const a0 = parseAmount(r[map.amount], true);
      if (!iso || isNaN(a0)) continue;
      const a = flip ? -a0 : a0;
      const desc = r[map.desc] || "";
      const type = a < 0 ? "Expense" : "Income";
      let cat = null;
      for (const [kw, c] of rules) if (desc.toUpperCase().includes(kw.toUpperCase())) { cat = c; break; }
      if (type==="Income" && !cat) cat = "Other Income";
      const dup = txns.some(t => t.date===iso && Math.abs(t.amount - Math.abs(a)) < 0.005);
      out.push({ id: Date.now()+Math.random(), date: iso, type, cat, amount: Math.round(Math.abs(a)*100)/100,
        note: desc.slice(0,60), src:"csv", include: !dup, dup });
    }
    if (!out.length) { say("No rows parsed — check the column mapping"); return; }
    setPreview(out);
  };
  const accept = () => {
    const chosen = preview.filter(p=>p.include && p.cat);
    if (!chosen.length) { say("Nothing selected (rows need a category)"); return; }
    addTxns(chosen.map(({include,dup,...t})=>t));
    setPreview(null); setRows(null); setRaw(""); say(`${chosen.length} rows added to Export`);
  };
  const sel = (k) => (
    <select value={map[k]} onChange={(e)=>setMap({...map,[k]:+e.target.value})}
      style={{padding:"8px 6px", borderRadius:8, border:`1px solid ${C.line}`, background:C.card, fontSize:13, maxWidth:110}}>
      {rows.header.map((h,i)=><option key={i} value={i}>{h.slice(0,18)||`Col ${i+1}`}</option>)}
    </select>);

  return (
    <div style={{padding:16}}>
      <div style={{fontSize:14, fontWeight:700, marginBottom:6}}>Bank CSV import</div>
      {!rows && <>
        <input ref={fileRef} type="file" accept=".csv,.txt,.tsv" style={{display:"none"}}
          onChange={(e)=>readFile(e.target.files?.[0])}/>
        <button onClick={()=>fileRef.current?.click()} style={{width:"100%", padding:"15px 0", borderRadius:12,
          border:`1.5px dashed ${C.navy}`, background:C.card, color:C.navy, fontWeight:700, fontSize:15, cursor:"pointer"}}>
          {fileName ? `📄 ${fileName} — choose another` : "📄 Choose CSV file from your bank"}</button>
        <div style={{textAlign:"center", fontSize:11, color:C.gray, margin:"8px 0"}}>— or paste the contents —</div>
        <textarea value={raw} onChange={(e)=>{setRaw(e.target.value); setFileName(null);}} rows={5}
          placeholder={"Open your bank's monthly CSV export, copy all, paste here.\nSemicolon and comma files both work."}
          style={{width:"100%", boxSizing:"border-box", padding:12, borderRadius:12, border:`1px solid ${C.line}`,
            background:C.yellow, fontSize:12, fontFamily:MONO}}/>
        <button onClick={parse} disabled={!raw.trim()} style={{width:"100%", marginTop:10, padding:"13px 0",
          borderRadius:12, border:"none", background: raw.trim()?C.navy:C.line, color:"#fff", fontWeight:700,
          fontSize:15, cursor: raw.trim()?"pointer":"default"}}>Read the file</button>
      </>}
      {rows && !preview && <>
        <div style={{fontSize:13, color:C.gray, marginBottom:8}}>{rows.grid.length} rows found. Which column is which?</div>
        <div style={{display:"flex", gap:8, flexWrap:"wrap", alignItems:"center"}}>
          <label style={{fontSize:13}}>Date {sel("date")}</label>
          <label style={{fontSize:13}}>Text {sel("desc")}</label>
          <label style={{fontSize:13}}>Amount {sel("amount")}</label>
        </div>
        <label style={{display:"flex", gap:8, alignItems:"center", marginTop:10, fontSize:13}}>
          <input type="checkbox" checked={flip} onChange={(e)=>setFlip(e.target.checked)}/>
          My bank shows spending as positive numbers
        </label>
        <div style={{fontSize:12, color:C.gray, marginTop:8, fontFamily:MONO, whiteSpace:"nowrap", overflow:"hidden"}}>
          e.g. {rows.grid[0]?.slice(0,4).join(" · ").slice(0,52)}</div>
        <button onClick={build} style={{width:"100%", marginTop:12, padding:"13px 0", borderRadius:12, border:"none",
          background:C.navy, color:"#fff", fontWeight:700, fontSize:15, cursor:"pointer"}}>Categorize rows</button>
      </>}
      {preview && <>
        <div style={{fontSize:13, color:C.gray, margin:"4px 0 8px"}}>
          Fix any “— pick —”, untick what you don’t want. Grey rows look like duplicates of entries you already logged.</div>
        {preview.map((p,i)=>(
          <div key={p.id} style={{display:"flex", gap:8, alignItems:"center", padding:"8px 0",
            borderBottom:`1px solid ${C.line}`, opacity:p.include?1:.45}}>
            <input type="checkbox" checked={p.include} onChange={(e)=>{const n=[...preview]; n[i]={...p,include:e.target.checked}; setPreview(n);}}/>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontSize:13, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{p.note||"(no text)"} {p.dup && <span style={{color:C.orange}}>· duplicate?</span>}</div>
              <div style={{fontSize:11, color:C.gray, fontFamily:MONO}}>{uk(p.date)}</div>
            </div>
            <select value={p.cat||""} onChange={(e)=>{const n=[...preview]; n[i]={...p,cat:e.target.value}; setPreview(n);}}
              style={{fontSize:12, padding:"5px 4px", borderRadius:8, border:`1px solid ${p.cat?C.line:C.orange}`, maxWidth:120, background:C.card}}>
              <option value="">— pick —</option>
              {(p.type==="Expense"?EXPENSE_CATS:INCOME_CATS).map(c=><option key={c}>{c}</option>)}
            </select>
            <div style={{fontFamily:MONO, fontSize:13, fontWeight:700, color:p.type==="Income"?C.green:C.ink}}>
              {p.type==="Income"?"+":"−"}{p.amount.toFixed(2)}</div>
          </div>
        ))}
        <button onClick={accept} style={{width:"100%", marginTop:12, padding:"13px 0", borderRadius:12, border:"none",
          background:C.green, color:"#fff", fontWeight:700, fontSize:15, cursor:"pointer"}}>Add ticked rows to Export</button>
      </>}
    </div>
  );
}

// ————— EXPORT —————
function ExportTab({ txns, setTxns, startRow, setStartRow, decimalComma, kpi, say }) {
  const [block, setBlock] = useState(null);
  const ta = useRef(null);
  const num = (n, dp=2) => decimalComma ? n.toFixed(dp).replace(".", ",") : n.toFixed(dp);
  const sorted = [...txns].sort((a,b)=>a.date.localeCompare(b.date));
  const rate = kpi?.rate ? N(kpi.rate) : null;

  const generate = () => {
    if (!sorted.length) { say("Nothing captured yet"); return; }
    // Columns B..J of the Transactions sheet. Month / VND / Class exported as
    // values (locale-proof) — the sheet's own prefilled formulas do the same job.
    const lines = sorted.map((t) => [
      uk(t.date), t.date.slice(0,7), t.type, t.cat, num(t.amount),
      rate ? String(Math.round(t.amount*rate)) : "", CLASS_MAP[t.cat]||"?", t.note||"", "",
    ].join("\t"));
    setBlock(lines.join("\n"));
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(block); say("Copied — paste into cell B"+startRow); }
    catch { ta.current?.select(); say("Press ⌘/Ctrl-C — auto-copy was blocked"); }
  };
  const clearExported = () => { setTxns([]); setBlock(null); say("Cleared — ready for next week"); };

  return (
    <div style={{padding:16}}>
      <div style={{fontSize:14, fontWeight:700}}>Waiting for Excel <span style={{fontFamily:MONO, color:C.gray}}>({sorted.length})</span></div>
      {!sorted.length && <p style={{fontSize:13, color:C.gray, marginTop:8}}>Log purchases or import a CSV first. They queue here until you move them into the spreadsheet.</p>}
      <div style={{marginTop:8}}>
        {sorted.map((t)=>(
          <div key={t.id} style={{display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:`1px solid ${C.line}`}}>
            <div style={{fontFamily:MONO, fontSize:11, color:C.gray}}>{uk(t.date).slice(0,5)}</div>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontSize:14}}>{t.cat}</div>
              {t.note && <div style={{fontSize:11, color:C.gray, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{t.note}</div>}
            </div>
            <div style={{fontFamily:MONO, fontWeight:700, fontSize:14, color:t.type==="Income"?C.green:C.ink}}>
              {t.type==="Income"?"+":"−"}{eur(t.amount)}</div>
            <button onClick={()=>setTxns(txns.filter(x=>x.id!==t.id))} style={{border:"none", background:"none",
              color:C.red, fontSize:16, cursor:"pointer", padding:"0 2px"}}>×</button>
          </div>
        ))}
      </div>
      {sorted.length>0 && <>
        <div style={{display:"flex", alignItems:"center", gap:10, marginTop:14}}>
          <label style={{fontSize:13, color:C.gray}}>First empty row in Transactions:</label>
          <input inputMode="numeric" value={startRow} onChange={(e)=>setStartRow(+e.target.value||90)}
            style={{width:70, padding:"8px 10px", borderRadius:10, border:"1px solid #EBD9A0", background:C.yellow,
              fontFamily:MONO, fontWeight:700, fontSize:15}}/>
        </div>
        <button onClick={generate} style={{width:"100%", marginTop:10, padding:"13px 0", borderRadius:12, border:"none",
          background:C.navy, color:"#fff", fontWeight:700, fontSize:15, cursor:"pointer"}}>Build paste block</button>
      </>}
      {block && <>
        <ol style={{fontSize:13, color:C.gray, margin:"12px 0 8px", paddingLeft:18, lineHeight:1.6}}>
          <li>Copy the block below.</li>
          <li>In Excel, tap cell <b style={{fontFamily:MONO}}>B{startRow}</b> and paste.</li>
          <li>Check the Class column says the right pot, then tap “Everything pasted”.</li>
        </ol>
        <textarea ref={ta} readOnly value={block} rows={5} onClick={()=>ta.current?.select()}
          style={{width:"100%", boxSizing:"border-box", padding:10, borderRadius:12, border:`1px solid ${C.line}`,
            fontFamily:MONO, fontSize:10, background:C.card}}/>
        <div style={{display:"flex", gap:8, marginTop:8}}>
          <button onClick={copy} style={{flex:1, padding:"12px 0", borderRadius:12, border:"none", background:C.green,
            color:"#fff", fontWeight:700, cursor:"pointer"}}>Copy block</button>
          <button onClick={clearExported} style={{flex:1, padding:"12px 0", borderRadius:12,
            border:`1.5px solid ${C.orange}`, background:C.orangeSoft, color:"#9A5B1F", fontWeight:700, cursor:"pointer"}}>
            Everything pasted — clear</button>
        </div>
      </>}
    </div>
  );
}

// ————— STATUS —————
function StatusTab({ kpi, setKpi, txns, say }) {
  const [paste, setPaste] = useState("");
  const load = () => {
    if (!paste.includes("KPI|")) { say("That doesn't look like the Dashboard status cell"); return; }
    const o = { savedAt: todayISO() };
    paste.slice(paste.indexOf("KPI|")+4).split("|").forEach((p)=>{ const [k,v]=p.split("="); if(k) o[k.trim()]=v; });
    setKpi(o); setPaste(""); say("Status updated");
  };
  // live view: subtract unexported captures from the pasted numbers
  const month = kpi?.month;
  const spent = (classes) => txns.filter(t=>t.date.slice(0,7)===month && t.type==="Expense" && classes.includes(CLASS_MAP[t.cat]))
    .reduce((s,t)=>s+t.amount,0);
  const sales = txns.filter(t=>t.date.slice(0,7)===month && t.cat==="Card Sales").reduce((s,t)=>s+t.amount,0);
  const catSpent = (name) => txns.filter(t=>t.date.slice(0,7)===month && t.type==="Expense" && t.cat===name)
    .reduce((s,t)=>s+t.amount,0);
  const cats = (kpi?.cats || "").split(";").filter(Boolean).map((s)=>{
    const i = s.lastIndexOf(":"); const [a,b] = s.slice(i+1).split("/");
    const name = s.slice(0,i);
    return { name, actual: N(a) + catSpent(name), budget: N(b) };
  });
  // categories you logged in the app that Excel doesn't know yet
  txns.filter(t=>t.date.slice(0,7)===month && t.type==="Expense"
      && !cats.some(c=>c.name===t.cat) && ["Needs","Wants"].includes(CLASS_MAP[t.cat]))
    .forEach(t=>{ let c = cats.find(x=>x.name===t.cat);
      if (!c) cats.push({ name:t.cat, actual:t.amount, budget:0 });
      else c.actual += t.amount; });
  const live = kpi ? {
    needsWants: N(kpi.needs||0)+N(kpi.wants||0) - spent(["Needs","Wants"]),
    fun: N(kpi.fun||0) - spent(["Hobby"]),
    bank: N(kpi.bankroll||0) - spent(["Flips"]) + sales,
  } : null;
  const Card = ({label, value, sub, tone}) => (
    <div style={{background: tone==="orange"?C.orangeSoft: tone==="green"?C.greenSoft:C.card, borderRadius:14,
      padding:"12px 14px", border:`1px solid ${C.line}`, flex:"1 1 45%", minWidth:140}}>
      <div style={{fontSize:10.5, letterSpacing:1.2, textTransform:"uppercase", color:C.gray}}>{label}</div>
      <div style={{fontFamily:MONO, fontSize:22, fontWeight:700, color: value<0?C.red:C.ink}}>{eur(value)}</div>
      {sub && <div style={{fontSize:11, color:C.gray}}>{sub}</div>}
    </div>);

  return (
    <div style={{padding:16}}>
      {kpi ? <>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline"}}>
          <div style={{fontSize:14, fontWeight:700}}>Month {kpi.month}</div>
          <div style={{fontSize:11, color:C.gray}}>from Excel on {uk(kpi.savedAt)}</div>
        </div>
        <div style={{display:"flex", flexWrap:"wrap", gap:10, marginTop:10}}>
          <Card label="Living budget left" value={live.needsWants} sub="needs + wants, minus unexported logs"/>
          <Card label="Fun cards left" value={live.fun} sub="Pokémon pot"/>
          <Card label="Flip bankroll" value={live.bank} sub="grows with every sale" tone="green"/>
          <Card label="Cash · end of month" value={N(kpi.cash||0)} sub="projected, real balance anchored" tone="orange"/>
          <Card label="Invest pot to deploy" value={N(kpi.invest||0)}/>
          {kpi.rate && <div style={{flex:"1 1 45%", minWidth:140, borderRadius:14, padding:"12px 14px",
            border:`1px dashed ${C.line}`}}>
            <div style={{fontSize:10.5, letterSpacing:1.2, textTransform:"uppercase", color:C.gray}}>Rate</div>
            <div style={{fontFamily:MONO, fontSize:18, fontWeight:700}}>1€ = {N(kpi.rate).toLocaleString("en-GB")}₫</div>
          </div>}
        </div>
        {cats.length>0 && <>
          <div style={{fontSize:11, color:C.gray, letterSpacing:1.5, textTransform:"uppercase", margin:"16px 0 6px"}}>By category — left this month</div>
          {cats.map((c)=>{ const left = c.budget - c.actual;
            const pct = c.budget>0 ? Math.min(c.actual/c.budget,1) : 1;
            return (
            <div key={c.name} style={{padding:"7px 0", borderBottom:`1px solid ${C.line}`}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline"}}>
                <div style={{fontSize:13}}>{c.name}</div>
                <div style={{fontFamily:MONO, fontSize:13, fontWeight:700, color: c.budget===0 ? C.orange : left<0 ? C.red : C.ink}}>
                  {c.budget===0 ? `−${eur(c.actual)} · no budget` : `${eur(left)} left`}</div>
              </div>
              {c.budget>0 && <div style={{height:4, borderRadius:99, background:C.line, marginTop:5}}>
                <div style={{height:4, borderRadius:99, width:`${pct*100}%`,
                  background: left<0 ? C.red : pct>0.85 ? C.orange : C.green}}/>
              </div>}
              <div style={{fontSize:10.5, color:C.gray, fontFamily:MONO, marginTop:3}}>
                {eur(c.actual)} of {eur(c.budget)}{c.budget>0?"":" budgeted"}</div>
            </div>);})}
        </>}
        <p style={{fontSize:12, color:C.gray, marginTop:12, lineHeight:1.5}}>
          The cards and category rows already subtract what you’ve logged here but not yet pasted into Excel — a true “can I afford this?” number.</p>
      </> : <p style={{fontSize:13, color:C.gray}}>No status yet. In Excel, scroll to the bottom of the Dashboard, copy the yellow <b>PHONE APP</b> cell, and paste it below.</p>}
      <textarea value={paste} onChange={(e)=>setPaste(e.target.value)} rows={2} placeholder="Paste the KPI|… cell here"
        style={{width:"100%", boxSizing:"border-box", marginTop:12, padding:10, borderRadius:12,
          border:"1px solid #EBD9A0", background:C.yellow, fontFamily:MONO, fontSize:12}}/>
      <button onClick={load} style={{width:"100%", marginTop:8, padding:"12px 0", borderRadius:12, border:"none",
        background:C.navy, color:"#fff", fontWeight:700, fontSize:15, cursor:"pointer"}}>Update status</button>
    </div>
  );
}

// ————— SETTINGS —————
function SettingsTab({ rules, setRules, decimalComma, setDecimalComma, txns, setTxns, setKpi, say }) {
  const [kw, setKw] = useState(""); const [cat, setCat] = useState(EXPENSE_CATS[0]);
  return (
    <div style={{padding:16}}>
      <div style={{fontSize:14, fontWeight:700}}>CSV auto-categorize rules</div>
      <p style={{fontSize:12, color:C.gray, margin:"4px 0 10px"}}>If the bank text contains the keyword, the row gets the category. First match wins.</p>
      {rules.map(([k,c],i)=>(
        <div key={i} style={{display:"flex", alignItems:"center", gap:8, padding:"6px 0", borderBottom:`1px solid ${C.line}`}}>
          <span style={{fontFamily:MONO, fontSize:13, flex:1}}>{k}</span>
          <span style={{fontSize:13, color:C.gray}}>→ {c}</span>
          <button onClick={()=>setRules(rules.filter((_,j)=>j!==i))} style={{border:"none", background:"none", color:C.red, cursor:"pointer"}}>×</button>
        </div>))}
      <div style={{display:"flex", gap:8, marginTop:10}}>
        <input value={kw} onChange={(e)=>setKw(e.target.value)} placeholder="KEYWORD"
          style={{flex:1, padding:"9px 10px", borderRadius:10, border:"1px solid #EBD9A0", background:C.yellow, fontFamily:MONO, fontSize:13}}/>
        <select value={cat} onChange={(e)=>setCat(e.target.value)} style={{padding:"9px 6px", borderRadius:10, border:`1px solid ${C.line}`, fontSize:13, maxWidth:140}}>
          {[...EXPENSE_CATS, ...INCOME_CATS].map(c=><option key={c}>{c}</option>)}
        </select>
        <button onClick={()=>{ if(!kw.trim()) return; setRules([...rules,[kw.trim().toUpperCase(),cat]]); setKw(""); say("Rule added"); }}
          style={{padding:"0 14px", borderRadius:10, border:"none", background:C.navy, color:"#fff", fontWeight:700, cursor:"pointer"}}>Add</button>
      </div>

      <div style={{fontSize:14, fontWeight:700, marginTop:22}}>Excel decimals</div>
      <label style={{display:"flex", gap:8, alignItems:"center", marginTop:6, fontSize:13}}>
        <input type="checkbox" checked={decimalComma} onChange={(e)=>setDecimalComma(e.target.checked)}/>
        My Excel uses comma decimals (10,66) — matches your current setup
      </label>

      <div style={{fontSize:14, fontWeight:700, marginTop:22}}>iPhone install</div>
      <p style={{fontSize:12, color:C.gray, lineHeight:1.6, marginTop:4}}>
        Open this app in Safari, then Share → <b>Add to Home Screen</b> for a full-screen icon.
        Data is saved to this device's browser storage — it won't appear on other phones or in the Claude.ai version. Export to Excel to move it anywhere else.</p>

      <div style={{fontSize:14, fontWeight:700, marginTop:22, color:C.red}}>Reset</div>
      <button onClick={()=>{ setTxns([]); setKpi(null); say("All app data cleared"); }}
        style={{marginTop:6, padding:"10px 16px", borderRadius:10, border:`1.5px solid ${C.red}`, background:C.redSoft,
          color:C.red, fontWeight:700, cursor:"pointer"}}>Clear captured entries & status</button>
      <p style={{fontSize:11, color:C.gray, marginTop:6}}>Only clears the app — your Excel file is never touched.</p>

      <div style={{marginTop:22, padding:"10px 12px", borderRadius:12, background:C.card, border:`1px solid ${C.line}`, fontSize:12, color:C.gray, lineHeight:1.7}}>
        <b style={{color:C.ink}}>Color code — same as the spreadsheet:</b><br/>
        <span style={{background:C.yellow, padding:"1px 6px", borderRadius:4, color:C.yellowInk}}>yellow</span> you type it ·{" "}
        <span style={{color:C.green, fontWeight:700}}>green</span> money in / links ·{" "}
        <span style={{color:C.orange, fontWeight:700}}>orange</span> real cash ·{" "}
        <span style={{color:C.navy, fontWeight:700}}>navy</span> the system
      </div>
    </div>
  );
}


const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<PocketLedger />);
