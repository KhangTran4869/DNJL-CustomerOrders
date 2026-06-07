// ── Brand palette (laluz mocha) ──────────────────────────────
export const NODE_COLORS = [
  "#d3a079ff",
  "#bd8f69ff",
  "#e1b26cff",
  "#c79d84ff",
  "#c78b41ff",
];

// ── Node status labels ───────────────────────────────────────
export const NODE_STATUS_LABELS = {
  idle:      "IDLE",
  receiving: "RECEIVING",
  joining:   "JOINING",
  done:      "DONE",
  failed:    "FAILED",
};

// ── Failure scenarios ────────────────────────────────────────
export const FAILURE_SCENARIOS = [
  {
    id: "mid-node",
    label: "Node giữa bị lỗi",
    description: "Node 1 crash sau 2 giây",
    nodeIndex: 1,
    delayMs: 2000,
  },
  {
    id: "cascade",
    label: "Lỗi dây chuyền",
    description: "Node 0 crash sau 1s, Node 1 crash sau 3s",
    nodeIndex: 0,
    delayMs: 1000,
    cascade: { nodeIndex: 1, delayMs: 3000 },
  },
  {
    id: "late-gather",
    label: "Lỗi khi gather",
    description: "Node cuối crash đúng lúc thu thập kết quả",
    nodeIndex: -1,
    delayMs: 4500,
  },
];

// ── Dataset presets ──────────────────────────────────────────
export const DATASET_PRESETS = [
  { label: "Nhỏ (demo)",   customers: 5,    orders: 7      },
  { label: "Vừa",          customers: 50,   orders: 500    },
  { label: "Lớn",          customers: 200,  orders: 5_000  },
  { label: "Thực tế",      customers: 1_000, orders: 100_000 },
];

const PRODUCTS = [
  "Chanel No.5","Dior Sauvage","Tom Ford Black","Gucci Flora",
  "Creed Aventus","YSL Black Opium","Lancôme La Vie","Burberry Her",
  "Versace Eros","Paco Rabanne 1M","Armani Acqua","Jo Malone Peony",
  "Maison Margiela Replica","Byredo Gypsy Water","Le Labo Santal 33",
];
const CITIES = ["Hà Nội","TP.HCM","Đà Nẵng","Hải Phòng","Cần Thơ","Huế","Nha Trang","Vũng Tàu"];
const FIRST  = ["Nguyễn","Trần","Lê","Phạm","Hoàng","Vũ","Đặng","Bùi","Đỗ","Hồ"];
const MID    = ["Văn","Thị","Minh","Thu","Quốc","Hữu","Ngọc","Đức","Thành","Phương"];
const LAST   = ["An","Bình","Cường","Dung","Em","Phong","Giang","Hà","Khoa","Lan"];

function rng(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export function generateDataset(numCustomers, numOrders) {
  const customers = Array.from({ length: numCustomers }, (_, i) => ({
    customer_id: i + 1,
    name: `${rng(FIRST)} ${rng(MID)} ${rng(LAST)}`,
    city: rng(CITIES),
  }));

  const orders = Array.from({ length: numOrders }, (_, i) => ({
    order_id:    i + 101,
    customer_id: Math.ceil(Math.random() * numCustomers),
    product:     rng(PRODUCTS),
    amount:      Math.floor(Math.random() * 9_000_000) + 1_000_000,
  }));

  return { customers, orders };
}

// ── Block size presets ───────────────────────────────────────
export const BLOCK_SIZE_OPTIONS = [1, 5, 10, 25, 50, 100];

// ── Latency range for chart ──────────────────────────────────
export const LATENCY_RANGE = [1, 5, 10, 25, 50, 75, 100, 150, 200]; 

// ── Utilities ────────────────────────────────────────────────
export function formatMoney(n) {
  return n.toLocaleString("vi-VN") + " ₫";
}

export function formatNum(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function calcExecTime(numR, numS, blockSize, latencyMs, numNodes) {
  const innerPackets = Math.ceil(numS / blockSize) * (numNodes - 1);
  const outerPackets = Math.ceil(numR / blockSize) * numNodes;
  const networkTime  = (innerPackets + outerPackets) * latencyMs;
  const computeTime  = (numR * numS * 0.001) / numNodes;
  return Math.round(networkTime + computeTime);
}
