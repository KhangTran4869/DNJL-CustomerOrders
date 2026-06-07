"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import "./style.css";
import {
  NODE_COLORS, NODE_STATUS_LABELS, FAILURE_SCENARIOS,
  DATASET_PRESETS, BLOCK_SIZE_OPTIONS, LATENCY_RANGE,
  generateDataset, calcExecTime,
  formatMoney, formatNum, sleep,
} from "./data.js";

// ── initial dataset (small) ───────────────────────────
const INIT = generateDataset(5, 7);

// ══════════════════════════════════════════════════════════════
export default function SimulatorPage() {

  // ── config ──────────────────────────────────────────────────
  const [numNodes,    setNumNodes]    = useState(3);
  const [speed,       setSpeed]       = useState(600);
  const [blockSize,   setBlockSize]   = useState(10);
  const [latencyMs,   setLatencyMs]   = useState(50);
  const [customers,   setCustomers]   = useState(INIT.customers);
  const [orders,      setOrders]      = useState(INIT.orders);
  const [presetIdx,   setPresetIdx]   = useState(0);
  const [activeTab,   setActiveTab]   = useState("sim");

  // ── runtime ──────────────────────────────────────────────────
  const [running,        setRunning]        = useState(false);
  const [done,           setDone]           = useState(false);
  const [results,        setResults]        = useState([]);
  const [log,            setLog]            = useState([]);
  const [nodeStates,     setNodeStates]     = useState([]);
  const [comparisons,    setComparisons]    = useState(0);
  const [matches,        setMatches]        = useState(0);
  const [blocksXferred,  setBlocksXferred]  = useState(0);
  const [netTimeMs,      setNetTimeMs]      = useState(0);
  const [failedNodes,    setFailedNodes]    = useState(0);
  const [lostData,       setLostData]       = useState(0);
  const [activeOuter,    setActiveOuter]    = useState(null);
  const [activeInner,    setActiveInner]    = useState(null);
  const [transferring,   setTransferring]   = useState(null);
  const [alertMsg,       setAlertMsg]       = useState(null);

  // ── chart state ──────────────────────────────────────────────
  const [chartLines,     setChartLines]     = useState([]);
  const [chartTooltip,   setChartTooltip]   = useState(null);
  const chartRef = useRef(null);

  const abortRef  = useRef(false);
  const failedRef = useRef(new Set());
  const logEndRef = useRef(null);

  // ── build chart data when tab opens or config changes ────────
  useEffect(() => {
    if (activeTab !== "chart") return;
    buildChartData();
  }, [activeTab, customers.length, orders.length, numNodes]);

  function buildChartData() {
    const lines = BLOCK_SIZE_OPTIONS.map(bs => ({
      blockSize: bs,
      points: LATENCY_RANGE.map(lat => ({
        lat,
        ms: calcExecTime(customers.length, orders.length, bs, lat, numNodes),
      })),
    }));
    setChartLines(lines);
  }

  // ── helpers ──────────────────────────────────────────────────
  const addLog = useCallback((msg, color = "#9c8679") => {
    const time = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLog(prev => [...prev, { msg, color, time }]);
  }, []);

  function distributeData() {
    const nodes = Array.from({ length: numNodes }, (_, i) => ({
      id: i, customers: [], orders: [], localResults: [], status: "idle", failed: false,
      blocksProcessed: 0,
    }));
    customers.forEach((c, i) => nodes[i % numNodes].customers.push(c));
    orders.forEach((o, i)    => nodes[i % numNodes].orders.push(o));
    return nodes;
  }

  function markNodeFailed(nodeId, nodes) {
    const lostC = nodes[nodeId]?.customers?.length ?? 0;
    const lostO = nodes[nodeId]?.orders?.length    ?? 0;
    const lost  = lostC + lostO;
    failedRef.current.add(nodeId);
    setFailedNodes(failedRef.current.size);
    setLostData(prev => prev + lost);
    setAlertMsg({ nodeId, lostC, lostO, lost });
    setNodeStates(prev => prev.map((n, i) => i === nodeId ? { ...n, status: "failed", failed: true } : n));
    addLog(`COORDINATOR: mất kết nối Node ${nodeId}!`, "#f91b02ff");
    addLog(`Node ${nodeId}: CRASHED — ${lost} records bị mất`, "#f91b02ff");
  }

  function handleKillNode(nodeId) {
    if (!running || failedRef.current.has(nodeId)) return;
    markNodeFailed(nodeId, nodeStates);
  }

  function scheduleScenario(scenario, nodes) {
    const target = scenario.nodeIndex === -1 ? nodes.length - 1 : scenario.nodeIndex;
    sleep(scenario.delayMs).then(() => {
      if (abortRef.current) return;
      markNodeFailed(target, nodes);
    });
    if (scenario.cascade) {
      sleep(scenario.cascade.delayMs).then(() => {
        if (abortRef.current) return;
        markNodeFailed(scenario.cascade.nodeIndex, nodes);
      });
    }
  }

  // ── apply dataset preset ─────────────────────────────────────
  function applyPreset(idx) {
    if (running) return;
    const p = DATASET_PRESETS[idx];
    const d = generateDataset(p.customers, p.orders);
    setCustomers(d.customers);
    setOrders(d.orders);
    setPresetIdx(idx);
    resetSim(false);
  }

  // ════════════════════════════════════════════════════════════
  //  PAGE-ORIENTED NLJ SIMULATION
  // ════════════════════════════════════════════════════════════
  async function runSimulation() {
    if (running) return;
    setRunning(true);
    setDone(false);
    setResults([]);
    setLog([]);
    setComparisons(0);
    setMatches(0);
    setBlocksXferred(0);
    setNetTimeMs(0);
    setFailedNodes(0);
    setLostData(0);
    setActiveOuter(null);
    setActiveInner(null);
    setTransferring(null);
    setAlertMsg(null);
    abortRef.current  = false;
    failedRef.current = new Set();

    const nodes = distributeData();
    setNodeStates(nodes.map(n => ({ ...n })));

    // ─ Phase 1: distribute ──────────────────────────────────
    addLog("PHÂN TÁN DỮ LIỆU THEO NODE ", "#f7b685ff");
    for (let i = 0; i < nodes.length; i++) {
      const color = NODE_COLORS[i % NODE_COLORS.length];
      addLog(`Node ${i}: ${nodes[i].customers.length} customers, ${nodes[i].orders.length} orders`, color);
      setNodeStates(prev => prev.map((n, idx) => idx === i ? { ...n, status: "receiving" } : n));
      await sleep(speed * 0.5);
      if (abortRef.current) { setRunning(false); return; }
    }

    // ─ Phase 2: Page-Oriented NLJ ───────────────────────────
    addLog(`PAGE-ORIENTED NLJ  [block=${blockSize}, latency=${latencyMs}ms]`, "#f4b688ff");
    await sleep(speed * 0.6);
    if (abortRef.current) { setRunning(false); return; }

    const allOrders  = nodes.flatMap(n => n.orders);
    const allResults = [];
    let totalComparisons = 0;
    let totalMatches     = 0;
    let totalBlocks      = 0;
    let totalNetMs       = 0;

    for (let ni = 0; ni < nodes.length; ni++) {
      if (failedRef.current.has(ni)) {
        addLog(`Node ${ni} đã lỗi — bỏ qua`, "#ff0000ff"); continue;
      }
      if (nodes[ni].customers.length === 0) continue;

      const color = NODE_COLORS[ni % NODE_COLORS.length];
      addLog(`── Node ${ni}: outer loop — ${nodes[ni].customers.length} customers, block=${blockSize}`, color);
      setNodeStates(prev => prev.map((n, idx) => idx === ni ? { ...n, status: "joining" } : n));
      await sleep(speed * 0.3);
      if (abortRef.current) { setRunning(false); return; }

      // Ship inner relation in blocks from other nodes
      for (let srcNi = 0; srcNi < nodes.length; srcNi++) {
        if (srcNi === ni || failedRef.current.has(srcNi)) continue;
        const srcOrders = nodes[srcNi].orders;
        if (srcOrders.length === 0) continue;

        const numBlocks = Math.ceil(srcOrders.length / blockSize);
        addLog(`- Node ${srcNi}→${ni}: ship ${srcOrders.length} orders trong ${numBlocks} blocks`, "#e8af55ff");

        for (let blk = 0; blk < numBlocks; blk++) {
          if (failedRef.current.has(srcNi) || failedRef.current.has(ni)) break;
          const blockStart = blk * blockSize;
          const blockEnd   = Math.min(blockStart + blockSize, srcOrders.length);
          const blockCount = blockEnd - blockStart;

          setTransferring({ from: srcNi, to: ni, data: `Block ${blk+1}/${numBlocks} (${blockCount} orders)` });
          totalBlocks++;
          totalNetMs += latencyMs;
          setBlocksXferred(totalBlocks);
          setNetTimeMs(Math.round(totalNetMs));

          await sleep(speed * 0.25);
          if (abortRef.current) { setRunning(false); return; }
          setTransferring(null);
        }
      }

      // Outer loop: iterate customers in blocks
      const outerBlocks = Math.ceil(nodes[ni].customers.length / blockSize);
      for (let oblk = 0; oblk < outerBlocks; oblk++) {
        if (failedRef.current.has(ni)) {
          addLog(`- Node ${ni} crash giữa chừng`, "#ff0000ff"); break;
        }

        const oStart = oblk * blockSize;
        const oEnd   = Math.min(oStart + blockSize, nodes[ni].customers.length);
        const outerBlock = nodes[ni].customers.slice(oStart, oEnd);

        setActiveOuter({ nodeId: ni, block: oblk, size: outerBlock.length });
        addLog(`  [Node ${ni}] outer block ${oblk+1}/${outerBlocks}: ${outerBlock.length} customers`, color);

        // Inner loop: iterate all orders in blocks
        const availOrders = allOrders.filter(o => {
          const owner = nodes.findIndex(n => n.orders.includes(o));
          return !failedRef.current.has(owner);
        });
        const innerBlocks = Math.ceil(availOrders.length / blockSize);

        for (let iblk = 0; iblk < innerBlocks; iblk++) {
          const iStart = iblk * blockSize;
          const iEnd   = Math.min(iStart + blockSize, availOrders.length);
          const innerBlock = availOrders.slice(iStart, iEnd);
          setActiveInner({ block: iblk, size: innerBlock.length });

          // Compare each outer × inner within block
          for (const cust of outerBlock) {
            for (const ord of innerBlock) {
              totalComparisons++;
              setComparisons(totalComparisons);

              if (cust.customer_id === ord.customer_id) {
                totalMatches++;
                setMatches(totalMatches);
                const row = { ...cust, ...ord };
                allResults.push(row);
                setResults([...allResults]);
                setNodeStates(prev => prev.map((n, idx) =>
                  idx === ni ? { ...n, localResults: [...n.localResults, row] } : n
                ));
              }
            }
          }

          // Update block counter on node
          setNodeStates(prev => prev.map((n, idx) =>
            idx === ni ? { ...n, blocksProcessed: (n.blocksProcessed || 0) + 1 } : n
          ));

          await sleep(speed * 0.18);
          if (abortRef.current) { setRunning(false); return; }
        }
      }

      if (!failedRef.current.has(ni)) {
        setNodeStates(prev => prev.map((n, idx) => idx === ni ? { ...n, status: "done" } : n));
        addLog(`── Node ${ni}: xong — ${nodes[ni].localResults?.length ?? 0} hits`, color);
      }
    }

    // ─ Phase 3: gather ───────────────────────────────────────
    addLog("GATHER — THU KẾT QUẢ VỀ COORDINATOR", "#ffab6bff");
    for (let ni = 1; ni < nodes.length; ni++) {
      if (failedRef.current.has(ni)) continue;
      setTransferring({ from: ni, to: 0, data: "results" });
      totalBlocks++;
      totalNetMs += latencyMs;
      setBlocksXferred(totalBlocks);
      setNetTimeMs(Math.round(totalNetMs));
      await sleep(speed * 0.4);
      if (abortRef.current) { setRunning(false); return; }
      setTransferring(null);
    }

    setActiveOuter(null);
    setActiveInner(null);
    setResults([...allResults]);

    const partial = failedRef.current.size > 0;
    addLog(
      `${partial ? "PARTIAL" : "HOÀN THÀNH"}: ${totalMatches} kết quả / ${totalComparisons} so sánh / ${totalBlocks} blocks`,
      partial ? "#e3a70fff" : "#00ff5eff",
    );
    addLog(`    Network time: ${Math.round(totalNetMs)}ms  (${totalBlocks} packets × ${latencyMs}ms)`, "#e07638ff");
    setRunning(false);
    setDone(true);
  }

  // ── reset ────────────────────────────────────────────────────
  function resetSim(keepData = true) {
    abortRef.current = true;
    setRunning(false); setDone(false);
    setResults([]); setLog([]);
    setComparisons(0); setMatches(0);
    setBlocksXferred(0); setNetTimeMs(0);
    setFailedNodes(0); setLostData(0);
    setActiveOuter(null); setActiveInner(null);
    setTransferring(null); setNodeStates([]);
    setAlertMsg(null);
    failedRef.current = new Set();
    if (!keepData) { setPresetIdx(0); }
  }

  const displayNodes = nodeStates.length > 0
    ? nodeStates
    : Array.from({ length: numNodes }, (_, i) => ({
        id: i, customers: [], orders: [], localResults: [], status: "idle", failed: false, blocksProcessed: 0,
      }));

  const isLargeDataset = customers.length > 50;

  // ════════════════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════════════════
  return (
    <div className="sim-root">

      {/* ── HEADER ── */}
      <header className="sim-header">
        <div className="sim-header__title">
          <h1>Distributed Nested Loop Join Simulator</h1>
          <p>Customer – Orders </p>
        </div>
        <div className="sim-header__stats">
          <StatChip label="Comparisons" value={formatNum(comparisons)} color="#c59d5f" />
          <StatChip label="Matches"     value={formatNum(matches)}     color="#0ac24eff" />
          <StatChip label="Blocks"      value={formatNum(blocksXferred)} color="#da9159ff" />
          <StatChip label="Net Time"    value={`${netTimeMs}ms`}       color="#d5aa91ff" />
          {failedNodes > 0 && <StatChip label="Failed" value={failedNodes} color="#db1e09ff" />}
        </div>
      </header>

      {/* ── ALERT ── */}
      {alertMsg && (
        <div className="sim-alert">
          <div>
            <div className="sim-alert__main">
              <strong>{alertMsg.lost} records</strong> bị mất do Node {alertMsg.nodeId} crash.
            </div>
            <div className="sim-alert__sub">
              Kết quả chưa đầy đủ — cần fault-tolerance để phục hồi.
            </div>
          </div>
        </div>
      )}

      {/* ── TABS ── */}
      <div className="sim-tabs">
        <button className={`sim-tab${activeTab === "sim" ? " active" : ""}`} onClick={() => setActiveTab("sim")}>
          Simulation
        </button>
        <button className={`sim-tab${activeTab === "chart" ? " active" : ""}`} onClick={() => { setActiveTab("chart"); buildChartData(); }}>
          Execution Time vs Latency
        </button>
      </div>

      {/* ════════════════════════════════════════
          TAB: SIMULATION
      ════════════════════════════════════════ */}
      {activeTab === "sim" && (
        <div className="sim-body">

          {/* ─── SIDEBAR ─── */}
          <aside className="sim-sidebar">

            {/* Dataset */}
            <div className="sim-section">
              <p className="sim-section__title">Dataset</p>
              <p className="cfg-label">Preset dữ liệu</p>
              <div className="cfg-preset-row">
                {DATASET_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    className={`btn-preset${presetIdx === idx ? " active" : ""}`}
                    disabled={running}
                    onClick={() => applyPreset(idx)}
                  >
                    <div style={{ fontWeight: 700 }}>{p.label}</div>
                    <div style={{ fontSize: 9, opacity: 0.8 }}>{formatNum(p.customers)}C · {formatNum(p.orders)}O</div>
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: "var(--lz-text-muted)", fontFamily: "var(--lz-mono)" }}>
                Hiện tại: <strong style={{ color: "var(--lz-mocha)" }}>{formatNum(customers.length)}</strong> customers ×{" "}
                <strong style={{ color: "var(--lz-mocha)" }}>{formatNum(orders.length)}</strong> orders
                = {formatNum(customers.length * orders.length)} so sánh
              </div>
            </div>

            {/* Config */}
            <div className="sim-section">
              <p className="sim-section__title">Cấu hình</p>

              <p className="cfg-label">Số node: {numNodes}</p>
              <input type="range" min={2} max={5} value={numNodes}
                onChange={e => { if (!running) setNumNodes(+e.target.value); }}
                className="cfg-range" />
              <div className="cfg-nodes-row">
                {Array.from({ length: numNodes }, (_, i) => <NodeBadge key={i} index={i} />)}
              </div>

              <p className="cfg-label mt-3">
                Block Size: <span className="cfg-latency-val">{blockSize}</span> rows/block
              </p>
              <div className="cfg-block-row">
                {BLOCK_SIZE_OPTIONS.map(bs => (
                  <button key={bs} className={`btn-block${blockSize === bs ? " active" : ""}`}
                    disabled={running} onClick={() => setBlockSize(bs)}>{bs}</button>
                ))}
              </div>

              <p className="cfg-label mt-3">
                Network Latency: <span className="cfg-latency-val">{latencyMs}ms</span>
              </p>
              <input type="range" min={1} max={200} value={latencyMs}
                onChange={e => setLatencyMs(+e.target.value)}
                className="cfg-range" />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--lz-text-muted)", fontFamily: "var(--lz-mono)" }}>
                <span>1ms</span><span>100ms</span><span>200ms</span>
              </div>

              <p className="cfg-label mt-3">Tốc độ animation</p>
              <div className="cfg-speed-row">
                {[["Chậm", 1200], ["Vừa", 600], ["Nhanh", 250], ["Turbo", 60]].map(([lbl, ms]) => (
                  <button key={ms} className={`btn-speed${speed === ms ? " active" : ""}`}
                    onClick={() => setSpeed(ms)}>{lbl}</button>
                ))}
              </div>
            </div>

            {/* Failures */}
            <div className="sim-section">
              <p className="sim-section__title">Kịch bản lỗi</p>
              <div className="scenario-list">
                {FAILURE_SCENARIOS.map(sc => (
                  <button key={sc.id} className="btn-scenario" disabled={!running}
                    onClick={() => scheduleScenario(sc, nodeStates.length ? nodeStates : distributeData())}>
                    <div className="btn-scenario__name">{sc.label}</div>
                    <div className="btn-scenario__desc">{sc.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Tables */}
            <div className="sim-section">
              <p className="sim-section__title">Customers</p>
              {isLargeDataset ? (
                <div className="mini-table-notice">
                  <strong>{formatNum(customers.length)}</strong> rows — quá lớn để hiển thị<br />
                  <span style={{ fontSize: 10 }}>Dùng preset nhỏ để xem từng tuple</span>
                </div>
              ) : (
                <>
                  <MiniTable data={customers}
                    cols={[{ key: "customer_id", label: "ID", width: 28 }, { key: "name", label: "Tên" }, { key: "city", label: "TP" }]}
                    highlightKey="customer_id"
                    highlightVal={activeOuter?.nodeId !== undefined ? null : null}
                  />
                  <button className="btn-add mt-2" disabled={running} onClick={() => {
                    const id = Math.max(...customers.map(c => c.customer_id)) + 1;
                    setCustomers(p => [...p, { customer_id: id, name: `Khách ${id}`, city: "HN" }]);
                  }}>+ Thêm khách hàng</button>
                </>
              )}
            </div>

            <div className="sim-section">
              <p className="sim-section__title">Orders</p>
              {isLargeDataset ? (
                <div className="mini-table-notice">
                  <strong>{formatNum(orders.length)}</strong> rows — quá lớn để hiển thị
                </div>
              ) : (
                <>
                  <MiniTable data={orders}
                    cols={[{ key: "order_id", label: "ID", width: 28 }, { key: "customer_id", label: "CID", width: 28 }, { key: "product", label: "Sản phẩm" }]}
                    highlightKey="order_id" highlightVal={null}
                  />
                  <button className="btn-add mt-2" disabled={running} onClick={() => {
                    const id  = Math.max(...orders.map(o => o.order_id)) + 1;
                    const cid = customers[Math.floor(Math.random() * customers.length)].customer_id;
                    setOrders(p => [...p, { order_id: id, customer_id: cid, product: "Nước hoa mới", amount: 1_000_000 }]);
                  }}>+ Thêm đơn hàng</button>
                </>
              )}
            </div>
          </aside>

          {/* ─── MAIN ─── */}
          <main className="sim-main">

            {/* Topology */}
            <div className="sim-topology">
              <div className="sim-topology__bar">
                <span className="sim-topology__label">Topology · Page-Oriented NLJ</span>
                <div className="sim-topology__actions">
                  <button className="btn-run" onClick={runSimulation} disabled={running || done}>
                    {running ? "Đang chạy..." : "Chạy Simulation"}
                  </button>
                  <button className="btn-reset" onClick={() => resetSim()}>Reset</button>
                </div>
              </div>

              {/* Block + latency summary */}
              <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
                <InfoPill label="Block Size" value={`${blockSize} rows`} color="var(--lz-gold)" />
                <InfoPill label="Latency/packet" value={`${latencyMs}ms`} color="var(--lz-mocha)" />
                <InfoPill label="Est. packets" value={formatNum(Math.ceil(orders.length / blockSize) * (numNodes - 1) * 2)} color="var(--lz-taupe)" />
                <InfoPill label="Est. net time" value={`${formatNum(calcExecTime(customers.length, orders.length, blockSize, latencyMs, numNodes))}ms`} color="var(--lz-success)" />
              </div>

              <div className="node-cards-row">
                {displayNodes.map((node, i) => (
                  <NodeCard key={i} node={node} colorIndex={i}
                    isActive={activeOuter?.nodeId === i}
                    isTransfer={transferring?.from === i || transferring?.to === i}
                    transferData={transferring && (transferring.from === i || transferring.to === i) ? transferring.data : null}
                    isSrc={transferring?.from === i}
                    running={running}
                    onKill={() => handleKillNode(i)}
                  />
                ))}
              </div>

              {transferring && (
                <div className="transfer-strip">
                  <span style={{ color: NODE_COLORS[transferring.from % NODE_COLORS.length] }}>Node {transferring.from}</span>
                  <span>──</span>
                  <span style={{ color: NODE_COLORS[transferring.to   % NODE_COLORS.length] }}>Node {transferring.to}</span>
                  <span style={{ marginLeft: 6, color: "var(--lz-taupe)" }}>{transferring.data}</span>
                  <span className="transfer-detail">+{latencyMs}ms</span>
                </div>
              )}

              {activeOuter && (
                <div style={{ marginTop: 6, fontSize: 11, fontFamily: "var(--lz-mono)", color: "var(--lz-taupe)" }}>
                  Outer Block {activeOuter.block + 1} · {activeOuter.size} rows
                  {activeInner && <span>  ×  Inner Block {activeInner.block + 1} · {activeInner.size} rows</span>}
                </div>
              )}
            </div>

            {/* Results + Log */}
            <div className="sim-bottom">
              <div className="sim-results">
                <p className="panel-title">Kết quả JOIN ({formatNum(results.length)})</p>

                {results.length === 0 && !running && !done && (
                  <div className="result-empty">Nhấn <em>Chạy Simulation</em><br />để xem kết quả</div>
                )}

                {isLargeDataset && results.length > 0 && (
                  <div className="result-large-notice">
                    Hiển thị <strong>20</strong> / <strong>{formatNum(results.length)}</strong> kết quả
                  </div>
                )}

                {(isLargeDataset ? results.slice(0, 20) : results).map((row, i) => (
                  <div key={i} className="result-card">
                    <div className="result-card__top">
                      <span className="result-card__order-id">#{row.order_id}</span>
                      <span className="result-card__amount">{formatMoney(row.amount)}</span>
                    </div>
                    <div className="result-card__product">{row.product}</div>
                    <div className="result-card__meta">{row.name} · {row.city} · CID={row.customer_id}</div>
                  </div>
                ))}

                {done && lostData > 0 && (
                  <div className="result-lostdata">
                        <strong>{lostData} records</strong> bị mất do node crash.<br />
                    <span className="result-lostdata__sub">
                      Kết quả trên chưa đầy đủ — cần fault-tolerance để phục hồi.
                    </span>
                  </div>
                )}
              </div>

              <div className="sim-log">
                <p className="panel-title">Execution Log</p>
                {log.map((e, i) => (
                  <div key={i} className="log-entry">
                    <span className="log-entry__time">{e.time}</span>
                    <span style={{ color: e.color }}>{e.msg}</span>
                  </div>
                ))}
                <div ref={logEndRef} />
                {done && (
                  <div className="log-done-box">
                    Simulation hoàn thành<br />
                    <span style={{ color: "#9c8679", fontSize: 11 }}>
                      {formatNum(comparisons)} so sánh · {formatNum(matches)} kết quả · {formatNum(blocksXferred)} blocks · {netTimeMs}ms net
                    </span>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      )}

      {/* ════════════════════════════════════════
          TAB: CHART
      ════════════════════════════════════════ */}
      {activeTab === "chart" && (
        <div style={{ padding: "24px 28px" }}>
          <ChartPanel
            lines={chartLines}
            customers={customers.length}
            orders={orders.length}
            numNodes={numNodes}
          />
        </div>
      )}

      {/* ── THEORY ── */}
      <div className="sim-theory">
        <TheoryCard
          title="Page-Oriented NLJ"
          body={`Thay vì so sánh từng tuple, gom thành block ${blockSize} rows. Mỗi lần truyền 1 block qua mạng → giảm số packet từ |R|×|S| xuống ⌈|R|/B⌉×⌈|S|/B⌉.`}
          code={"FOR each block Br IN R:\n  FOR each block Bs IN S:\n    FOR r IN Br, s IN Bs:\n      IF r.id == s.id:\n        OUTPUT (r ⋈ s)"}
        />
        <TheoryCard
          title="Network Cost"
          body={`Số packet = ⌈|S|/B⌉ × (k-1)  [ship inner]\nMỗi packet chịu latency ${latencyMs}ms.\nTổng network time = packets × latency.`}
          code={`|R|=${formatNum(customers.length)}, |S|=${formatNum(orders.length)}, B=${blockSize}\nPackets = ⌈${formatNum(orders.length)}/${blockSize}⌉ × ${numNodes-1}\n       = ${formatNum(Math.ceil(orders.length/blockSize) * (numNodes-1))}\nNet time = ${formatNum(Math.ceil(orders.length/blockSize)*(numNodes-1))}×${latencyMs}ms`}
        />
        <TheoryCard
          title="Block Size Trade-off"
          body="Block nhỏ → nhiều packet → network overhead cao. Block lớn → ít packet nhưng tốn memory. Điểm tối ưu phụ thuộc latency và RAM của từng node."
          code={"B=1  → max packets, min mem\nB=10 → balanced\nB=100→ min packets, max mem\nOptimal: B = √(M × |S|)"}
        />
        <TheoryCard
          title="Fault Tolerance"
          body="Node crash → mất phân mảnh Rᵢ. Kết quả PARTIAL. Giải pháp: replication (sao lưu dữ liệu), checkpoint (lưu trạng thái), hoặc saga pattern."
          code={"Node fail → missing Rᵢ\nResult: PARTIAL JOIN\nFix: replication\n     checkpoint\n     saga pattern"}
        />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  CHART COMPONENT — vẽ Execution Time vs Network Latency
// ══════════════════════════════════════════════════════════════
const LINE_COLORS = ["#b38a6a", "#c59d5f", "#8c6a4f", "#9c8679", "#a47c4b", "#6b4e39"];

function ChartPanel({ lines, customers, orders, numNodes }) {
  const canvasRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    if (!canvasRef.current || lines.length === 0) return;
    drawChart();
  }, [lines]);

  function drawChart() {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    const W = canvas.width  = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;

    const PAD = { top: 20, right: 20, bottom: 36, left: 70 };
    const cW = W - PAD.left - PAD.right;
    const cH = H - PAD.top  - PAD.bottom;

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = "#f3ede6";
    ctx.fillRect(0, 0, W, H);

    if (lines.length === 0) return;

    const allMs = lines.flatMap(l => l.points.map(p => p.ms));
    const maxMs = Math.max(...allMs) * 1.08;
    const minMs = 0;
    const lats  = lines[0].points.map(p => p.lat);

    // Grid lines
    const yTicks = 5;
    ctx.strokeStyle = "#e8ddd4";
    ctx.lineWidth   = 1;
    ctx.setLineDash([3, 4]);
    for (let t = 0; t <= yTicks; t++) {
      const y = PAD.top + cH - (t / yTicks) * cH;
      ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + cW, y); ctx.stroke();
      const val = Math.round((t / yTicks) * maxMs);
      ctx.fillStyle = "#9c8679"; ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.textAlign = "right"; ctx.fillText(val >= 1000 ? (val/1000).toFixed(1)+"k" : val, PAD.left - 6, y + 4);
    }
    ctx.setLineDash([]);

    // X axis ticks
    lats.forEach((lat, i) => {
      const x = PAD.left + (i / (lats.length - 1)) * cW;
      ctx.strokeStyle = "#e8ddd4"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, PAD.top); ctx.lineTo(x, PAD.top + cH); ctx.stroke();
      ctx.fillStyle = "#9c8679"; ctx.font = "9px 'JetBrains Mono', monospace";
      ctx.textAlign = "center"; ctx.fillText(lat + "ms", x, PAD.top + cH + 16);
    });

    // Axes
    ctx.strokeStyle = "#c8b8a8"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(PAD.left, PAD.top); ctx.lineTo(PAD.left, PAD.top + cH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(PAD.left, PAD.top + cH); ctx.lineTo(PAD.left + cW, PAD.top + cH); ctx.stroke();

    // Lines
    lines.forEach((line, li) => {
      const color = LINE_COLORS[li % LINE_COLORS.length];
      ctx.strokeStyle = color; ctx.lineWidth = 2.2;
      ctx.beginPath();
      line.points.forEach((pt, i) => {
        const x = PAD.left + (i / (line.points.length - 1)) * cW;
        const y = PAD.top  + cH - ((pt.ms - minMs) / (maxMs - minMs)) * cH;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Dots
      line.points.forEach((pt, i) => {
        const x = PAD.left + (i / (line.points.length - 1)) * cW;
        const y = PAD.top  + cH - ((pt.ms - minMs) / (maxMs - minMs)) * cH;
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill();
      });
    });
  }

  function handleMouseMove(e) {
    const rect   = canvasRef.current.getBoundingClientRect();
    const mx     = e.clientX - rect.left;
    const W      = rect.width;
    const PAD_L  = 70;
    const cW     = W - PAD_L - 20;
    if (!lines.length) return;
    const lats   = lines[0].points.map(p => p.lat);
    const idx    = Math.round(((mx - PAD_L) / cW) * (lats.length - 1));
    if (idx < 0 || idx >= lats.length) { setTooltip(null); return; }
    setTooltip({ x: mx, y: e.clientY - rect.top, lat: lats[idx], points: lines.map(l => ({ bs: l.blockSize, ms: l.points[idx].ms })) });
  }

  return (
    <div>
      <div className="chart-header">
        <div>
          <div className="chart-header__title">Execution Time vs Network Latency</div>
          <div className="chart-header__sub">
            Dataset: {formatNum(customers)} customers × {formatNum(orders)} orders · {numNodes} nodes · Mỗi đường = 1 Block Size
          </div>
        </div>
        <div className="chart-legend">
          {BLOCK_SIZE_OPTIONS.map((bs, i) => (
            <div key={bs} className="chart-legend-item">
              <span className="chart-legend-dot" style={{ background: LINE_COLORS[i % LINE_COLORS.length] }} />
              B={bs}
            </div>
          ))}
        </div>
      </div>

      <div className="chart-wrap" onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip(null)}>
        <canvas ref={canvasRef} className="chart-canvas" style={{ width: "100%", height: "100%" }} />

        {tooltip && (
          <div className="chart-tooltip" style={{ left: tooltip.x + 12, top: Math.max(8, tooltip.y - 40) }}>
            <div style={{ color: "var(--lz-gold)", marginBottom: 4, fontWeight: 700 }}>Latency: {tooltip.lat}ms</div>
            {tooltip.points.map((pt, i) => (
              <div key={i} style={{ color: LINE_COLORS[i % LINE_COLORS.length] }}>
                B={pt.bs}: {pt.ms >= 1000 ? (pt.ms/1000).toFixed(1)+"s" : pt.ms+"ms"}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="chart-xlabel">Network Latency per Packet (ms)</div>

      {/* Insight table */}
      <div style={{ marginTop: 20, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--lz-mono)", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "var(--lz-bg-dark)", color: "var(--lz-taupe)" }}>
              <th style={th}>Block Size</th>
              {LATENCY_RANGE.filter((_, i) => i % 2 === 0).map(lat => (
                <th key={lat} style={th}>{lat}ms</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((line, li) => (
              <tr key={li} style={{ background: li % 2 === 0 ? "var(--lz-bg-panel)" : "var(--lz-bg-card)" }}>
                <td style={{ ...td, color: LINE_COLORS[li % LINE_COLORS.length], fontWeight: 700 }}>B = {line.blockSize}</td>
                {line.points.filter((_, i) => i % 2 === 0).map((pt, i) => (
                  <td key={i} style={td}>
                    {pt.ms >= 1000 ? (pt.ms/1000).toFixed(1)+"s" : pt.ms+"ms"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th = { padding: "6px 12px", textAlign: "right", fontSize: 11, letterSpacing: 1, fontWeight: 700, borderRight: "1px solid #3a2a1a" };
const td = { padding: "5px 12px", textAlign: "right", fontSize: 11, color: "var(--lz-text-sub)", borderRight: "1px solid var(--lz-border)" };

// ══════════════════════════════════════════════════════════════
//  Sub-components
// ══════════════════════════════════════════════════════════════
function StatChip({ label, value, color }) {
  return (
    <div className="stat-chip">
      <div className="stat-chip__value" style={{ color }}>{value}</div>
      <div className="stat-chip__label">{label}</div>
    </div>
  );
}

function NodeBadge({ index }) {
  const color = NODE_COLORS[index % NODE_COLORS.length];
  return (
    <span className="node-badge" style={{ background: color + "22", color }}>
      <span className="node-badge__dot" style={{ background: color }} />
      Node {index}
    </span>
  );
}

function InfoPill({ label, value, color }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: "var(--lz-bg-panel)", border: "1px solid var(--lz-border)",
      borderRadius: 6, padding: "4px 10px", fontSize: 11,
    }}>
      <span style={{ color: "var(--lz-text-muted)", fontSize: 10 }}>{label}</span>
      <span style={{ color, fontFamily: "var(--lz-mono)", fontWeight: 700 }}>{value}</span>
    </div>
  );
}

function NodeCard({ node, colorIndex, isActive, isTransfer, isSrc, transferData, running, onKill }) {
  const color  = NODE_COLORS[colorIndex % NODE_COLORS.length];
  const status = node.status || "idle";
  let cls = "node-card";
  if (node.failed) cls += " is-failed";
  else if (isActive) cls += " is-active";
  else if (isTransfer) cls += " is-transfer";

  return (
    <div className={cls}>
      <div className="node-card__header">
        <span className="node-badge" style={{ background: color + "22", color }}>
          <span className="node-badge__dot" style={{ background: node.failed ? "#c0392b" : color }} />
          {node.failed ? "Failed " : ""}Node {node.id}
        </span>
        <span className={`node-status node-status--${status}`}>{NODE_STATUS_LABELS[status] || "IDLE"}</span>
      </div>
      <div className="node-metrics">
        <div className="node-metric">
          <div className="node-metric__val" style={{ color }}>{node.customers.length}</div>
          <div className="node-metric__lbl">Cust.</div>
        </div>
        <div className="node-metric">
          <div className="node-metric__val" style={{ color: "#9c8679" }}>{node.orders.length}</div>
          <div className="node-metric__lbl">Orders</div>
        </div>
        <div className="node-metric">
          <div className="node-metric__val" style={{ color: "#3a7c52" }}>{node.localResults?.length ?? 0}</div>
          <div className="node-metric__lbl">Hits</div>
        </div>
      </div>
      {node.blocksProcessed > 0 && (
        <div className="node-block-info">Blocks: {node.blocksProcessed}</div>
      )}
      {running && !node.failed && (
        <button className="btn-kill" onClick={onKill}>Kill Node {node.id}</button>
      )}
      {isTransfer && transferData && (
        <div style={{ marginTop: 5, fontSize: 9, color: "#b8860b", textAlign: "center", fontFamily: "var(--lz-mono)" }}>
          {isSrc ? "↑ SEND" : "↓ RECV"} {transferData}
        </div>
      )}
    </div>
  );
}

function MiniTable({ data, cols, highlightKey, highlightVal }) {
  return (
    <div className="mini-table">
      <div className="mini-table__head">
        {cols.map(c => (
          <div key={c.key} className="mini-table__th" style={{ flex: c.width ? `0 0 ${c.width}px` : 1 }}>{c.label}</div>
        ))}
      </div>
      {data.map(row => {
        const hl = highlightVal !== undefined && row[highlightKey] === highlightVal;
        return (
          <div key={row[cols[0].key]} className={`mini-table__row${hl ? " highlighted" : ""}`}>
            {cols.map(c => (
              <div key={c.key} className="mini-table__cell" style={{ flex: c.width ? `0 0 ${c.width}px` : 1 }}>
                {String(row[c.key])}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function TheoryCard({ title, body, code }) {
  return (
    <div className="theory-card">
      <h4 className="theory-card__title">{title}</h4>
      <p className="theory-card__body">{body}</p>
      <pre className="theory-card__code">{code}</pre>
    </div>
  );
}
