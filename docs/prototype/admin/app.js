const IMG = "../miniprogram/images";

const state = {
  toast: "",
  edit: null,
  fee: 600,
  postage: 800,
  freeShip: 5000,
  cities: [
    { name: "悉尼", mode: "local" },
    { name: "墨尔本", mode: "local" },
    { name: "堪培拉", mode: "post" }
  ],
  districts: [
    { id: "cbd-s", city: "悉尼", name: "悉尼市中心", on: true },
    { id: "inner-west", city: "悉尼", name: "内西区", on: true },
    { id: "eastern", city: "悉尼", name: "东区", on: true },
    { id: "parramatta", city: "悉尼", name: "帕拉马塔", on: false },
    { id: "cbd-m", city: "墨尔本", name: "墨尔本市中心", on: true },
    { id: "inner-north", city: "墨尔本", name: "内北区", on: true },
    { id: "stkilda", city: "墨尔本", name: "圣基尔达", on: true },
    { id: "dandenong", city: "墨尔本", name: "丹德农", on: false },
    { id: "civic", city: "堪培拉", name: "市民中心", on: true },
    { id: "barton", city: "堪培拉", name: "巴顿", on: true },
    { id: "belconnen", city: "堪培拉", name: "贝尔康宁", on: true }
  ],
  slots: [
    { id: "am", name: "上午", start: "8:00", end: "12:00", on: true },
    { id: "pm", name: "下午", start: "12:00", end: "17:00", on: true }
  ],
  mallCats: ["清洁", "床品", "厨房", "食饮"],
  fleaCats: ["日用品", "床上用品", "家具", "母婴", "数码", "其他"],
  products: [
    { id: "p1", name: "无香洗衣液 2kg", cat: "清洁", price: 3900, stock: 20, sold: 128, on: true, images: ["p1-hero.jpg", "p1-detail.jpg"], summary: "无香，适合贴身衣物。", detail: "2kg 补充装。店里现货，按所选日期和时段送到。", baseLikes: 36 },
    { id: "p2", name: "新疆棉四件套", cat: "床品", price: 26800, stock: 6, sold: 42, on: true, images: ["p2-hero.jpg", "p2-detail.jpg"], summary: "1.8m 床。", detail: "被套、床单、枕套两条。", baseLikes: 128 },
    { id: "p3", name: "铸铁煎锅 26cm", cat: "厨房", price: 14900, stock: 8, sold: 57, on: true, images: ["p3-hero.jpg", "p3-detail.jpg"], summary: "无涂层。", detail: "开锅后使用。偏重，配送时单独放。", baseLikes: 64 },
    { id: "p4", name: "冷榨菜籽油 1.8L", cat: "食饮", price: 5800, stock: 15, sold: 96, on: true, images: ["p4-hero.jpg", "p4-detail.jpg"], summary: "当季压榨。", detail: "1.8 升桶装。", baseLikes: 91 },
    { id: "p5", name: "竹浆抽纸 24 包", cat: "清洁", price: 3290, stock: 30, sold: 210, on: true, images: ["p5-hero.jpg", "p5-detail.jpg"], summary: "整箱。", detail: "24 包。可放门口。", baseLikes: 210 },
    { id: "p6", name: "纯棉毛巾两条", cat: "床品", price: 2900, stock: 18, sold: 73, on: true, images: ["p6-hero.jpg", "p6-detail.jpg"], summary: "两条装。", detail: "深色浅色各一。", baseLikes: 47 },
    { id: "p7", name: "玻璃保鲜盒三件套", cat: "厨房", price: 4600, stock: 11, sold: 39, on: true, images: ["p7-hero.jpg", "p7-detail.jpg"], summary: "可进微波炉。", detail: "大中小三只。", baseLikes: 22 },
    { id: "p8", name: "手工挂面 1kg", cat: "食饮", price: 1600, stock: 40, sold: 154, on: true, images: ["p8-hero.jpg", "p8-detail.jpg"], summary: "细面。", detail: "1 公斤袋装。待支付会锁库存。", baseLikes: 73 },
    { id: "p9", name: "当季柑橘 2.5kg", cat: "食饮", price: 2990, stock: 0, sold: 80, on: true, images: ["p9-hero.jpg", "p9-detail.jpg"], summary: "今天卖完了。", detail: "账面为 0，小程序显示缺货，商品仍在架。", baseLikes: 15 }
  ],
  orders: [
    { id: "o1", status: "unpaid", fulfillment: "local", city: "悉尼", created: "10-27 16:58", slot: "10月28日 上午 8:00–12:00", user: "林可", phone: "0412345678", district: "内西区", detail: "12 Norton Street, Leichhardt", items: [["手工挂面 1kg", "p8", 2, 1600, 0]], remark: "", goods: 3200, shipFee: 600, lockLeft: "12 分钟" },
    { id: "o2", status: "pending", fulfillment: "local", city: "悉尼", created: "10-27 15:20", slot: "10月28日 上午 8:00–12:00", user: "林可", phone: "0412345678", district: "内西区", detail: "12 Norton Street, Leichhardt", items: [["无香洗衣液 2kg", "p1", 1, 3900, 0], ["竹浆抽纸 24 包", "p5", 1, 3290, 0]], remark: "放门口", goods: 7190, shipFee: 600 },
    { id: "o3", status: "delivering", fulfillment: "local", city: "悉尼", created: "10-27 11:05", slot: "10月27日 下午 12:00–17:00", user: "林可", phone: "0412345678", district: "内西区", detail: "12 Norton Street, Leichhardt", items: [["铸铁煎锅 26cm", "p3", 1, 14900, 0]], remark: "", goods: 14900, shipFee: 600 },
    { id: "o4", status: "done", fulfillment: "local", city: "悉尼", created: "10-26 19:12", slot: "10月26日 下午 12:00–17:00", user: "林可", phone: "0412345678", district: "内西区", detail: "12 Norton Street, Leichhardt", items: [["新疆棉四件套", "p2", 1, 26800, 0], ["纯棉毛巾两条", "p6", 2, 2900, 0]], remark: "", goods: 32600, shipFee: 600, afterSale: true },
    { id: "o5", status: "done", fulfillment: "local", city: "悉尼", created: "10-10 12:00", slot: "10月10日 下午 12:00–17:00", user: "林可", phone: "0412345678", district: "内西区", detail: "12 Norton Street, Leichhardt", items: [["纯棉毛巾两条", "p6", 1, 2900, 0]], remark: "", goods: 2900, shipFee: 600, afterSale: false },
    { id: "o6", status: "delivering", fulfillment: "local", city: "悉尼", created: "10-27 09:40", slot: "10月27日 上午 8:00–12:00", user: "林可", phone: "0412345678", district: "内西区", detail: "12 Norton Street, Leichhardt", items: [["玻璃保鲜盒三件套", "p7", 1, 4600, 0], ["竹浆抽纸 24 包", "p5", 1, 3290, 0]], remark: "", goods: 7890, shipFee: 600 },
    { id: "o7", status: "refunded", fulfillment: "local", city: "悉尼", created: "10-25 18:02", slot: "10月25日 下午 12:00–17:00", user: "林可", phone: "0412345678", district: "内西区", detail: "12 Norton Street, Leichhardt", items: [["冷榨菜籽油 1.8L", "p4", 1, 5800, 1]], remark: "", goods: 5800, shipFee: 600 },
    { id: "o8", status: "cancelled", fulfillment: "local", city: "悉尼", created: "10-27 14:10", slot: "10月27日 下午 12:00–17:00", user: "林可", phone: "0412345678", district: "内西区", detail: "12 Norton Street, Leichhardt", items: [["手工挂面 1kg", "p8", 1, 1600, 0]], remark: "", goods: 1600, shipFee: 0 }
  ],
  refunds: [
    { id: "rf1", orderId: "o6", status: "open", user: "林可", reason: "送达时盒子有裂痕", lines: [{ name: "玻璃保鲜盒三件套", pid: "p7", qty: 1, price: 4600 }], goods: 4600, ship: 0, amount: 4600, created: "10-27 12:20", from: "delivering" },
    { id: "rf2", orderId: "o7", status: "approved", user: "林可", reason: "待配送时取消，原路退回。库存没有加回去。", lines: [{ name: "冷榨菜籽油 1.8L", pid: "p4", qty: 1, price: 5800 }], goods: 5800, ship: 600, amount: 6400, created: "10-25 18:10", from: "pending", auto: true }
  ],
  listings: [
    { id: "l1", title: "九成新纯棉四件套", desc: "住校用了一学期，洗过，没有污渍。自提或你来拿，我不管怎么交易。", owner: "周南", city: "悉尼", cat: "床上用品", price: 12000, negotiable: true, status: "在售", condition: "几乎全新", image: "l1.jpg", imageCount: 4, ratio: "tall", time: "昨天 20:06", revision: 1, seenRevision: null, seenAt: "",
      comments: [
        { user: "阿麦", text: "还在吗？有没有发黄？", time: "昨天 21:18", replies: [{ user: "周南", text: "在的，只洗过一次。", time: "昨天 21:40" }] },
        { user: "老谭", text: "帕拉马塔这边，今晚能看吗？", time: "今天 09:12", replies: [] }
      ],
      requests: [] },
    { id: "l2", title: "婴儿推车，八成新", desc: "孩子大了用不上。轮子正常，可小议。", owner: "林可", city: "悉尼", cat: "母婴", price: 26000, negotiable: true, status: "在售", condition: "轻微使用", image: "l2.jpg", imageCount: 3, ratio: "square", time: "今天 16:40", revision: 1, seenRevision: 1, seenAt: "今天 10:12",
      comments: [{ user: "阿麦", text: "还能折叠吗？", time: "10 分钟前", replies: [] }],
      requests: [
        { user: "阿麦", note: "周末下午方便看车吗", time: "10 分钟前", status: "待处理" },
        { user: "老谭", note: "上次没同意，这周还能看吗", time: "刚刚", status: "第 2 次待处理" },
        { user: "周南", note: "便宜一点我就要", time: "昨天", status: "已拒绝此人" }
      ] },
    { id: "l3", title: "电饭煲 3L", desc: "已经送人。", owner: "何山", city: "悉尼", cat: "日用品", price: 8000, negotiable: false, status: "已出", condition: "轻微使用", image: "l3.jpg", imageCount: 1, ratio: "tall", time: "10-20 11:02", revision: 1, seenRevision: 1, seenAt: "10-21 09:00", comments: [], requests: [] },
    { id: "l4", title: "落地灯", desc: "灯泡是好的。灯杆昨天擦过。", owner: "苏晚", city: "悉尼", cat: "家具", price: 9000, negotiable: false, status: "在售", condition: "轻微使用", image: "l4.jpg", imageCount: 2, ratio: "square", time: "10-24 19:20", revision: 2, seenRevision: 1, seenAt: "10-25 11:40", updatedNote: "卖家改过描述。已浏览因此清掉，这次打开会重新记上。", comments: [], requests: [{ user: "林可", note: "想今晚看", time: "昨天 18:02", status: "卖家已同意" }] },
    { id: "l5", title: "儿童绘本一箱", desc: "适合 3 岁左右。", owner: "小满", city: "悉尼", cat: "母婴", price: 5000, negotiable: true, status: "在售", condition: "明显使用", image: "l5.jpg", imageCount: 2, ratio: "tall", time: "10-22 08:14", revision: 1, seenRevision: null, seenAt: "", comments: [], requests: [{ user: "林可", note: "可以便宜点吗", time: "10-22 09:01", status: "已拒绝，可以再申请" }] },
    { id: "l6", title: "实木小书架", desc: "要自己来搬。", owner: "陈桥", city: "墨尔本", cat: "家具", price: 15000, negotiable: false, status: "在售", condition: "轻微使用", image: "l6.jpg", imageCount: 2, ratio: "square", time: "10-26 13:48", revision: 1, seenRevision: 1, seenAt: "昨天 18:20", comments: [], requests: [] }
  ],
  reports: [
    { id: "rp1", open: true, target: "帖子", title: "九成新纯棉四件套", listing: "l1", reason: "虚假信息", extra: "图和实物不像", who: "老谭", time: "今天 11:20" },
    { id: "rp2", open: true, target: "2 楼评论", title: "九成新纯棉四件套", listing: "l1", reason: "骚扰", extra: "", who: "周南", time: "今天 09:40" }
  ]
};

const STATUS = {
  unpaid: ["待支付", "warn"],
  pending: ["待配送", "ok"],
  delivering: ["配送中", "ok"],
  done: ["已完成", "mute"],
  refunding: ["退款中", "warn"],
  refunded: ["已退款", "mute"],
  cancelled: ["已取消", "mute"]
};

const rules = {
  home: ["今天要处理的有：待配送、配送中、退款待审，外加闲置举报。", "退款待审点进去是退款列表，不是订单筛选。同意和拒绝在退款单里做。", "这里不接微信客服会话。金额用分存，页面上显示元。"],
  orders: ["列表能筛全部状态。点一行进详情，操作只在详情里做。", "待支付后台不能代付，也不能在这里点完成。", "部分退款不会把整张订单改成退款中。退款单在「退款」页。"],
  order: ["线下城市的待配送：可以「开始配送」，也可以直接「标记已送达」。", "快递城市的待配送按钮写成「标记已寄出」。状态机仍是待配送到配送中。", "用户可以只退其中几件。待配送的部分退款马上原路退，不等审核。出发之后要等退款单同意。", "同意退款在退款单里做，不在这一页。库存不加回去。", "线下订单在所选日期的时段结束后 24 小时会自动完成。快递没有日期和时段，不走这条。原型不模拟时钟。"],
  products: ["这里维护本店商品：新增、编辑、上下架、改价、改库存、基础点赞。没有规格，也没有评价。", "账面是货架上的数。锁定是待支付订单占着的数。可售 = 账面 − 锁定。", "退款不会把库存加回来。要再卖，用入库或直接改账面。账面不能改得比锁定还小。"],
  product: ["新增和编辑是同一张表：名称、价格、类目、简介、详情、图片、是否上架、账面库存、基础点赞。", "基础点赞是平台给的起步数。用户点赞在这之上加 1，取消就减回去。不能点踩。", "第一张图是主图，后面的是详情图。原型用已有照片代替上传。", "入库是在账面库存上加数量。保存后，新订单按这个价格和可售数量卖。"],
  "mall-cats": ["只给商城用。闲置类目是另一张表。", "类目下还有在售商品时不能删。", "用户不能自己建类目。"],
  delivery: ["线下配送费全店一个数，原型默认 6 元，不按距离。只对线下城市的新订单生效。", "快递邮费默认 8 元。商品金额达到包邮门槛（默认 50 元）时这笔为 0。只对快递城市生效。", "线下城市按区勾选。没勾的区地址可以保存，但不能付款。快递城市不按区拦截。", "时段是每天共用的时间段，例如上午、下午。日期由小程序从明天起生成，这里不配具体哪一天。快递不选日期和时段。"],
  cities: ["每个城市都能买商城的货，也能看闲置。区别是线下配送还是快递。", "悉尼、墨尔本默认线下。堪培拉默认快递。", "改成线下之后，要在配送页勾上至少一个区，否则新订单不能付。", "新加的城市默认走快递。"],
  refunds: ["这里看全部退款单：待审、已同意、已拒绝。", "点进去才能同意或拒绝。列表上不直接改。", "待配送时用户自己退的，会以已同意出现，不用再点一次。"],
  refund: ["看清退的是哪几件、退多少钱、包不包括运费。", "同意后钱原路退。账面库存不变。", "只退一部分时，订单保持待配送、配送中或已完成。商品都退完才变成已退款。", "拒绝后，没退成的商品留在原订单里。整单都在退款中时，拒绝才把订单退回申请前的状态。"],
  listings: ["封面墙，像信息流一样扫。点进详情才算浏览，停在这面墙上不算。", "已浏览是全店一份。任一店员点开，其他店员都能看到标记，用来避开重复看。", "卖家改了标题、描述、图片、标价、可小议、成色、类目或城市后，标记去掉。评论、申请、已出、下架不去掉。", "落地灯是改过内容的例子，进来时没有已浏览。婴儿推车已经有人看过。"],
  listing: ["打开这一页就把当前内容记为已浏览。列表上的标记跟着出现。", "卖家改过内容再打开时，页内说明标记曾被清掉，这次重新记上。", "评论按时间正序，回复只有一层。", "能看到谁申请了、附言是什么。拒绝这一次之后买家还能再申请；「已拒绝此人」才是不能再申请。卖家的手机号和微信号不在账房展示，也不能替卖家点同意或拒绝。", "在售的帖子可以强制下架，原因卖家能看到。下架本身不会把已浏览清掉。"],
  "flea-cats": ["只给闲置用，和商城类目分开。", "删类目前，先确认没有在售帖子用着它。", "用户发布时只能选这里有的类目。"],
  reports: ["举报的是帖子或某一楼评论。提交后内容先留着。", "处理方式只有两种：忽略，或强制下架整条帖子。", "下架评论的原型按「整条帖子下架」处理，避免新手做两套删除。正式环境可以只隐藏那一楼，规则写在服务端文档里。"]
};

function h(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function yuan(cents) {
  const v = Math.abs(cents);
  const fen = v % 100;
  return fen ? `${Math.floor(v / 100)}.${String(fen).padStart(2, "0")}` : String(Math.floor(v / 100));
}
function phonePretty(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  const local = digits.startsWith("61") && digits.length === 11 ? `0${digits.slice(2)}` : digits;
  if (!/^04\d{8}$/.test(local)) return String(phone || "");
  return `+61 ${local.slice(1).replace(/^(\d{3})(\d{3})(\d{3})$/, "$1 $2 $3")}`;
}
function paidOf(item) {
  if (item.status === "unpaid" || item.status === "cancelled") return item.goods;
  return item.goods + (item.shipFee || 0);
}
function refundById(id) { return state.refunds.find((item) => item.id === id); }
function openRefunds(orderId) { return state.refunds.filter((item) => item.orderId === orderId && item.status === "open"); }
function stamp(status) {
  const [label, kind] = STATUS[status] || [status, ""];
  return `<span class="stamp ${kind === "warn" ? "warn" : kind === "mute" ? "mute" : ""}">${h(label)}</span>`;
}
function parse() {
  const raw = location.hash || "#/home";
  const [path, qs = ""] = raw.split("?");
  const parts = path.replace(/^#\//, "").split("/");
  const query = {};
  qs.split("&").filter(Boolean).forEach((pair) => {
    const [k, v = ""] = pair.split("=");
    query[decodeURIComponent(k)] = decodeURIComponent(v);
  });
  return { name: parts[0] || "home", id: parts[1] || "", query };
}
function go(hash) {
  if ((location.hash || "#/home") === hash) { render(); return; }
  location.hash = hash;
  setTimeout(render, 0);
}
function notify(message) {
  state.toast = message;
  render();
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => { state.toast = ""; render(); }, 2400);
}
function order(id) { return state.orders.find((item) => item.id === id); }
function product(id) { return state.products.find((item) => item.id === id); }
function pullSlots() {
  const clock = /^([01]?\d|2[0-3]):[0-5]\d$/;
  const next = [];
  for (const slot of state.slots) {
    const name = document.querySelector(`[data-slot="${slot.id}"][data-slot-field="name"]`);
    const start = document.querySelector(`[data-slot="${slot.id}"][data-slot-field="start"]`);
    const end = document.querySelector(`[data-slot="${slot.id}"][data-slot-field="end"]`);
    if (!name || !start || !end) { next.push(slot); continue; }
    if (!name.value.trim()) { notify("时段名称不能空"); return null; }
    if (!clock.test(start.value.trim()) || !clock.test(end.value.trim())) { notify("时间写成 8:00 这种"); return null; }
    next.push({ ...slot, name: name.value.trim(), start: start.value.trim(), end: end.value.trim() });
  }
  state.slots = next;
  return next;
}
function pullForm() {
  const form = state.edit;
  if (!form || !document.getElementById("p-name")) return form;
  form.name = document.getElementById("p-name").value;
  form.priceYuan = document.getElementById("p-price").value;
  form.stock = document.getElementById("p-stock").value;
  form.baseLikes = document.getElementById("p-likes").value;
  form.cat = document.getElementById("p-cat").value;
  form.summary = document.getElementById("p-summary").value;
  form.detail = document.getElementById("p-detail").value;
  form.on = document.getElementById("p-on").checked;
  return form;
}
function listing(id) { return state.listings.find((item) => item.id === id); }
function lockedOf(id) {
  return state.orders.filter((item) => item.status === "unpaid").reduce((sum, item) => {
    return sum + item.items.filter((line) => line[1] === id).reduce((qty, line) => qty + line[2], 0);
  }, 0);
}
function sellable(item) { return Math.max(0, item.stock - lockedOf(item.id)); }
const GALLERY = ["p1-hero.jpg", "p1-detail.jpg", "p2-hero.jpg", "p3-hero.jpg", "p3-detail.jpg", "p5-hero.jpg", "p8-hero.jpg", "p9-hero.jpg", "l1.jpg", "l2.jpg"];

function counts() {
  return {
    pending: state.orders.filter((item) => item.status === "pending").length,
    delivering: state.orders.filter((item) => item.status === "delivering").length,
    refunding: state.refunds.filter((item) => item.status === "open").length,
    reports: state.reports.filter((item) => item.open).length
  };
}

function nav() {
  const c = counts();
  const route = parse();
  const groups = [
    ["今天", [
      ["home", "概览", ""],
      ["orders", "订单", c.pending + c.delivering],
      ["refunds", "退款", c.refunding],
      ["reports", "举报", c.reports]
    ]],
    ["商城", [
      ["products", "商品", ""],
      ["mall-cats", "商城类目", ""],
      ["delivery", "配送", ""],
      ["cities", "城市", ""]
    ]],
    ["闲置", [
      ["listings", "闲置浏览", ""],
      ["flea-cats", "闲置类目", ""]
    ]]
  ];
  document.getElementById("nav").innerHTML = `
    <div class="brand"><small>STORE DESK</small><b>巷口账房</b><p>单店后台。管配送和货，不管闲置怎么成交。</p></div>
    ${groups.map(([name, items]) => `<div class="nav-group">${name}</div>${items.map(([id, label, badge]) => {
      const on = route.name === id || (id === "orders" && route.name === "order") || (id === "refunds" && route.name === "refund") || (id === "products" && route.name === "product") || (id === "listings" && route.name === "listing");
      return `<button type="button" class="nav-btn ${on ? "on" : ""}" data-go="#/${id}"><span>${label}</span>${badge ? `<span class="badge">${badge}</span>` : ""}</button>`;
    }).join("")}`).join("")}`;
}

function ruleKey(route) {
  if (rules[route.name]) return route.name;
  return "home";
}
function paintRules(route) {
  const key = ruleKey(route);
  const title = { home: "概览", orders: "订单", order: "订单详情", refunds: "退款", refund: "退款单", products: "商品", product: route.id === "new" ? "新增商品" : "编辑商品", "mall-cats": "商城类目", delivery: "配送", cities: "城市", listings: "闲置浏览", listing: "查看帖子", "flea-cats": "闲置类目", reports: "举报" }[key] || "规则";
  const points = rules[key] || [];
  document.getElementById("rules").innerHTML = `<p class="kicker">这一页要守的规则</p><h2>${h(title)}</h2><ol>${points.map((point) => `<li>${h(point)}</li>`).join("")}</ol>`;
}

function head(title, sub) {
  return `<div class="page-head"><div><p class="kicker">巷口到家</p><h1>${h(title)}</h1><p>${sub}</p></div></div>`;
}

function renderHome() {
  const c = counts();
  const local = state.cities.filter((item) => item.mode === "local").map((item) => item.name).join("、");
  const post = state.cities.filter((item) => item.mode === "post").map((item) => item.name).join("、");
  const areas = state.districts.filter((item) => item.on && state.cities.some((city) => city.name === item.city && city.mode === "local")).map((item) => item.name).join("、");
  return `${head("今天的账", "原型时间 10 月 27 日 17:10。线下配送从明天起选日期。")}
    <div class="stats">
      <button type="button" class="stat" data-go="#/orders?status=pending"><b>${c.pending}</b><span>待配送</span><em>线下可出发，快递可寄出</em></button>
      <button type="button" class="stat" data-go="#/orders?status=delivering"><b>${c.delivering}</b><span>配送中</span><em>送到了就标已送达</em></button>
      <button type="button" class="stat" data-go="#/refunds?status=open"><b>${c.refunding}</b><span>退款待审</span><em>同意才退钱，库存不动</em></button>
      <button type="button" class="stat" data-go="#/reports"><b>${c.reports}</b><span>举报待处理</span><em>先发后审，帖子现在还在</em></button>
    </div>
    <section class="card"><h2>现在的配送</h2><p class="hint">线下：${h(local)}，配送费 ¥${yuan(state.fee)}。可送 ${h(areas)}。快递：${h(post)}，未满 ¥${yuan(state.freeShip)} 收 ¥${yuan(state.postage)}，满则包邮。</p><button type="button" class="ghost" data-go="#/delivery">去改配送</button></section>`;
}

function renderOrders(route) {
  const filters = [["", "全部"], ["unpaid", "待支付"], ["pending", "待配送"], ["delivering", "配送中"], ["done", "已完成"], ["refunding", "退款中"], ["refunded", "已退款"], ["cancelled", "已取消"]];
  const current = route.query.status || "";
  const list = state.orders.filter((item) => !current || item.status === current || (current === "refund" && (item.status === "refunding" || item.status === "refunded")));
  return `${head("订单", "点一行看详情。开始配送和已送达在详情里。退款同意在退款单里。")}
    <div class="chips">${filters.map(([id, label]) => `<button type="button" class="chip ${current === id ? "on" : ""}" data-go="#/orders${id ? `?status=${id}` : ""}">${label}</button>`).join("")}</div>
    <div class="table-wrap"><table><thead><tr><th>单号</th><th>状态</th><th>方式</th><th>用户</th><th>时段</th><th>商品</th><th>实收</th><th></th></tr></thead><tbody>
      ${list.map((item) => `<tr class="hit" data-go="#/order/${item.id}"><td>${h(item.id)}</td><td>${stamp(item.status)}</td><td>${item.fulfillment === "post" ? "快递" : "线下"}</td><td>${h(item.user)}</td><td>${h(item.slot)}</td><td>${h(item.items.map((line) => line[0]).join("、"))}</td><td>¥${yuan(paidOf(item))}</td><td><button type="button" class="ghost" data-go="#/order/${item.id}">处理</button></td></tr>`).join("") || `<tr><td colspan="8">这个状态下没有订单。</td></tr>`}
    </tbody></table></div>`;
}

function renderOrder(route) {
  const item = order(route.id);
  if (!item) return `${head("订单不存在", "")}`;
  const post = item.fulfillment === "post";
  const actions = [];
  if (item.status === "pending") {
    actions.push(`<button type="button" class="btn" data-action="start" data-id="${item.id}">${post ? "标记已寄出" : "开始配送"}</button>`);
    actions.push(`<button type="button" class="ghost" data-action="arrive" data-id="${item.id}">直接标记已送达</button>`);
  }
  if (item.status === "delivering") actions.push(`<button type="button" class="btn" data-action="arrive" data-id="${item.id}">标记已送达</button>`);
  const open = openRefunds(item.id);
  const note = {
    unpaid: `等用户支付。库存锁到下单后 15 分钟，还剩示意 ${item.lockLeft || "15 分钟"}。后台不能代付。`,
    pending: post ? "快递还没寄出。用户可以只退其中几件，钱马上原路退回。" : "用户可以只退其中几件，还没出发的马上原路退回。出发就点开始配送；货已经送到也可以直接标记已送达。",
    delivering: "用户可以确认收货，或申请退其中几件。店员送到后点已送达。",
    done: item.afterSale ? "完成后 7 天内，用户还能申请退其中几件。到退款单里审。" : "已超过 7 天，用户不能再申请。",
    refunding: "整单未退商品都在一笔退款单里。到退款单同意或拒绝。",
    refunded: "钱已按原路退回。这是终态。库存没有加回去。",
    cancelled: "未支付关闭，未扣款，锁定的库存已释放。"
  }[item.status];
  const refundRows = state.refunds.filter((row) => row.orderId === item.id).map((row) => `<div class="kv"><span>${row.status === "open" ? "待审" : row.status === "approved" ? "已同意" : "已拒绝"} · ${h(row.id)}</span><b><button type="button" class="ghost" data-go="#/refund/${row.id}">¥${yuan(row.amount)} · ${h(row.lines.map((line) => line.name).join("、"))}</button></b></div>`).join("");
  return `${head(item.id, `${item.created} 下单 · ${h(item.city)} · ${post ? "快递" : "线下"}`)}
    <div class="notice ${item.status === "pending" || item.status === "delivering" || item.status === "done" ? "ok" : ""}">${stamp(item.status)} ${h(note)}</div>
    <section class="card">
      <div class="kv"><span>收货</span><b>${h(item.user)} ${h(phonePretty(item.phone))}</b></div>
      <div class="kv"><span>地址</span><b>${h(item.district)} ${h(item.detail)}</b></div>
      <div class="kv"><span>${post ? "方式" : "时段"}</span><b>${h(item.slot)}</b></div>
      <div class="kv"><span>备注</span><b>${h(item.remark || "无")}</b></div>
      ${item.items.map((line) => `<div class="kv"><span>${h(line[0])} × ${line[2]}${(line[4] || 0) ? ` · 已退 ${line[4]}` : ""}${open.some((row) => row.lines.some((entry) => entry.pid === line[1])) ? " · 退款待审" : ""}</span><b>¥${yuan(line[3] * line[2])}</b></div>`).join("")}
      <div class="kv"><span>${post ? "邮费" : "配送费"}</span><b>${item.status === "unpaid" || item.status === "cancelled" ? "未计入" : `¥${yuan(item.shipFee || 0)}`}</b></div>
      <div class="kv"><span>合计</span><b>¥${yuan(paidOf(item))}</b></div>
      ${refundRows}
      <div class="row" style="margin-top:12px">${actions.join("") || `<span class="muted">这一单没有配送按钮。</span>`}</div>
    </section>`;
}

function renderProducts() {
  return `${head("商品", "本店在卖的东西。新增、改资料、改库存都在这里。")}
    <div class="row" style="margin-bottom:14px"><button type="button" class="btn" data-go="#/product/new">新增商品</button></div>
    <div class="table-wrap"><table><thead><tr><th></th><th>名称</th><th>类目</th><th>价格</th><th>账面</th><th>锁定</th><th>可售</th><th>状态</th><th></th></tr></thead><tbody>
      ${state.products.map((item) => `<tr>
        <td><img class="shot" src="${IMG}/${item.images[0]}" alt=""></td>
        <td>${h(item.name)}</td><td>${h(item.cat)}</td><td>¥${yuan(item.price)}</td>
        <td>${item.stock}</td><td>${lockedOf(item.id)}</td><td>${sellable(item)}</td>
        <td>${item.on ? (sellable(item) ? `<span class="stamp">在售</span>` : `<span class="stamp warn">缺货</span>`) : `<span class="stamp mute">已下架</span>`}</td>
        <td><button type="button" class="ghost" data-go="#/product/${item.id}">编辑</button></td>
      </tr>`).join("")}
    </tbody></table></div>`;
}

function ensureEdit(route) {
  const key = route.id;
  if (state.edit && state.edit.key === key) return state.edit;
  if (key === "new") {
    state.edit = { key, name: "", priceYuan: "", stock: "0", baseLikes: "0", cat: state.mallCats[0] || "", summary: "", detail: "", on: true, images: [] };
    return state.edit;
  }
  const item = product(key);
  if (!item) return null;
  state.edit = { key, name: item.name, priceYuan: yuan(item.price), stock: String(item.stock), baseLikes: String(item.baseLikes || 0), cat: item.cat, summary: item.summary || "", detail: item.detail || "", on: item.on, images: item.images.slice() };
  return state.edit;
}

function renderProduct(route) {
  const form = ensureEdit(route);
  if (!form) return head("商品不存在", "");
  const item = route.id === "new" ? null : product(route.id);
  const locked = item ? lockedOf(item.id) : 0;
  const stockNow = /^\d+$/.test(form.stock) ? Number(form.stock) : 0;
  const canSell = Math.max(0, stockNow - locked);
  return `${head(route.id === "new" ? "新增商品" : form.name, route.id === "new" ? "填完保存，才会出现在商品列表和小程序里。" : "改完点保存。已经下过的订单仍用下单时的价格。")}
    <section class="card">
      <h2>图片</h2>
      <p class="hint">第一张是主图，其余是详情图。正式环境上传到对象存储。原型从已有照片里挑。</p>
      <div class="pic-row">${form.images.map((file, index) => `<figure><img src="${IMG}/${file}" alt=""><button type="button" class="ghost" data-action="drop-image" data-index="${index}">去掉</button></figure>`).join("") || `<span class="muted">还没有图片。至少放一张主图。</span>`}</div>
      <button type="button" class="ghost" data-action="add-image">添加图片</button>
    </section>
    <section class="card">
      <label class="field">名称<input id="p-name" value="${h(form.name)}"></label>
      <label class="field">价格（元）<input id="p-price" value="${h(form.priceYuan)}" inputmode="decimal"></label>
      <label class="field">类目<select id="p-cat">${state.mallCats.map((cat) => `<option ${cat === form.cat ? "selected" : ""}>${h(cat)}</option>`).join("")}</select></label>
      <label class="field">简介<input id="p-summary" value="${h(form.summary)}" placeholder="列表上的一句短说明"></label>
      <label class="field">详情<textarea id="p-detail" placeholder="详情页的说明">${h(form.detail)}</textarea></label>
      <label class="check"><input id="p-on" type="checkbox" ${form.on ? "checked" : ""}>上架。取消勾选后，小程序列表和搜索里都看不到。</label>
    </section>
    <section class="card">
      <h2>库存</h2>
      <p class="hint">账面是货架上的件数。锁定是还没付款的订单占着的件数。可售 = 账面 − 锁定。退款不会自动把账面加回来。</p>
      <div class="stats">
        <div class="stat"><b>${stockNow}</b><span>账面</span></div>
        <div class="stat"><b>${locked}</b><span>待支付锁定</span></div>
        <div class="stat"><b>${canSell}</b><span>可售</span></div>
      </div>
      ${item && locked ? `<p class="hint">未支付订单占着 ${locked} 件。账面不能改到比这个数小。</p>` : ""}
      <label class="field">账面库存<input id="p-stock" value="${h(form.stock)}" inputmode="numeric"></label>
      <label class="field">基础点赞<input id="p-likes" value="${h(form.baseLikes || "0")}" inputmode="numeric"></label>
      <p class="hint">这是平台给的起步数。用户点赞会在上面加 1，取消就减回去。没有评价，也不能点踩。</p>
      <div class="row"><input id="restock-qty" value="10" aria-label="入库数量" style="width:100px"><button type="button" class="ghost" data-action="restock">入库这么多</button></div>
      <button type="button" class="btn" data-action="save-product" data-id="${route.id}">保存</button>
    </section>`;
}

function renderMallCats() {
  return `${head("商城类目", "用户在小程序里只能点这些，不能自己输入新类目。")}
    <section class="card">
      ${state.mallCats.map((cat) => `<div class="kv"><b>${h(cat)}</b><button type="button" class="ghost" data-action="del-mall-cat" data-name="${h(cat)}">删除</button></div>`).join("")}
      <div class="row" style="margin-top:12px"><input id="new-mall-cat" placeholder="新类目名称" aria-label="新类目"><button type="button" class="btn" data-action="add-mall-cat">添加</button></div>
    </section>`;
}

function renderDelivery() {
  const localCities = state.cities.filter((item) => item.mode === "local");
  const areas = localCities.map((city) => `<h3>${h(city.name)}</h3>${state.districts.filter((item) => item.city === city.name).map((item) => `<label class="check"><input type="checkbox" data-district="${h(item.id)}" ${item.on ? "checked" : ""}>${h(item.name)}${item.on ? "" : " · 用户能保存地址，但不能付款"}</label>`).join("") || `<p class="muted">还没有区。线下城市一个可送的区都没有时，新订单不能付。</p>`}`).join("");
  return `${head("配送", "线下是一笔配送费加可送的区。快递是邮费和包邮门槛。")}
    <section class="card"><h2>线下配送费</h2><p class="hint">只对线下城市的新订单。不按距离。单位是元，存成角分。快递订单不收这笔。</p>
      <div class="row"><input id="fee" value="${yuan(state.fee)}" aria-label="线下配送费" style="width:120px"><button type="button" class="btn" data-action="save-fee">保存配送费</button></div>
    </section>
    <section class="card"><h2>快递邮费和包邮门槛</h2><p class="hint">只对快递城市。商品金额达到门槛就包邮，否则收邮费。改这里不影响已经生成的订单。</p>
      <div class="row"><label>邮费（元）<input id="postage" value="${yuan(state.postage)}" aria-label="快递邮费" style="width:120px"></label><label>满多少包邮（元）<input id="free-ship" value="${yuan(state.freeShip)}" aria-label="包邮门槛" style="width:120px"></label><button type="button" class="btn" data-action="save-post">保存快递规则</button></div>
    </section>
    <section class="card"><h2>线下可送的区</h2><p class="hint">只列线下城市。快递城市全市可下单，不在这里勾。</p>${areas || `<p class="muted">现在没有线下城市。</p>`}</section>
    <section class="card"><h2>送达时段</h2><p class="hint">只给线下配送用。这里配的是每天共用的时间段，例如上午、下午。小程序从明天起选具体日期，一共 7 天，日期不在这里配。快递不选日期，也不选时段。</p>
      ${state.slots.map((slot) => `<div class="row" style="margin-bottom:8px"><input data-slot="${h(slot.id)}" data-slot-field="name" value="${h(slot.name)}" aria-label="时段名称" style="width:100px"><input data-slot="${h(slot.id)}" data-slot-field="start" value="${h(slot.start)}" aria-label="开始" style="width:90px"><span>到</span><input data-slot="${h(slot.id)}" data-slot-field="end" value="${h(slot.end)}" aria-label="结束" style="width:90px"><button type="button" class="ghost" data-action="slot" data-id="${h(slot.id)}">${slot.on ? "停用" : "打开"}</button><button type="button" class="ghost" data-action="drop-slot" data-id="${h(slot.id)}">删除</button></div>`).join("")}
      <div class="row"><button type="button" class="ghost" data-action="add-slot">添加时段</button><button type="button" class="btn" data-action="save-slots">保存时段</button></div>
    </section>`;
}

function renderCities() {
  return `${head("城市", "每个城市都能买，也能发闲置。这里只选配送方式。")}
    <section class="card">
      ${state.cities.map((item) => `<div class="kv"><span><b>${h(item.name)}</b><br><span class="muted">${item.mode === "local" ? "线下配送。要在配送页勾可送的区，结算时选时段。" : "快递。全市可下单，满门槛包邮，不满收邮费。"}</span></span><button type="button" class="ghost" data-action="city-mode" data-name="${h(item.name)}">${item.mode === "local" ? "改成快递" : "改成线下配送"}</button></div>`).join("")}
      <div class="row" style="margin-top:12px"><input id="new-city" placeholder="城市名" aria-label="城市名"><button type="button" class="btn pine" data-action="add-city">添加城市</button></div>
    </section>`;
}
function renderRefunds(route) {
  const filters = [["", "全部"], ["open", "待审"], ["approved", "已同意"], ["rejected", "已拒绝"]];
  const current = route.query.status || "";
  const list = state.refunds.filter((item) => !current || item.status === current);
  const label = { open: "待审", approved: "已同意", rejected: "已拒绝" };
  return `${head("退款", "先看列表，再点进去同意或拒绝。不要在列表里直接退钱。")}
    <div class="chips">${filters.map(([id, name]) => `<button type="button" class="chip ${current === id ? "on" : ""}" data-go="#/refunds${id ? `?status=${id}` : ""}">${name}</button>`).join("")}</div>
    <div class="table-wrap"><table><thead><tr><th>退款单</th><th>订单</th><th>状态</th><th>用户</th><th>商品</th><th>金额</th><th></th></tr></thead><tbody>
      ${list.map((item) => `<tr class="hit" data-go="#/refund/${item.id}"><td>${h(item.id)}</td><td>${h(item.orderId)}</td><td>${h(label[item.status] || item.status)}</td><td>${h(item.user)}</td><td>${h(item.lines.map((line) => `${line.name} × ${line.qty}`).join("、"))}</td><td>¥${yuan(item.amount)}</td><td><button type="button" class="ghost" data-go="#/refund/${item.id}">${item.status === "open" ? "处理" : "查看"}</button></td></tr>`).join("") || `<tr><td colspan="7">这个状态下没有退款单。</td></tr>`}
    </tbody></table></div>`;
}
function renderRefund(route) {
  const item = refundById(route.id);
  if (!item) return head("退款单不存在", "");
  const orderItem = order(item.orderId);
  const label = { open: "待审", approved: "已同意", rejected: "已拒绝" };
  const actions = item.status === "open"
    ? `<button type="button" class="btn" data-action="refund-yes" data-id="${item.id}">同意退款</button><button type="button" class="ghost" data-action="refund-no" data-id="${item.id}">拒绝</button>`
    : `<span class="muted">${item.auto ? "待配送时用户自己退的，已经原路退回。" : "这一单已经处理过。"}</span>`;
  return `${head(item.id, `${item.created} 申请 · ${label[item.status] || item.status}`)}
    <section class="card">
      <div class="kv"><span>订单</span><b><button type="button" class="ghost" data-go="#/order/${h(item.orderId)}">${h(item.orderId)}</button></b></div>
      <div class="kv"><span>用户</span><b>${h(item.user)}</b></div>
      <div class="kv"><span>原因</span><b>${h(item.reason)}</b></div>
      ${item.lines.map((line) => `<div class="kv"><span>${h(line.name)} × ${line.qty}</span><b>¥${yuan(line.price * line.qty)}</b></div>`).join("")}
      <div class="kv"><span>运费</span><b>${item.ship ? `¥${yuan(item.ship)}` : "不退"}</b></div>
      <div class="kv"><span>退款金额</span><b>¥${yuan(item.amount)}</b></div>
      <p class="hint">${orderItem ? `订单现在是${STATUS[orderItem.status][0]}。${item.lines.length && orderItem.items.every((line) => item.lines.some((entry) => entry.pid === line[1]) && entryCovers(item, line)) ? "这张单覆盖了全部未退商品。" : "这张单只退一部分，同意后订单状态保持不变。"}` : ""}库存不会因为同意而加回去。</p>
      <div class="row" style="margin-top:12px">${actions}</div>
    </section>`;
}
function entryCovers(refund, line) {
  const hit = refund.lines.find((entry) => entry.pid === line[1]);
  if (!hit) return false;
  return (line[4] || 0) + hit.qty >= line[2];
}

function listingSeen(item) {
  return !!item && item.seenRevision != null && item.seenRevision === item.revision;
}
function openListing(item) {
  const stale = item.seenRevision != null && item.seenRevision < item.revision;
  const fresh = item.seenRevision == null || stale;
  if (fresh) {
    item.seenAt = "刚刚";
    item.reviewNote = stale ? (item.updatedNote || "卖家改过这则帖子，已浏览已清掉。这次打开重新记为已浏览。") : "";
  }
  item.seenRevision = item.revision;
}
function listingHref(route, next) {
  const status = next.status !== undefined ? next.status : (route.query.status || "");
  const city = next.city !== undefined ? next.city : (route.query.city || "");
  const unseen = next.unseen !== undefined ? next.unseen : route.query.seen === "0";
  const q = new URLSearchParams();
  if (status) q.set("status", status);
  if (city) q.set("city", city);
  if (unseen) q.set("seen", "0");
  const qs = q.toString();
  return `#/listings${qs ? `?${qs}` : ""}`;
}

function renderListings(route) {
  const status = route.query.status || "";
  const city = route.query.city || "";
  const unseenOnly = route.query.seen === "0";
  const rows = state.listings.filter((item) => (!status || item.status === status) && (!city || item.city === city) && (!unseenOnly || !listingSeen(item)));
  const cities = [...new Set(state.listings.map((item) => item.city))];
  const chip = (label, href, on) => `<button type="button" class="chip${on ? " on" : ""}" data-go="${href}">${label}</button>`;
  const cards = rows.map((item) => `<button type="button" class="note" data-go="#/listing/${item.id}">
      <span class="note-pic">
        <img class="${item.ratio === "tall" ? "tall" : "square"}" src="${IMG}/${item.image}" alt="">
        ${listingSeen(item) ? `<i class="seen-flag">已浏览</i>` : ""}
        ${item.status !== "在售" ? `<i class="status-flag">${h(item.status)}</i>` : ""}
      </span>
      <span class="note-body">
        <b>${h(item.title)}</b>
        <span class="note-meta"><em>¥${yuan(item.price)}</em><span>${h(item.city)} · ${h(item.owner)}</span></span>
      </span>
    </button>`).join("");
  return `${head("闲置浏览", "封面墙。点开一张才算看过。卖家改过内容的，已浏览会去掉。")}
    <div class="chips">
      ${chip("全部", listingHref(route, { status: "", city: "", unseen: false }), !status && !city && !unseenOnly)}
      ${chip("未浏览", listingHref(route, { unseen: !unseenOnly }), unseenOnly)}
      ${["在售", "已出", "已下架"].map((name) => chip(name, listingHref(route, { status: status === name ? "" : name }), status === name)).join("")}
      ${cities.map((name) => chip(name, listingHref(route, { city: city === name ? "" : name }), city === name)).join("")}
    </div>
    <div class="feed">${cards || `<p class="muted">这个筛选下没有帖子。</p>`}</div>`;
}

function renderListing(route) {
  const item = listing(route.id);
  if (!item) return head("帖子不存在", "");
  openListing(item);
  const floors = item.comments.map((comment, index) => `<div class="kv"><span>${index + 1} 楼 · ${h(comment.user)} · ${h(comment.time)}</span><b>${h(comment.text)}</b>${(comment.replies || []).map((reply) => `<span class="muted">${h(reply.user)} 回复：${h(reply.text)} · ${h(reply.time)}</span>`).join("")}</div>`).join("");
  const asks = item.requests.map((ask) => `<div class="kv"><span>${h(ask.user)} · ${h(ask.time)} · ${h(ask.status)}</span><b>${h(ask.note)}</b></div>`).join("");
  return `${head(item.title, `${item.owner} 发布于 ${item.time}`)}
    <section class="card">
      <div class="pic-row"><figure><img src="${IMG}/${item.image}" alt=""><figcaption>封面 · 用户共传了 ${item.imageCount} 张</figcaption></figure></div>
      <div class="kv"><span>标价</span><b>¥${yuan(item.price)}${item.negotiable ? " · 可小议" : ""}</b></div>
      <div class="kv"><span>成色</span><b>${h(item.condition)}</b></div>
      <div class="kv"><span>城市 / 类目</span><b>${h(item.city)} · ${h(item.cat)}</b></div>
      <div class="kv"><span>状态</span><b>${h(item.status)}</b></div>
      <div class="kv"><span>浏览</span><b>已浏览${item.seenAt ? ` · ${h(item.seenAt)}` : ""}</b></div>
      ${item.reviewNote ? `<p class="notice">${h(item.reviewNote)}</p>` : ""}
      <p>${h(item.desc)}</p>
    </section>
    <section class="card"><h2>评论</h2>${floors || `<p class="muted">还没有评论。</p>`}</section>
    <section class="card"><h2>联系方式申请</h2><p class="hint">只看谁申请了、附言是什么、卖家怎么处理。拒绝这一次之后，买家还能再申请。「已拒绝此人」表示这个人不能再申请这条。卖家的手机号和微信号不出现在这里，账房也不能替卖家同意或拒绝。</p>${asks || `<p class="muted">还没有人申请。</p>`}</section>
    <section class="card">
      ${item.status === "在售" ? `<label class="field">下架原因<textarea id="remove-reason" placeholder="例如图文不符。卖家能在自己的帖子里看到这句。"></textarea></label><button type="button" class="btn" data-action="remove-listing" data-id="${item.id}">强制下架</button>` : `<p class="muted">不是在售，不能再下架。${item.reason ? `原因：${h(item.reason)}` : ""}</p>`}
    </section>`;
}

function renderFleaCats() {
  return `${head("闲置类目", "和商城类目分开存。发布页只能选这里的项。")}
    <section class="card">
      ${state.fleaCats.map((cat) => `<div class="kv"><b>${h(cat)}</b><button type="button" class="ghost" data-action="del-flea-cat" data-name="${h(cat)}">删除</button></div>`).join("")}
      <div class="row" style="margin-top:12px"><input id="new-flea-cat" placeholder="新类目名称" aria-label="新闲置类目"><button type="button" class="btn pine" data-action="add-flea-cat">添加</button></div>
    </section>`;
}

function renderReports() {
  const open = state.reports.filter((item) => item.open);
  return `${head("举报", "先发后审。没处理前，帖子和评论都还在小程序里。")}
    ${open.length ? open.map((item) => `<section class="card"><h2>${h(item.target)} · ${h(item.title)}</h2><p class="hint">${h(item.who)} 在 ${h(item.time)} 举报「${h(item.reason)}」。${h(item.extra || "没有补充。")}</p><div class="row"><button type="button" class="ghost" data-action="ignore-report" data-id="${item.id}">忽略</button><button type="button" class="btn" data-action="report-takedown" data-id="${item.id}">强制下架这条帖子</button></div></section>`).join("") : `<section class="card"><p>没有待处理的举报。</p></section>`}`;
}

function render() {
  const route = parse();
  nav();
  paintRules(route);
  const body = {
    home: renderHome,
    orders: renderOrders,
    order: renderOrder,
    refunds: renderRefunds,
    refund: renderRefund,
    products: renderProducts,
    product: renderProduct,
    "mall-cats": renderMallCats,
    delivery: renderDelivery,
    cities: renderCities,
    listings: renderListings,
    listing: renderListing,
    "flea-cats": renderFleaCats,
    reports: renderReports
  }[route.name] || renderHome;
  document.getElementById("main").innerHTML = body(route) + (state.toast ? `<div class="toast" role="status">${h(state.toast)}</div>` : "");
  document.title = "巷口账房 · 管理后台原型";
}

const actions = {
  start(el) {
    const item = order(el.dataset.id);
    item.status = "delivering";
    notify(item.fulfillment === "post" ? "已标记寄出。用户侧不能再自己取消。" : "已变为配送中。用户侧不能再自己取消。");
  },
  arrive(el) {
    const item = order(el.dataset.id);
    item.status = "done";
    item.afterSale = true;
    notify("已标记送达，订单完成。7 天内用户仍可申请退款。");
  },
  "refund-yes"(el) {
    const rf = refundById(el.dataset.id);
    if (!rf || rf.status !== "open") return notify("这张退款单不在待审");
    const item = order(rf.orderId);
    rf.lines.forEach((line) => {
      const row = item.items.find((entry) => entry[1] === line.pid);
      if (row) row[4] = (row[4] || 0) + line.qty;
    });
    rf.status = "approved";
    const all = item.items.every((row) => (row[4] || 0) >= row[2]);
    if (all) item.status = "refunded";
    notify(all ? "已同意。商品都退完了，订单变为已退款。库存没有变化。" : "已同意。只退了这一部分，订单状态保持不变。库存没有变化。");
  },
  "refund-no"(el) {
    const rf = refundById(el.dataset.id);
    if (!rf || rf.status !== "open") return notify("这张退款单不在待审");
    const item = order(rf.orderId);
    rf.status = "rejected";
    if (item.status === "refunding") item.status = rf.from || "delivering";
    notify("已拒绝。没退成的商品留在原订单里。");
  },
  "save-product"(el) {
    const form = pullForm();
    const name = form.name.trim();
    const priceText = String(form.priceYuan).trim();
    const stockText = String(form.stock).trim();
    if (!name) return notify("名称不能空");
    if (!/^\d+(\.\d{1,2})?$/.test(priceText) || Number(priceText) <= 0) return notify("价格要大于 0，最多两位小数");
    if (!/^\d+$/.test(stockText)) return notify("账面库存是大于等于 0 的整数");
    const likesText = String(form.baseLikes ?? "0").trim();
    if (!/^\d+$/.test(likesText)) return notify("基础点赞是大于等于 0 的整数");
    const stock = Number(stockText);
    const locked = el.dataset.id === "new" ? 0 : lockedOf(el.dataset.id);
    if (stock < locked) return notify(`账面不能小于待支付锁定的 ${locked} 件`);
    if (!form.images.length) return notify("至少放一张主图");
    let item = el.dataset.id === "new" ? null : product(el.dataset.id);
    if (!item) {
      item = { id: "p" + Date.now(), sold: 0 };
      state.products.unshift(item);
    }
    item.name = name;
    item.price = Math.round(Number(priceText) * 100);
    item.stock = stock;
    item.baseLikes = Number(likesText);
    item.cat = form.cat;
    item.summary = form.summary.trim();
    item.detail = form.detail.trim();
    item.on = form.on;
    item.images = form.images.slice();
    if (el.dataset.id === "new") {
      state.edit = null;
      location.hash = "#/product/" + item.id;
    }
    notify("已保存。新订单按这个价格和可售数量卖。");
  },
  "add-image"() {
    const form = pullForm();
    const next = GALLERY.find((file) => !form.images.includes(file));
    if (!next) return notify("示意照片用完了");
    form.images.push(next);
    render();
  },
  "drop-image"(el) {
    const form = pullForm();
    form.images.splice(Number(el.dataset.index), 1);
    render();
  },
  restock() {
    const form = pullForm();
    const add = document.getElementById("restock-qty").value.trim();
    if (!/^\d+$/.test(add) || Number(add) <= 0) return notify("入库数量是大于 0 的整数");
    const base = /^\d+$/.test(String(form.stock).trim()) ? Number(form.stock) : 0;
    form.stock = String(base + Number(add));
    notify(`账面先记成 ${form.stock}。点保存才会生效。`);
  },
  "add-mall-cat"() {
    const name = document.getElementById("new-mall-cat").value.trim();
    if (!name) return notify("先写类目名");
    if (state.mallCats.includes(name)) return notify("已经有这个类目");
    state.mallCats.push(name);
    notify("已添加。小程序商城类目里会出现它。");
  },
  "del-mall-cat"(el) {
    const name = el.dataset.name;
    if (state.products.some((item) => item.cat === name && item.on)) return notify("这个类目下还有在售商品，不能删");
    state.mallCats = state.mallCats.filter((item) => item !== name);
    notify("已删除");
  },
  "save-fee"() {
    const yuanValue = Number(document.getElementById("fee").value);
    if (yuanValue < 0 || Number.isNaN(yuanValue)) return notify("配送费不能是负数");
    state.fee = Math.round(yuanValue * 100);
    notify(`线下配送费改为 ¥${yuan(state.fee)}。只影响新的线下订单。`);
  },
  "save-post"() {
    const postage = Number(document.getElementById("postage").value);
    const freeShip = Number(document.getElementById("free-ship").value);
    if (Number.isNaN(postage) || postage < 0) return notify("邮费不能是负数");
    if (Number.isNaN(freeShip) || freeShip < 0) return notify("包邮门槛不能是负数");
    state.postage = Math.round(postage * 100);
    state.freeShip = Math.round(freeShip * 100);
    notify(`快递未满 ¥${yuan(state.freeShip)} 收 ¥${yuan(state.postage)}。只影响新订单。`);
  },
  slot(el) {
    if (!pullSlots()) return;
    const item = state.slots.find((row) => row.id === el.dataset.id);
    if (!item) return;
    item.on = !item.on;
    notify(item.on ? "时段已重新打开。保存后，新的线下订单才能选。" : "时段已停用。保存后，新的线下订单不能选。");
  },
  "drop-slot"(el) {
    if (!pullSlots()) return;
    if (state.slots.length <= 1) return notify("至少留一个时段");
    state.slots = state.slots.filter((row) => row.id !== el.dataset.id);
    render();
  },
  "add-slot"() {
    if (!pullSlots()) return;
    state.slots.push({ id: `s${Date.now()}`, name: "傍晚", start: "17:00", end: "20:00", on: true });
    render();
  },
  "save-slots"() {
    const slots = pullSlots();
    if (!slots) return;
    state.slots = slots;
    notify("时段已保存。只影响之后的新线下订单。日期仍从明天起，由小程序生成。");
  },
  "city-mode"(el) {
    const item = state.cities.find((row) => row.name === el.dataset.name);
    item.mode = item.mode === "local" ? "post" : "local";
    const areas = state.districts.filter((row) => row.city === item.name && row.on);
    notify(item.mode === "local" ? (areas.length ? `${item.name}改为线下配送。` : `${item.name}改为线下配送。还没有可送的区，新订单不能付。`) : `${item.name}改为快递。满门槛包邮。`);
  },
  "add-city"() {
    const name = document.getElementById("new-city").value.trim();
    if (!name) return notify("先写城市名");
    if (state.cities.some((item) => item.name === name)) return notify("已经有这个城市");
    state.cities.push({ name, mode: "post" });
    notify("已添加。默认走快递，全市可下单。");
  },
  "remove-listing"(el) {
    const reason = document.getElementById("remove-reason").value.trim();
    if (!reason) return notify("写下架原因，卖家需要看到");
    const item = listing(el.dataset.id);
    item.status = "已下架";
    item.reason = reason;
    notify("已强制下架。信息流里不再出现。");
  },
  "add-flea-cat"() {
    const name = document.getElementById("new-flea-cat").value.trim();
    if (!name) return notify("先写类目名");
    if (state.fleaCats.includes(name)) return notify("已经有这个类目");
    state.fleaCats.push(name);
    notify("已添加。只出现在闲置发布页。");
  },
  "del-flea-cat"(el) {
    const name = el.dataset.name;
    if (state.listings.some((item) => item.cat === name && item.status === "在售")) return notify("还有在售帖子用这个类目，不能删");
    state.fleaCats = state.fleaCats.filter((item) => item !== name);
    notify("已删除");
  },
  "ignore-report"(el) {
    const item = state.reports.find((row) => row.id === el.dataset.id);
    item.open = false;
    notify("已忽略。帖子保持原样。");
  },
  "report-takedown"(el) {
    const item = state.reports.find((row) => row.id === el.dataset.id);
    const post = listing(item.listing);
    if (post) post.status = "已下架";
    item.open = false;
    notify("帖子已强制下架，这条举报关掉。");
  }
};

function bind() {
  document.body.addEventListener("click", (event) => {
    const el = event.target.closest("[data-go],[data-action]");
    if (!el) return;
    if (el.dataset.go) { go(el.dataset.go); return; }
    const fn = actions[el.dataset.action];
    if (fn) fn(el);
  });
  document.body.addEventListener("change", (event) => {
    const el = event.target.closest("[data-district]");
    if (!el) return;
    const item = state.districts.find((row) => row.id === el.dataset.district);
    item.on = el.checked;
    notify(item.on ? `${item.name}可以结算` : `${item.name}不能再下单，已保存的地址还在`);
  });
  window.addEventListener("hashchange", render);
}

bind();
if (!location.hash) location.hash = "#/home";
render();
