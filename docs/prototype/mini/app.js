const LOCAL_FEE = 600;
const POSTAGE = 800;
const FREE_SHIP = 5000;
const CITIES = [
  { id: "sydney", zh: "悉尼", en: "Sydney", mode: "local" },
  { id: "melbourne", zh: "墨尔本", en: "Melbourne", mode: "local" },
  { id: "canberra", zh: "堪培拉", en: "Canberra", mode: "post" }
];
const DISTRICTS = [
  { id: "cbd-s", city: "sydney", zh: "悉尼市中心", en: "Sydney CBD", on: true },
  { id: "inner-west", city: "sydney", zh: "内西区", en: "Inner West", on: true },
  { id: "eastern", city: "sydney", zh: "东区", en: "Eastern Suburbs", on: true },
  { id: "parramatta", city: "sydney", zh: "帕拉马塔", en: "Parramatta", on: false },
  { id: "cbd-m", city: "melbourne", zh: "墨尔本市中心", en: "Melbourne CBD", on: true },
  { id: "inner-north", city: "melbourne", zh: "内北区", en: "Inner North", on: true },
  { id: "stkilda", city: "melbourne", zh: "圣基尔达", en: "St Kilda", on: true },
  { id: "dandenong", city: "melbourne", zh: "丹德农", en: "Dandenong", on: false },
  { id: "civic", city: "canberra", zh: "市民中心", en: "Civic", on: true },
  { id: "barton", city: "canberra", zh: "巴顿", en: "Barton", on: true },
  { id: "belconnen", city: "canberra", zh: "贝尔康宁", en: "Belconnen", on: true }
];
const MALL_CATS = ["清洁", "床品", "厨房", "食饮"];
const FLEA_CATS = ["日用品", "床上用品", "家具", "母婴", "数码", "其他"];
const CONDITIONS = ["全新", "几乎全新", "轻微使用", "明显使用"];
const REFUND_REASONS = ["不想要了", "地址选错了", "送达有问题", "其他"];
const REPORT_REASONS = ["虚假信息", "骚扰", "违禁品", "其他"];
const SLOTS = [
  { id: "am", zh: "上午", en: "Morning", start: "8:00", end: "12:00", on: true },
  { id: "pm", zh: "下午", en: "Afternoon", start: "12:00", end: "17:00", on: true }
];
const PLACES = [
  { id: "norton", line: "12 Norton Street", suburb: "inner-west", city: "sydney", postcode: "2040", formatted: "12 Norton Street, Leichhardt NSW 2040" },
  { id: "church", line: "88 Church Street", suburb: "parramatta", city: "sydney", postcode: "2150", formatted: "88 Church Street, Parramatta NSW 2150" },
  { id: "martin", line: "1 Martin Place", suburb: "cbd-s", city: "sydney", postcode: "2000", formatted: "1 Martin Place, Sydney NSW 2000" },
  { id: "oxford", line: "100 Oxford Street", suburb: "eastern", city: "sydney", postcode: "2022", formatted: "100 Oxford Street, Bondi Junction NSW 2022" },
  { id: "bourke", line: "200 Bourke Street", suburb: "cbd-m", city: "melbourne", postcode: "3000", formatted: "200 Bourke Street, Melbourne VIC 3000" },
  { id: "lygon", line: "50 Lygon Street", suburb: "inner-north", city: "melbourne", postcode: "3053", formatted: "50 Lygon Street, Carlton VIC 3053" },
  { id: "acland", line: "12 Acland Street", suburb: "stkilda", city: "melbourne", postcode: "3182", formatted: "12 Acland Street, St Kilda VIC 3182" },
  { id: "walker", line: "12 Walker Street", suburb: "dandenong", city: "melbourne", postcode: "3175", formatted: "12 Walker Street, Dandenong VIC 3175" },
  { id: "london", line: "18 London Circuit", suburb: "civic", city: "canberra", postcode: "2601", formatted: "18 London Circuit, Canberra ACT 2601" },
  { id: "national", line: "1 National Circuit", suburb: "barton", city: "canberra", postcode: "2600", formatted: "1 National Circuit, Barton ACT 2600" },
  { id: "benjamin", line: "12 Benjamin Way", suburb: "belconnen", city: "canberra", postcode: "2617", formatted: "12 Benjamin Way, Belconnen ACT 2617" }
];
const STATUS = {
  unpaid: ["待支付", "warn"],
  pending: ["待配送", "ok"],
  delivering: ["配送中", "ok"],
  done: ["已完成", "mute"],
  refunding: ["退款中", "warn"],
  refunded: ["已退款", "mute"],
  cancelled: ["已取消", "mute"]
};
const PHRASE = {
  清洁: "Cleaning",
  床品: "Bedding",
  厨房: "Kitchen",
  食饮: "Food",
  日用品: "Daily goods",
  床上用品: "Bedding",
  家具: "Furniture",
  母婴: "Baby",
  数码: "Electronics",
  其他: "Other",
  全部: "All",
  全新: "New",
  几乎全新: "Like new",
  轻微使用: "Lightly used",
  明显使用: "Well used",
  待支付: "To pay",
  待配送: "To deliver",
  配送中: "On the way",
  已完成: "Completed",
  退款中: "Refunding",
  已退款: "Refunded",
  已取消: "Cancelled",
  在售: "For sale",
  已出: "Sold",
  已下架: "Unlisted",
  不想要了: "Changed my mind",
  地址选错了: "Wrong address",
  送达有问题: "Delivery problem",
  虚假信息: "False information",
  骚扰: "Harassment",
  违禁品: "Prohibited goods",
  已截单: "Cut-off passed",
  快递寄出: "Posted by courier",
  放门口: "Leave at the door",
  默认: "Default",
  可小议: "Negotiable",
  缺货: "Sold out",
  暂不配送: "Outside the delivery area",
  不在当前城市: "Different city",
  仅展示: "Display only",
  未产生: "Not charged",
  审核中: "In review",
  已退: "Refunded",
  当前: "Current",
  线下配送: "Local delivery",
  快递: "Courier"
};

const pages = [
  ["商城", "#/mall", [
    "左上角圆钮是消息，旁边的圆钮是当前城市。商城和闲置共用这一个城市，默认悉尼。",
    "顶栏「EN」切换英文，再点回到中文。按钮、城市、商品名跟着换。",
    "商品是两列瀑布流，封面有正方形也有长方形。每张卡片下面有一个大圆点赞，没有评价。",
    "悉尼和墨尔本走线下配送。结算从明天起选日期，再选上午或下午。",
    "堪培拉走快递。全市可下单，商品满 50 元包邮，不满加 8 元。没有日期，也没有时段。",
    "类目只有清洁、床品、厨房、食饮。一个商品一个价，没有规格。"
  ]],
  ["商城", "#/mall?city=canberra", [
    "堪培拉没有「商城未开通」。商品照常展示，可以搜索和下单。",
    "首页写明走快递，以及满 50 元包邮、未满加 8 元。",
    "这个城市的闲置如果是空的，去闲置页会看到空态。"
  ]],
  ["商城", "#/city", [
    "城市是悉尼、墨尔本、堪培拉。圆钮和这张列表里都不要出现中国城市。",
    "墨尔本是澳大利亚维多利亚州的首府。悉尼、墨尔本标「线下配送」，堪培拉标「快递」。",
    "从商城、闲置或发布页进来，选完回到刚才那一页。发布页的草稿还在。"
  ]],
  ["商城", "#/category/清洁", [
    "只展示这个类目下的在售商品。",
    "类目由后台维护，用户只能切换，不能自己新建。",
    "任何城市都能进这一页。能不能付款看配送方式，不看商城开关。"
  ]],
  ["商城", "#/search", [
    "只搜商品名称。中文名和英文名都能匹配。",
    "还没输入时，给出几个可点的词，不展示全部商品。"
  ]],
  ["商城", "#/search?q=没有这个", [
    "没有匹配时给空态，告诉用户换个说法或去分类。",
    "不要用「暂无数据」这种后台口吻。"
  ]],
  ["商城", "#/product/p1", [
    "主图可切换。下面按顺序放主图和细节图。",
    "没有评价。商品下方是大圆点赞，点一下加 1，再点取消。不能点踩。",
    "没有规格，只能改数量，数量不能超过库存。库存不多时提示仅剩几件。",
    "可以加入购物车，也可以立即购买。立即购买不经过购物车。"
  ]],
  ["商城", "#/product/p9", [
    "库存为 0 时不能加购、不能购买，按钮是「暂时缺货」。",
    "详情图仍然要能看。"
  ]],
  ["商城", "#/cart", [
    "可以改数量、删除。数量不能超过库存。",
    "这里只算商品金额。运费到确认订单再算，不按距离。",
    "线下城市固定 6 元。快递城市满 50 元为 0，否则 8 元。"
  ]],
  ["商城", "#/cart?empty=1", [
    "购物车没有商品时给空态，主按钮去商城。",
    "底部购物车角标在真的清空后才会消失。这一页是空态示意。"
  ]],
  ["商城", "#/checkout", [
    "悉尼默认地址在内西区。日期从明天起，默认明天，一共 7 天。时段默认上午。配送费 6 元。",
    "日期和时段都要选。时段来自后台，停用的不能点。不能选今天。",
    "切到堪培拉再来结算：不出现日期和时段，满 50 元包邮，不满加 8 元。",
    "备注可选。微信支付成功后扣库存。稍后付锁定 15 分钟。",
    "没有运单，也没有物流轨迹。"
  ]],
  ["商城", "#/checkout?addr=a2", [
    "帕拉马塔可以选中，但线下配送付不了款。",
    "文案要写出悉尼现在能送哪些区。",
    "可送的区由后台勾选。快递城市不按区拦截。"
  ]],
  ["商城", "#/address", [
    "列出已保存地址。当前城市送不到的留着，并标明原因。",
    "点一条就设为本次收货地址，回到确认订单。",
    "收货手机号只用于配送，不会拿去当闲置的对外联系方式。"
  ]],
  ["商城", "#/address-edit/new", [
    "联系人必填。手机号前面固定是 +61，后面填 412 345 678。",
    "地址只能从检索结果里点选，不能自己写街道。原型用一组示例结果代替谷歌。",
    "点中的地址带区、城市和邮编。送不到的区可以保存，结算时拦截。",
    "可以设为默认。至少保留一个地址，最后一个不能删。"
  ]],
  ["商城", "#/pay-result/o2", [
    "支付成功页展示实付金额和送达方式。",
    "线下写时段。快递写已包邮或邮费，并写明没有物流轨迹。",
    "主按钮去这笔订单，次按钮回商城首页。"
  ]],
  ["商城", "#/pay-result?fail=1", [
    "支付未完成不是取消。订单停在待支付。",
    "15 分钟内可以继续付。超时关闭，并释放锁定的库存。",
    "主按钮去待支付订单。"
  ]],
  ["订单", "#/orders", [
    "筛选项：全部、待支付、待配送、配送中、已完成、退款。",
    "退款包含退款中、已退款，以及还在配送但已经有退款单的订单。",
    "列表展示商品、下单时间、时段或快递、状态和金额。未支付和已取消不计运费。",
    "没有物流单号。"
  ]],
  ["订单", "#/order/o1", [
    "待支付可以继续支付，或取消。",
    "取消不扣款，释放锁定的库存。",
    "页内说明 15 分钟未支付会自动关闭。"
  ]],
  ["订单", "#/order/o2", [
    "待配送时可以退其中几件，钱马上原路退回，不用等审核。",
    "没退完的商品留在这张待配送订单里。全部退完才变成已退款，并退配送费。",
    "只退一部分时，配送费不退。",
    "小程序上没有「开始配送」。一直没人操作的话，时段结束后 24 小时仍会自动完成。"
  ]],
  ["订单", "#/order/o3", [
    "配送中可以确认收货，或申请退款。不能整单自助取消。",
    "只有一件商品时，勾上它就是整单退，提交后订单变为退款中。",
    "确认收货、后台点已送达、时段结束后 24 小时，都会变成已完成。"
  ]],
  ["订单", "#/order/o4", [
    "已完成且还在 7 天内，可以申请退款。这一单有两样商品。",
    "可以只退其中一样，或只退毛巾的一部分数量。",
    "只退一部分时订单仍是已完成。全部未退商品都选上，才进入退款中并连配送费一起申请。",
    "同意才退钱。退款不会自动把库存加回去。"
  ]],
  ["订单", "#/order/o5", [
    "完成超过 7 天，不再出现申请退款。",
    "页内说明已经过了售后期限。"
  ]],
  ["订单", "#/order/o6", [
    "订单还在配送中。玻璃保鲜盒这一件正在退款审核，抽纸继续送。",
    "这一页没有同意或拒绝。审核在管理后台的退款列表。",
    "还有未退完的商品时，不能再提交第二笔退款。"
  ]],
  ["订单", "#/order/o7", [
    "已退款是终态。展示退回结果。",
    "没有继续支付、确认收货或再次申请。"
  ]],
  ["订单", "#/order/o8", [
    "未支付关闭。未扣款，运费记为未产生。",
    "没有继续支付。"
  ]],
  ["订单", "#/refund/o4", [
    "勾选要退的商品。数量大于 1 时可以只退几件。",
    "下面的金额只含勾选的商品。没有把未退商品都选上时，不含配送费。",
    "这一单已经完成，提交后等后台同意，订单先保持已完成。",
    "待配送的 o2 用同一张页面，但提交后马上退，不等审核。"
  ]],
  ["闲置", "#/flea", [
    "左上角同样是消息，旁边是城市，和商城是同一个。",
    "帖子是两列瀑布流，封面有正方形也有长方形。闲置没有点赞。",
    "列表只看这个城市、且未下架的帖子。",
    "类目和商城分开。价格只展示，可小议要标出来。",
    "右下角是发布入口。不收款、不担保、没有聊天。"
  ]],
  ["闲置", "#/flea?city=canberra", [
    "堪培拉还没有帖子时给空态。",
    "可以换城市，或发布第一条。空态不是故障。"
  ]],
  ["闲置", "#/listing/l1", [
    "买家视角。价格只展示，不在这里付款。",
    "联系方式默认锁住。底部是举报和申请联系方式。",
    "评论按时间正序，回复只嵌一层。评论和回复会进对方的消息。"
  ]],
  ["闲置", "#/listing/l2", [
    "卖家看自己的帖。申请列表能看到头像、昵称、时间和附言。",
    "同意后才把预留的手机号或微信号给对方。拒绝只挡这一次，对方还可以再申请。",
    "不想再被同一个人申请，点「拒绝此人申请联系方式」。",
    "底部可以编辑、标为已出、下架。"
  ]],
  ["闲置", "#/listing/l4", [
    "买家已经通过申请。展示卖家的澳大利亚手机号和微信号，可以复制手机号。",
    "仍然没有聊天。"
  ]],
  ["闲置", "#/listing/l5", [
    "这一次被拒绝。说明可以再次申请，底部仍有申请按钮。"
  ]],
  ["闲置", "#/listing/l5?block=1", [
    "卖家点过「拒绝此人」。说明不能再申请这条的联系方式。",
    "底部不再出现申请按钮。"
  ]],
  ["闲置", "#/listing/l3", [
    "已出。帖子还在，但不能申请联系方式，也不能再编辑。"
  ]],
  ["闲置", "#/apply/l1", [
    "对方只会看到头像、昵称和这句附言。",
    "附言可以不写。被拒绝这一次之后，还可以再提交。被「拒绝此人」之后，这一页进不去。"
  ]],
  ["闲置", "#/publish", [
    "实拍 1 到 9 张，第一张是封面。标题、标价、描述必填。",
    "成色四选一。类目只能选后台已有的。城市和商城共用。",
    "已经留过联系方式时，这里只展示手机号和微信号。帖子正文不出现号码。"
  ]],
  ["闲置", "#/publish?nocontact=1", [
    "从没留过联系方式时，就在这一页填。手机号和微信号至少填一个。",
    "手机号前面固定是 +61。收货地址里的电话不会自动填进来。",
    "两个都空着不能发布。"
  ]],
  ["闲置", "#/my-listings", [
    "只看自己发布的，包含在售、已出、已下架。",
    "没有发布过时给空态，主按钮去发布。"
  ]],
  ["闲置", "#/report/l1", [
    "可以举报整条帖子，也可以举报某一楼。",
    "提交后帖子先留着。后台可以强制下架。"
  ]],
  ["我的", "#/me", [
    "示例用户林可。四个订单入口带数量。",
    "消息有未读时，页签、这一行、以及首页左上角都有红点。",
    "顶栏语言开关在这一页同样生效。",
    "收货地址和给买家的联系方式分成两行。联系客服走微信客服。"
  ]],
  ["我的", "#/messages", [
    "评论、回复、联系方式申请和申请结果都进这个列表。",
    "首页和闲置左上角进的是同一张列表。",
    "点开后未读消失。"
  ]],
  ["我的", "#/message/m2", [
    "卖家收到的联系方式申请。正文要有谁、哪条帖子、附言。",
    "主按钮去自己的帖子处理，不在消息页里直接同意或拒绝。"
  ]],
  ["我的", "#/contact", [
    "给买家的手机号或微信号，至少留一种。不会写进帖子。",
    "手机号前面固定是 +61。和收货电话分开保存。"
  ]],
  ["我的", "#/service", [
    "正式环境使用小程序客服按钮。",
    "这不是买家和卖家的聊天。",
    "游客也能进，不用先登录。"
  ]],
  ["登录", "#/mall?guest=1", [
    "游客可以逛商城：类目、搜索、商品详情、切换城市、切换语言。",
    "点赞和左上角消息会先要求微信登录。",
    "加入购物车不用登录。立即购买要登录，并且已经绑定澳洲手机号。"
  ]],
  ["登录", "#/flea?guest=1", [
    "游客可以看这个城市的在售帖子，也能打开详情看图文和评论。",
    "右下角发布、左上角消息，都会先要求登录。发布还要先绑定澳洲手机号。",
    "发评论、回复、举报、申请联系方式只要登录，不要求已经绑定手机号。"
  ]],
  ["登录", "#/product/p1?guest=1", [
    "这一页游客也能看。改数量、加入购物车都不用登录。",
    "点赞会弹出微信登录。立即购买会先登录，登录后去绑定澳洲手机号。"
  ]],
  ["登录", "#/cart?guest=1", [
    "购物车在这台手机上，游客可以改数量、删除。",
    "点去结算才要求登录。还没绑定澳洲手机号时，结算前会先去绑定。"
  ]],
  ["登录", "#/me?guest=1", [
    "游客的「我的」只有登录、当前城市和客服。",
    "没有订单、消息、地址和联系方式。那些要点登录之后才出现。",
    "客服不用登录。"
  ]],
  ["登录", "#/login", [
    "微信快捷登录。成功的标准是拿到 openid 和 unionid。",
    "不使用微信手机号授权。那个号码是国内的，在澳洲打不通。",
    "登录成功后进入绑定澳洲手机号。可以稍后绑定，先回去逛。"
  ]],
  ["登录", "#/bind-phone", [
    "账号上的澳洲手机号。输入框前面是 +61，规则和收货电话一样。",
    "第一版不发短信验证码，只校验是不是澳洲手机号。",
    "下单、收货地址、发布闲置、给买家的联系方式，都要先有这个号。",
    "点赞、评论、申请联系方式、看订单和消息，不要求已经绑定。"
  ]],
  ["登录", "#/me?nophone=1", [
    "已经有 openid 和 unionid，但还没绑定澳洲手机号。",
    "订单、消息、我的闲置能看。点地址、联系方式或去下单，会先去绑定。",
    "这个号码不会自动写进给买家的联系方式。"
  ]]
];

const state = {
  lang: "zh",
  city: "sydney",
  auth: "member",
  afterAuth: "",
  accountPhone: "0412345678",
  contact: { phone: "0412345678", wechat: "xiangkou_lin" },
  cart: [
    { id: "p1", qty: 1 },
    { id: "p5", qty: 2 }
  ],
  addressId: "a1",
  slotId: "am",
  deliveryDate: "2026-10-28",
  likes: {},
  buyNow: null,
  detailQty: 1,
  imageIndex: 0,
  photoSlots: [],
  fleaCat: "全部",
  fleaQ: "",
  replyTo: null,
  refundPick: {},
  form: {},
  dialog: null,
  toast: "",
  lastHash: "",
  addresses: [
    { id: "a1", name: "林可", phone: "0412345678", city: "sydney", district: "inner-west", detail: "12 Norton Street", postcode: "2040", placeId: "norton", formatted: "12 Norton Street, Leichhardt NSW 2040", isDefault: true },
    { id: "a2", name: "林可", phone: "0412345678", city: "sydney", district: "parramatta", detail: "88 Church Street", postcode: "2150", placeId: "church", formatted: "88 Church Street, Parramatta NSW 2150", isDefault: false },
    { id: "a3", name: "林可", phone: "0412345678", city: "canberra", district: "civic", detail: "18 London Circuit", postcode: "2601", placeId: "london", formatted: "18 London Circuit, Canberra ACT 2601", isDefault: false }
  ],
  products: [
    { id: "p1", name: "无香洗衣液 2kg", nameEn: "Unscented detergent 2kg", cat: "清洁", price: 3900, stock: 20, sold: 128, char: "洁", tone: "clay", images: ["images/p1-hero.jpg", "images/p1-detail.jpg"], desc: "无香配方，适合敏感衣物。下单后按你所在城市配送。", descEn: "Unscented, for sensitive clothes. Delivery follows the city you selected.", detail: "2kg 装。没有物流单号。", detailEn: "2kg bottle. No tracking number.", ratio: "tall", baseLikes: 36 },
    { id: "p2", name: "新疆棉四件套", nameEn: "Cotton sheet set", cat: "床品", price: 26800, stock: 6, sold: 42, char: "床", tone: "sand", images: ["images/p2-hero.jpg", "images/p2-detail.jpg"], desc: "长绒棉，被套、床单和一对枕套。", descEn: "Long-staple cotton: duvet cover, sheet and two pillowcases.", detail: "一套四件。不另选规格。", detailEn: "One set. No size options.", ratio: "square", baseLikes: 128 },
    { id: "p3", name: "铸铁煎锅 26cm", nameEn: "Cast-iron skillet 26cm", cat: "厨房", price: 14900, stock: 8, sold: 57, char: "锅", tone: "ink", images: ["images/p3-hero.jpg", "images/p3-detail.jpg"], desc: "已经养过的铸铁锅，到手就能用。", descEn: "Seasoned cast iron, ready to use.", detail: "口径 26cm。比较重，配送时会先打电话。", detailEn: "26cm. It is heavy, so we call before dropping it off.", ratio: "tall", baseLikes: 64 },
    { id: "p4", name: "冷榨菜籽油 1.8L", nameEn: "Cold-pressed rapeseed oil 1.8L", cat: "食饮", price: 5800, stock: 15, sold: 96, char: "油", tone: "gold", images: ["images/p4-hero.jpg", "images/p4-detail.jpg"], desc: "冷榨菜籽油，日常炒菜用。", descEn: "Cold-pressed rapeseed oil for everyday cooking.", detail: "1.8L。请放稳。", detailEn: "1.8L. Keep it upright.", ratio: "square", baseLikes: 91 },
    { id: "p5", name: "竹浆抽纸 24 包", nameEn: "Bamboo tissues, 24 packs", cat: "清洁", price: 3290, stock: 30, sold: 210, char: "纸", tone: "pine", images: ["images/p5-hero.jpg", "images/p5-detail.jpg"], desc: "竹浆抽纸，一整箱 24 包。", descEn: "A carton of 24 bamboo tissue packs.", detail: "家庭装。运费在确认订单里按城市计算。", detailEn: "Family pack. Delivery is calculated at checkout by city.", ratio: "tall", baseLikes: 210 },
    { id: "p6", name: "纯棉毛巾两条", nameEn: "Cotton towels, set of two", cat: "床品", price: 2900, stock: 18, sold: 73, char: "巾", tone: "rose", images: ["images/p6-hero.jpg", "images/p6-detail.jpg"], desc: "纯棉毛巾，两条装。", descEn: "Two cotton towels.", detail: "颜色以实拍为准。", detailEn: "Colours as photographed.", ratio: "square", baseLikes: 47 },
    { id: "p7", name: "玻璃保鲜盒三件套", nameEn: "Glass containers, set of 3", cat: "厨房", price: 4600, stock: 11, sold: 39, char: "盒", tone: "sand", images: ["images/p7-hero.jpg", "images/p7-detail.jpg"], desc: "玻璃盒加盖，三件一套。", descEn: "Three glass containers with lids.", detail: "可放冰箱。玻璃易碎。", detailEn: "Fridge safe. Glass, so it can crack.", ratio: "tall", baseLikes: 22 },
    { id: "p8", name: "手工挂面 1kg", nameEn: "Handmade noodles 1kg", cat: "食饮", price: 1600, stock: 40, sold: 154, char: "面", tone: "gold", images: ["images/p8-hero.jpg", "images/p8-detail.jpg"], desc: "手工挂面，一袋 1kg。", descEn: "Handmade noodles, 1kg bag.", detail: "干货。支付成功后才扣库存。", detailEn: "Dry goods. Stock is deducted after payment.", ratio: "square", baseLikes: 73 },
    { id: "p9", name: "当季柑橘 2.5kg", nameEn: "Seasonal mandarins 2.5kg", cat: "食饮", price: 2990, stock: 0, sold: 80, char: "橘", tone: "clay", images: ["images/p9-hero.jpg", "images/p9-detail.jpg"], desc: "当季柑橘，约 2.5kg。", descEn: "Seasonal mandarins, about 2.5kg.", detail: "这一批已经卖完。补货前不能下单。", detailEn: "This batch is sold out. You cannot order until it is restocked.", ratio: "tall", baseLikes: 15 }
  ],
  orders: [],
  listings: [],
  messages: []
};

function t(zh, en) { return state.lang === "en" ? en : zh; }
function tr(text) {
  if (!text || state.lang !== "en") return text || "";
  if (PHRASE[text]) return PHRASE[text];
  return String(text).replace(/(\d+)\s*分钟前/g, "$1 min ago").replace(/昨天/g, "Yesterday").replace(/今天/g, "Today").replace(/明天/g, "Tomorrow").replace(/刚刚/g, "Just now");
}
function tx(obj, key) {
  if (!obj) return "";
  if (state.lang === "en" && obj[`${key}En`]) return obj[`${key}En`];
  return obj[key] || "";
}
function h(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function yuan(cents) {
  const sign = cents < 0 ? "-" : "";
  const v = Math.abs(cents);
  const fen = v % 100;
  return fen ? `${sign}${Math.floor(v / 100)}.${String(fen).padStart(2, "0")}` : `${sign}${Math.floor(v / 100)}`;
}
function money(cents) { return `¥${yuan(cents)}`; }
function svg(inner) {
  return `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}
const icons = {
  home: svg('<path d="m3 9 9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>'),
  flea: svg('<path d="M6 4h12v16H6z"/><path d="M9 8h6M9 12h6M9 16h3"/>'),
  cart: svg('<circle cx="8" cy="20" r="1"/><circle cx="18" cy="20" r="1"/><path d="M3 4h2l2.2 11h11.3l1.8-7H7"/>'),
  user: svg('<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="8" r="4"/>'),
  back: svg('<path d="m15 18-6-6 6-6"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  check: svg('<path d="m5 12 5 5L20 7"/>'),
  close: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
  bell: svg('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/>'),
  thumb: svg('<path d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z"/><path d="M7 11l3.2-6.2A2 2 0 0 1 12 4a2 2 0 0 1 2 2v3h4.2a2 2 0 0 1 2 2.3l-1 6.5A2 2 0 0 1 17.2 20H7"/>')
};
function product(id) { return state.products.find((item) => item.id === id); }
function listing(id) { return state.listings.find((item) => item.id === id); }
function order(id) { return state.orders.find((item) => item.id === id); }
function addressById(id) { return state.addresses.find((item) => item.id === id); }
function currentAddress() { return addressById(state.addressId) || state.addresses[0]; }
function cityById(id) { return CITIES.find((item) => item.id === id) || CITIES[0]; }
function cityLabel(id) {
  const city = cityById(id);
  return state.lang === "en" ? city.en : city.zh;
}
function districtById(id) { return DISTRICTS.find((item) => item.id === id); }
function districtLabel(id) {
  const district = districtById(id);
  if (!district) return id || "";
  return state.lang === "en" ? district.en : district.zh;
}
function districtsOf(cityId) { return DISTRICTS.filter((item) => item.city === cityId); }
function modeOf(cityId) { return cityById(cityId).mode; }
function shipQuote(goods, cityId) {
  if (modeOf(cityId) === "local") return { fee: LOCAL_FEE, free: false, mode: "local" };
  if (goods >= FREE_SHIP) return { fee: 0, free: true, mode: "post" };
  return { fee: POSTAGE, free: false, mode: "post" };
}
function addressOk(addr) {
  if (!addr || addr.city !== state.city) return false;
  if (modeOf(addr.city) === "post") return true;
  const district = districtById(addr.district);
  return !!(district && district.on && district.city === addr.city);
}
function addressHint(addr) {
  if (!addr) return "";
  if (addr.city !== state.city) return tr("不在当前城市");
  if (addressOk(addr)) return "";
  return tr("暂不配送");
}
function areaList(cityId) {
  const sep = state.lang === "en" ? ", " : "、";
  return districtsOf(cityId).filter((item) => item.on).map((item) => districtLabel(item.id)).join(sep);
}
function normalizeAuMobile(input) {
  let value = String(input || "").replace(/[\s\-()]/g, "");
  if (value.startsWith("+61")) value = `0${value.slice(3)}`;
  else if (value.startsWith("61") && value.length === 11) value = `0${value.slice(2)}`;
  else if (/^4\d{8}$/.test(value)) value = `0${value}`;
  return /^04\d{8}$/.test(value) ? value : "";
}
function phoneNational(phone) {
  const value = normalizeAuMobile(phone);
  if (!value) return "";
  return value.slice(1).replace(/^(\d{3})(\d{3})(\d{3})$/, "$1 $2 $3");
}
function phonePretty(phone) {
  const national = phoneNational(phone);
  return national ? `+61 ${national}` : String(phone || "");
}
function phoneField(id, stored) {
  return `<span class="phone-row"><b>+61</b><input id="${id}" inputmode="tel" maxlength="14" placeholder="412 345 678" value="${h(phoneNational(stored))}" aria-label="+61"></span>`;
}
const TODAY = { y: 2026, m: 10, d: 27 };
function deliveryDates() {
  const start = new Date(TODAY.y, TODAY.m - 1, TODAY.d);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index + 1);
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return { iso, date };
  });
}
function datePretty(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!m || !d) return iso;
  if (state.lang === "en") return `${d} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]} ${y}`;
  return `${y}年${m}月${d}日`;
}
function dateChip(iso) {
  const dates = deliveryDates();
  const hit = dates.find((item) => item.iso === iso);
  const weekEn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const head = hit && iso === dates[0].iso
    ? t("明天", "Tomorrow")
    : hit
      ? (state.lang === "en" ? weekEn[hit.date.getDay()] : `周${"日一二三四五六"[hit.date.getDay()]}`)
      : "";
  const sub = hit ? (state.lang === "en" ? datePretty(iso).replace(/ \d{4}$/, "") : `${hit.date.getMonth() + 1}月${hit.date.getDate()}日`) : datePretty(iso);
  return { head, sub };
}
function slotById(id) { return SLOTS.find((item) => item.id === id); }
function slotText(slot) {
  if (!slot) return "";
  return `${state.lang === "en" ? slot.en : slot.zh} ${slot.start}–${slot.end}`;
}
function likeCount(item) { return (item.baseLikes || 0) + (state.likes[item.id] ? 1 : 0); }
function likeButton(item, large) {
  const on = !!state.likes[item.id];
  return `<button type="button" class="like ${large ? "like-lg" : ""} ${on ? "on" : ""}" data-action="like" data-id="${item.id}" aria-pressed="${on}" aria-label="${h(t(on ? "取消点赞" : "点赞", on ? "Unlike" : "Like"))}"><span class="like-circle">${icons.thumb}</span><small>${likeCount(item)}</small></button>`;
}
function placeById(id) { return PLACES.find((item) => item.id === id); }
function placeSuggestHtml(query) {
  const q = String(query || "").trim().toLowerCase();
  if (q.length < 2) return `<p class="muted">${h(t("至少输入两个字，再从结果里点一条。", "Type at least two characters, then pick a result."))}</p>`;
  const hits = PLACES.filter((item) => {
    const district = districtById(item.suburb);
    const blob = `${item.formatted} ${item.line} ${item.postcode} ${district ? `${district.zh} ${district.en}` : ""} ${cityById(item.city).zh} ${cityById(item.city).en}`.toLowerCase();
    return blob.includes(q);
  }).slice(0, 6);
  if (!hits.length) return `<p class="muted">${h(t("没有匹配的地址。换个街道或邮编。不能自己写。", "No match. Try another street or postcode. You cannot type one in."))}</p>`;
  return hits.map((item) => `<button type="button" class="place-hit" data-action="pick-place" data-id="${item.id}"><b>${h(item.line)}</b><small>${h(districtLabel(item.suburb))} · ${h(cityLabel(item.city))} ${h(item.postcode)}</small></button>`).join("");
}
function addressLine(addr) {
  if (!addr) return "";
  return addr.formatted || `${addr.detail || ""} ${districtLabel(addr.district)} ${addr.postcode || ""}`.trim();
}
function unreadCount() {
  if (state.auth === "guest") return 0;
  return state.messages.filter((item) => !item.read).length;
}
function owns(item) { return !!(item && item.mine && state.auth !== "guest"); }
function authFromHash(hash) {
  const value = hash || "#/mall";
  if (/[?&]guest=1/.test(value) || value.startsWith("#/login")) return "guest";
  if (/[?&]nophone=1/.test(value) || value.startsWith("#/bind-phone")) return "nophone";
  return "member";
}
function stripAuthQuery(hash) {
  const raw = hash || "#/mall";
  const [path, qs = ""] = raw.split("?");
  const params = new URLSearchParams(qs);
  params.delete("guest");
  params.delete("nophone");
  const next = params.toString();
  const cleaned = `${path}${next ? `?${next}` : ""}`;
  if (cleaned.startsWith("#/login") || cleaned.startsWith("#/bind-phone")) return "#/me";
  return cleaned || "#/mall";
}
function hashNeedsPhone(hash) {
  return /^#\/(checkout|address-edit|address|publish|contact)(\/|\?|$)/.test(hash || "");
}
function hashNeedsLogin(hash) {
  return hashNeedsPhone(hash) || /^#\/(orders|order|refund|messages|message|my-listings|apply|report|pay-result)(\/|\?|$)/.test(hash || "");
}
function requireLogin(after) {
  if (state.auth !== "guest") return true;
  state.afterAuth = after || (location.hash || "#/mall");
  ask(
    t("请用微信登录", "Sign in with WeChat"),
    t("登录只拿 openid 和 unionid，就算成功。微信里的是国内手机号，在澳洲打不通，这里不取那个号码。", "Login only takes openid and unionid. The WeChat number is a China mobile and does not work in Australia, so we do not take it."),
    t("微信快捷登录", "Continue with WeChat"),
    () => {
      state.auth = "nophone";
      go("#/bind-phone");
    }
  );
  return false;
}
function requirePhone(after) {
  if (!requireLogin(after)) return false;
  if (state.auth === "member") return true;
  state.afterAuth = after || (location.hash || "#/mall");
  go("#/bind-phone");
  return false;
}
function bounce(route) {
  if (route.name === "login" || route.name === "bind-phone") return false;
  const hash = location.hash || "#/mall";
  if (state.auth === "guest" && hashNeedsLogin(hash)) {
    state.afterAuth = hash;
    go("#/login");
    return true;
  }
  if (state.auth !== "member" && hashNeedsPhone(hash)) {
    state.afterAuth = hash;
    go("#/bind-phone");
    return true;
  }
  return false;
}
function cartCount() { return state.cart.reduce((sum, line) => sum + line.qty, 0); }
function moneyOf(lines) { return lines.reduce((sum, line) => sum + line.price * line.qty, 0); }
function lineLeft(line) { return line.qty - (line.refunded || 0); }
function openRefund(item) { return (item.refunds || []).find((row) => row.status === "open"); }
function refundedCents(item) {
  return (item.refunds || []).filter((row) => row.status === "approved").reduce((sum, row) => sum + row.amount, 0);
}
function paidOf(item) {
  if (item.status === "unpaid" || item.status === "cancelled") return item.goods;
  return item.goods + (item.shipFee || 0);
}
function cityHead(copy) {
  const unread = unreadCount();
  return `<div class="flea-head"><div class="head-tools"><button type="button" class="msg-entry" data-go="#/messages" aria-label="${h(t("消息", "Messages"))}">${icons.bell}${unread ? `<i class="badge">${unread}</i>` : ""}</button><button type="button" class="city-switch" data-go="#/city">${h(cityLabel(state.city))}</button></div><p>${copy}</p></div>`;
}
function syncAddressToCity() {
  const current = addressById(state.addressId);
  if (current && current.city === state.city) return;
  const next = state.addresses.find((addr) => addr.city === state.city);
  if (next) state.addressId = next.id;
}

function seed() {
  const addr = state.addresses[0];
  const snap = { name: addr.name, phone: addr.phone, city: addr.city, district: addr.district, detail: addr.detail, postcode: addr.postcode, formatted: addr.formatted, placeId: addr.placeId };
  const line = (id, qty, refunded = 0) => {
    const item = product(id);
    return { id, name: item.name, nameEn: item.nameEn, price: item.price, qty, refunded, char: item.char, tone: item.tone, image: item.images[0] };
  };
  const refundLine = (id, qty) => {
    const item = product(id);
    return { id, name: item.name, nameEn: item.nameEn, price: item.price, qty };
  };
  const blank = () => ({ address: { ...snap }, fulfillment: "local", city: "sydney", shipFee: 600, refunds: [] });
  state.orders = [
    { ...blank(), id: "o1", status: "unpaid", created: "10-27 16:58", deliveryDate: "2026-10-28", slotLabel: "上午 8:00–12:00", slotLabelEn: "Morning 8:00–12:00", items: [line("p8", 2)], remark: "", goods: 3200 },
    { ...blank(), id: "o2", status: "pending", created: "10-27 15:20", deliveryDate: "2026-10-28", slotLabel: "上午 8:00–12:00", slotLabelEn: "Morning 8:00–12:00", items: [line("p1", 1), line("p5", 1)], remark: "放门口", goods: 7190 },
    { ...blank(), id: "o3", status: "delivering", created: "10-27 11:05", deliveryDate: "2026-10-27", slotLabel: "下午 12:00–17:00", slotLabelEn: "Afternoon 12:00–17:00", items: [line("p3", 1)], remark: "", goods: 14900 },
    { ...blank(), id: "o4", status: "done", created: "10-26 19:12", deliveryDate: "2026-10-26", slotLabel: "下午 12:00–17:00", slotLabelEn: "Afternoon 12:00–17:00", items: [line("p2", 1), line("p6", 2)], remark: "", goods: 32600, doneAt: Date.now() - 86400000 },
    { ...blank(), id: "o5", status: "done", created: "10-10 12:00", deliveryDate: "2026-10-10", slotLabel: "下午 12:00–17:00", slotLabelEn: "Afternoon 12:00–17:00", items: [line("p6", 1)], remark: "", goods: 2900, doneAt: Date.now() - 12 * 86400000 },
    { ...blank(), id: "o6", status: "delivering", created: "10-27 09:40", deliveryDate: "2026-10-27", slotLabel: "上午 8:00–12:00", slotLabelEn: "Morning 8:00–12:00", items: [line("p7", 1), line("p5", 1)], remark: "", goods: 7890, refunds: [{ id: "rf1", status: "open", lines: [refundLine("p7", 1)], goods: 4600, ship: 0, amount: 4600, reason: "送达时盒子有裂痕", reasonEn: "The box arrived cracked", from: "delivering" }] },
    { ...blank(), id: "o7", status: "refunded", created: "10-25 18:02", deliveryDate: "2026-10-25", slotLabel: "下午 12:00–17:00", slotLabelEn: "Afternoon 12:00–17:00", items: [line("p4", 1, 1)], remark: "", goods: 5800, refunds: [{ id: "rf2", status: "approved", lines: [refundLine("p4", 1)], goods: 5800, ship: 600, amount: 6400, reason: "待配送时取消", reasonEn: "Cancelled before delivery", from: "pending" }] },
    { ...blank(), id: "o8", status: "cancelled", created: "10-27 14:10", deliveryDate: "2026-10-27", slotLabel: "下午 12:00–17:00", slotLabelEn: "Afternoon 12:00–17:00", items: [line("p8", 1)], remark: "", goods: 1600, shipFee: 0 }
  ];
  state.listings = [
    {
      id: "l1", mine: false, title: "九成新纯棉四件套", titleEn: "Cotton sheet set, barely used", desc: "住校用了一学期，洗过，没有污渍。自提或你来拿，我不管怎么交易。", descEn: "Used for a term, washed, no stains. Pick it up yourself. The platform does not handle the trade.",
      price: 12000, negotiable: true, condition: "几乎全新", city: "sydney", category: "床上用品",
      char: "床", tone: "sand", imageCount: 4, status: "在售", owner: "周南",
      comments: [
        { id: "c1", user: "阿麦", text: "还在吗？有没有发黄？", textEn: "Still available? Any yellowing?", time: "昨天 21:18", replies: [{ id: "c1r", user: "周南", owner: true, text: "在的，只洗过一次。", textEn: "Yes. Washed once.", time: "昨天 21:40" }] },
        { id: "c2", user: "老谭", text: "帕拉马塔这边，今晚能看吗？", textEn: "I'm in Parramatta. Can I see it tonight?", time: "今天 09:12", replies: [] }
      ]
    },
    {
      id: "l2", mine: true, title: "婴儿推车，八成新", titleEn: "Baby pram, lightly used", desc: "孩子大了用不上。轮子正常，可小议。", descEn: "Outgrown. Wheels are fine. Price is negotiable.",
      price: 26000, negotiable: true, condition: "轻微使用", city: "sydney", category: "母婴",
      char: "车", tone: "pine", imageCount: 3, status: "在售", owner: "林可",
      comments: [{ id: "c3", user: "阿麦", text: "还能折叠吗？", textEn: "Does it still fold?", time: "10 分钟前", replies: [] }],
      requests: [
        { id: "r1", user: "阿麦", note: "周末下午方便看车吗", noteEn: "Free to see the pram on Saturday afternoon?", time: "10 分钟前", status: "pending", attempts: 1 },
        { id: "r2", user: "老谭", note: "上次没同意，这周还能看吗", noteEn: "You declined last time. Can I see it this week?", time: "刚刚", status: "pending", attempts: 2 },
        { id: "r3", user: "周南", note: "便宜一点我就要", noteEn: "I'll take it if the price drops.", time: "昨天", status: "blocked", attempts: 2 }
      ]
    },
    {
      id: "l3", mine: false, title: "电饭煲 3L", titleEn: "Rice cooker 3L", desc: "已经送人。", descEn: "Already given away.",
      price: 8000, negotiable: false, condition: "轻微使用", city: "sydney", category: "日用品",
      char: "煲", tone: "ink", imageCount: 1, status: "已出", owner: "何山", comments: []
    },
    {
      id: "l4", mine: false, title: "落地灯", titleEn: "Floor lamp", desc: "灯泡是好的。", descEn: "The bulb works.",
      price: 9000, negotiable: false, condition: "轻微使用", city: "sydney", category: "家具",
      char: "灯", tone: "gold", imageCount: 2, status: "在售", owner: "苏晚",
      sellerPhone: "0421987654", sellerWechat: "suwan_lamp",
      myRequest: { status: "approved", note: "想今晚看", noteEn: "Can I see it tonight?" },
      comments: []
    },
    {
      id: "l5", mine: false, title: "儿童绘本一箱", titleEn: "A box of children's books", desc: "适合 3 岁左右。", descEn: "Suitable for about age 3.",
      price: 5000, negotiable: true, condition: "明显使用", city: "sydney", category: "母婴",
      char: "书", tone: "rose", imageCount: 2, status: "在售", owner: "小满",
      myRequest: { status: "rejected", note: "可以便宜点吗", noteEn: "Would you take less?", attempts: 1 },
      comments: []
    },
    {
      id: "l6", mine: false, title: "实木小书架", titleEn: "Small solid-wood shelf", desc: "要自己来搬。", descEn: "You will need to carry it yourself.",
      price: 15000, negotiable: false, condition: "轻微使用", city: "melbourne", category: "家具",
      char: "架", tone: "ink", imageCount: 2, status: "在售", owner: "陈桥", comments: []
    }
  ];
  const listingPhotos = { l1: ["images/l1.jpg"], l2: ["images/l2.jpg"], l3: ["images/l3.jpg"], l4: ["images/l4.jpg"], l5: ["images/l5.jpg"], l6: ["images/l6.jpg"] };
  const listingRatio = { l1: "tall", l2: "square", l3: "tall", l4: "square", l5: "tall", l6: "square" };
  state.listings.forEach((item) => {
    item.photos = listingPhotos[item.id] || [];
    item.ratio = listingRatio[item.id] || "square";
  });
  state.messages = [
    { id: "m1", read: false, time: "10 分钟前", title: "你的闲置有新评论", titleEn: "New comment on your listing", body: "阿麦评论了「婴儿推车，八成新」：还能折叠吗？", bodyEn: "阿麦 commented on “Baby pram, lightly used”: Does it still fold?", go: "#/listing/l2" },
    { id: "m2", read: false, time: "10 分钟前", title: "有人申请联系方式", titleEn: "Someone asked for your contact", body: "阿麦申请查看「婴儿推车，八成新」。附言：周末下午方便看车吗", bodyEn: "阿麦 asked to see “Baby pram, lightly used”. Note: Free to see the pram on Saturday afternoon?", go: "#/listing/l2" },
    { id: "m3", read: true, time: "昨天", title: "对方同意了你的申请", titleEn: "Your request was accepted", body: "「落地灯」已展示卖家联系方式。交易方式由你们自己定。", bodyEn: "The seller’s contact for “Floor lamp” is now visible. You arrange the rest yourselves.", go: "#/listing/l4" }
  ];
}

function parse() {
  const raw = (location.hash || "#/mall").replace(/^#/, "");
  const [pathPart, qs] = raw.split("?");
  const parts = pathPart.split("/").filter(Boolean).map(decodeURIComponent);
  const query = {};
  if (qs) {
    qs.split("&").forEach((pair) => {
      const [k, v] = pair.split("=");
      query[decodeURIComponent(k)] = decodeURIComponent(v || "");
    });
  }
  return { name: parts[0] || "mall", id: parts[1] || "", query, hash: `#${raw}` };
}
const stack = [];
let lockHash = false;
function go(hash) {
  if (!hash.startsWith("#")) hash = `#${hash}`;
  if ((location.hash || "#/mall") === hash) { render(); return; }
  stack.push(location.hash || "#/mall");
  lockHash = true;
  location.hash = hash;
  render();
}
function back() {
  lockHash = true;
  location.hash = stack.pop() || parentHash(parse().name);
  render();
}
function parentHash(name) {
  const map = {
    category: "#/mall", search: "#/mall", product: "#/mall", checkout: "#/cart",
    address: "#/checkout", "address-edit": "#/address", "pay-result": "#/orders",
    orders: "#/me", order: "#/orders", refund: "#/orders", city: "#/mall",
    listing: "#/flea", publish: "#/flea", "my-listings": "#/me", report: "#/flea",
    apply: "#/flea", messages: "#/me", message: "#/messages", contact: "#/me", service: "#/me",
    login: "#/me", "bind-phone": "#/me"
  };
  return map[name] || "#/mall";
}
function jump(hash) {
  stack.length = 0;
  state.keepPublish = false;
  state.afterAuth = "";
  state.auth = authFromHash(hash);
  lockHash = true;
  location.hash = hash;
  render();
}
function notify(message) {
  state.toast = message;
  clearTimeout(state.timer);
  render();
  state.timer = setTimeout(() => { state.toast = ""; render(); }, 2200);
}
function ask(title, body, ok, run) {
  state.dialog = { title, body, ok, run };
  render();
}
function field(id, label, value, opts = {}) {
  const extra = opts.extra || "";
  if (opts.area) return `<label class="field">${label}<textarea id="${id}" maxlength="${opts.max || 200}" ${extra}>${h(value || "")}</textarea></label>`;
  return `<label class="field">${label}<input id="${id}" value="${h(value || "")}" ${extra}></label>`;
}
function shot(src, alt, cls = "shot") {
  return `<img class="${cls}" src="${h(src)}" alt="${h(alt || "")}">`;
}
function thumb(char, tone, cls = "") {
  return `<div class="thumb tone-${tone} ${cls}" aria-hidden="true">${h(char)}</div>`;
}
const UPLOADS = ["images/l1.jpg", "images/l2.jpg", "images/l4.jpg", "images/l5.jpg", "images/l6.jpg", "images/p6-hero.jpg", "images/p8-hero.jpg", "images/p3-hero.jpg", "images/p7-detail.jpg"];
function stamp(text, kind) {
  return `<span class="stamp ${kind || ""}">${h(text)}</span>`;
}
function checkoutLines(route) {
  if (route.query.mode === "buynow" && state.buyNow) {
    const item = product(state.buyNow.id);
    return [{ id: item.id, name: item.name, nameEn: item.nameEn, price: item.price, qty: state.buyNow.qty, char: item.char, tone: item.tone, image: item.images[0] }];
  }
  return state.cart.map((line) => {
    const item = product(line.id);
    return { id: item.id, name: item.name, nameEn: item.nameEn, price: item.price, qty: line.qty, char: item.char, tone: item.tone, image: item.images[0] };
  });
}
function withinAfterSale(item) {
  return !!item.doneAt && Date.now() - item.doneAt < 7 * 86400000;
}
function canPay(route) {
  const lines = checkoutLines(route);
  if (!lines.length || !addressOk(currentAddress())) return false;
  if (modeOf(state.city) === "post") return true;
  const slot = slotById(state.slotId);
  return !!(slot && slot.on && deliveryDates().some((item) => item.iso === state.deliveryDate));
}
function refundSelection(item) {
  const lines = item.items.map((line) => {
    const left = lineLeft(line);
    const qty = Math.min(left, state.refundPick[line.id] || 0);
    return { id: line.id, name: line.name, nameEn: line.nameEn, price: line.price, qty };
  }).filter((line) => line.qty > 0);
  const goods = lines.reduce((sum, line) => sum + line.price * line.qty, 0);
  const remainAfter = item.items.every((line) => lineLeft(line) - Math.min(lineLeft(line), state.refundPick[line.id] || 0) <= 0);
  const ship = remainAfter && lines.length ? (item.shipFee || 0) : 0;
  return { lines, goods, ship, amount: goods + ship, remainAfter };
}
function touchesRefund(item) {
  return item.status === "refunding" || item.status === "refunded" || (item.refunds || []).length > 0;
}

function enter(route) {
  state.dialog = null;
  if (route.name === "product") state.detailQty = 1;
  if (route.name === "listing") {
    state.imageIndex = 0;
    state.replyTo = null;
    state.form.comment = "";
  }
  if (route.name === "message") {
    const msg = state.messages.find((item) => item.id === route.id);
    if (msg) msg.read = true;
  }
  if (route.name === "checkout") {
    if (route.query.mode !== "buynow") state.buyNow = null;
    if (route.query.addr) state.addressId = route.query.addr;
  }
  if ((route.name === "flea" || route.name === "mall") && route.query.city && CITIES.some((item) => item.id === route.query.city)) {
    state.city = route.query.city;
    syncAddressToCity();
  }
  if (route.name === "search") state.form.q = route.query.q || "";
  if (route.name === "publish") {
    if (state.keepPublish) state.keepPublish = false;
    else initPublish(route);
  }
  if (route.name === "address-edit") initAddress(route);
  if (route.name === "contact") {
    state.form["c-phone"] = state.contact.phone;
    state.form["c-wechat"] = state.contact.wechat;
  }
  if (route.name === "apply" || route.name === "refund" || route.name === "report") {
    state.form.note = "";
    state.form.extra = "";
    state.form.reason = "不想要了";
    state.form["report-reason"] = "虚假信息";
    state.refundPick = {};
  }
}
function initPublish(route) {
  const item = route.id ? listing(route.id) : null;
  if (item) {
    state.city = item.city;
    state.form.title = item.title;
    state.form.desc = item.desc;
    state.form.price = yuan(item.price);
    state.form.negotiable = item.negotiable;
    state.form.condition = item.condition;
    state.form.category = item.category;
    state.photoSlots = [...(item.photos || [])];
    return;
  }
  state.form.title = "";
  state.form.desc = "";
  state.form.price = "";
  state.form.negotiable = false;
  state.form.condition = "几乎全新";
  state.form.category = "日用品";
  state.photoSlots = [];
  state.form["pub-phone"] = "";
  state.form["pub-wechat"] = "";
}
function showContactForm(route) {
  return route.query.nocontact === "1" || (!state.contact.phone && !state.contact.wechat);
}
function initAddress(route) {
  const item = route.id && route.id !== "new" ? addressById(route.id) : null;
  state.form["addr-name"] = item ? item.name : "";
  state.form["addr-phone"] = item ? item.phone : "";
  state.form["addr-default"] = item ? item.isDefault : state.addresses.length === 0;
  state.form.placeId = item ? item.placeId || "" : "";
  state.form.placeQuery = "";
}

function shell(route, title, body, opts = {}) {
  const tab = opts.tab || "";
  const fleaNames = ["flea", "city", "listing", "publish", "my-listings", "report", "apply"];
  const classes = ["shell", tab ? "has-tab" : "", opts.bar ? "has-bar" : "", opts.fab ? "has-fab" : "", fleaNames.includes(route.name) ? "theme-flea" : ""].filter(Boolean);
  document.getElementById("app").className = classes.join(" ");
  const home = route.name === "mall";
  const brand = t("巷口到家", "Lanehome");
  const heading = home ? `<span class="chop">${state.lang === "en" ? "L" : "巷"}</span><span>${h(brand)}</span>` : h(title);
  const backBtn = tab ? `<span></span>` : `<button type="button" class="nav-btn" data-action="back" aria-label="${h(t("返回", "Back"))}">${icons.back}</button>`;
  const langBtn = `<button type="button" class="lang-switch" data-action="toggle-lang" aria-label="${h(t("切换到英文", "Switch to Chinese"))}">${state.lang === "zh" ? "EN" : "中文"}</button>`;
  const tabs = [
    ["mall", t("商城", "Shop"), icons.home, "#/mall"],
    ["flea", t("闲置", "Market"), icons.flea, "#/flea"],
    ["cart", t("购物车", "Cart"), icons.cart, "#/cart"],
    ["me", t("我的", "Me"), icons.user, "#/me"]
  ].map(([id, label, icon, hash]) => {
    const badge = id === "cart" && cartCount() ? `<i class="badge">${cartCount()}</i>` : id === "me" && unreadCount() ? `<i class="badge">${unreadCount()}</i>` : "";
    return `<button type="button" class="tab ${tab === id ? "active" : ""}" data-go="${hash}" ${tab === id ? 'aria-current="page"' : ""}>${icon}<span>${label}</span>${badge}</button>`;
  }).join("");
  document.getElementById("app").innerHTML = `
    <div class="status"><span>17:10</span><span class="status-icons"><i class="sig"></i><i class="bat"></i></span></div>
    <header class="nav">${backBtn}<h1>${heading}</h1>${langBtn}<div class="capsule" title="${h(t("微信原生胶囊，原型里不可点", "WeChat capsule, not clickable in the prototype"))}"><span class="cdots"><b></b><b></b><b></b></span><i></i><span class="cring"></span></div></header>
    <main id="view">${body}</main>
    ${opts.bar || ""}
    ${tab ? `<nav class="tabbar">${tabs}</nav>` : ""}
    ${opts.fab || ""}
    ${state.dialog ? `<div class="mask" role="dialog" aria-modal="true"><div class="dialog"><h2>${h(state.dialog.title)}</h2><p>${h(state.dialog.body)}</p><button type="button" class="primary" data-action="dialog-ok">${h(state.dialog.ok)}</button><button type="button" class="ghost" data-action="dialog-cancel">${h(t("再想想", "Not now"))}</button></div></div>` : ""}
    ${state.toast ? `<div class="toast" role="status">${h(state.toast)}</div>` : ""}`;
  document.title = `${home ? brand : title} · ${t("小程序原型", "Mini program prototype")}`;
  document.documentElement.lang = state.lang === "en" ? "en" : "zh-CN";
}

function productCard(item) {
  const name = tx(item, "name");
  return `<article class="masonry-card"><button type="button" class="masonry-hit" data-go="#/product/${item.id}">${shot(item.images[0], name, `shot ${item.ratio || "square"}`)}<p class="name">${h(name)}</p></button><div class="masonry-foot"><b class="price">¥${yuan(item.price)}${item.stock ? "" : ` <small>${h(tr("缺货"))}</small>`}</b>${likeButton(item)}</div></article>`;
}
function renderMall() {
  const post = modeOf(state.city) === "post";
  const head = cityHead(post
    ? t(`快递寄出。满 ${money(FREE_SHIP)} 包邮`, `Courier. Free postage from ${money(FREE_SHIP)}`)
    : t("线下配送，从明天起送达", "Local delivery from tomorrow"));
  const areas = areaList(state.city);
  const banner = post
    ? `<section class="banner"><p class="eyebrow">${h(cityLabel(state.city))} · ${h(t("快递寄出", "Courier"))} · ${h(t("无物流轨迹", "No tracking"))}</p><h2>${h(t("这个城市走快递", "This city is served by post"))}</h2><p>${h(t(`商品满 ${money(FREE_SHIP)} 包邮，不满加 ${money(POSTAGE)}。`, `Free postage from ${money(FREE_SHIP)}. Otherwise ${money(POSTAGE)}.`))}</p></section>`
    : `<section class="banner"><p class="eyebrow">${h(cityLabel(state.city))} · ${h(t("线下配送", "Local delivery"))} · ${h(t("无物流轨迹", "No tracking"))}</p><h2>${h(t("从明天起送到家", "Delivered from tomorrow"))}</h2><p>${h(t(`可送 ${areas}。结算时先选日期，再选上午或下午。`, `We deliver to ${areas}. At checkout, pick a date, then morning or afternoon.`))}</p></section>`;
  const cats = MALL_CATS.map((cat) => `<button type="button" class="cat" data-go="#/category/${encodeURIComponent(cat)}"><strong>${h(tr(cat))}</strong></button>`).join("");
  return `${head}<button type="button" class="search-fake" data-go="#/search">${h(t("搜索商品", "Search products"))}</button>${banner}<div class="cats">${cats}</div><div class="section-title"><h2>${h(t("在售", "On sale"))}</h2><span>${h(t("一个商品一个价", "One price each"))}</span></div><div class="masonry">${state.products.map(productCard).join("")}</div>`;
}
function renderCategory(route) {
  const items = state.products.filter((item) => item.cat === route.id);
  return `<div class="chips">${MALL_CATS.map((cat) => `<button type="button" class="chip ${cat === route.id ? "on" : ""}" data-go="#/category/${encodeURIComponent(cat)}">${h(tr(cat))}</button>`).join("")}</div><div class="masonry">${items.map(productCard).join("") || `<p class="muted">${h(t("这个类目还没有商品。", "Nothing in this category yet."))}</p>`}</div>`;
}
function renderSearch(route) {
  const q = route.query.q || "";
  const items = q ? state.products.filter((item) => `${item.name}\n${item.nameEn}`.toLowerCase().includes(q.toLowerCase())) : [];
  const sheet = t("四件套", "sheet");
  const pan = t("煎锅", "skillet");
  const body = !q
    ? `<p class="muted">${h(t("试试", "Try"))}</p><div class="chips"><button type="button" class="chip" data-go="#/search?q=${encodeURIComponent(sheet)}">${h(t("四件套", "Sheet set"))}</button><button type="button" class="chip" data-go="#/search?q=${encodeURIComponent(pan)}">${h(t("煎锅", "Skillet"))}</button></div>`
    : items.length
      ? `<div class="masonry">${items.map(productCard).join("")}</div>`
      : `<div class="empty"><span class="chop">${state.lang === "en" ? "?" : "无"}</span><h2>${h(t(`没有「${q}」`, `No match for “${q}”`))}</h2><p class="muted">${h(t("换个说法，或者去分类里翻。", "Try another word, or browse categories."))}</p></div>`;
  return `<form class="search-row" data-form="search"><input id="q" name="q" value="${h(q)}" placeholder="${h(t("商品名称", "Product name"))}" aria-label="${h(t("商品名称", "Product name"))}"><button class="primary" type="submit">${h(t("搜索", "Search"))}</button></form>${body}`;
}
function renderProduct(route) {
  const item = product(route.id);
  if (!item) return `<div class="empty"><h2>${h(t("商品不存在", "Product not found"))}</h2></div>`;
  const name = tx(item, "name");
  const qty = state.detailQty;
  const shots = item.images;
  const index = state.imageIndex % shots.length;
  const low = item.stock > 0 && item.stock <= 6 ? `<p class="muted">${h(t(`仅剩 ${item.stock} 件`, `${item.stock} left`))}</p>` : "";
  return `<div class="hero-wrap"><button type="button" class="hero-gallery" data-action="next-image" aria-label="${h(t("下一张主图", "Next photo"))}">${shot(shots[index], name, "hero-img")}${shots.length > 1 ? `<span class="count">${index + 1}/${shots.length}</span>` : ""}</button><div class="dots">${shots.map((_, i) => `<i class="${i === index ? "on" : ""}"></i>`).join("")}</div></div>
    <section class="buy-card"><p class="price">¥${yuan(item.price)}</p><h2 class="name">${h(name)}</h2>${low}<div class="like-row"><div><b>${h(t("点赞", "Like"))}</b><p class="muted">${h(t("没有评价。点一下加 1，再点取消。", "No reviews. Tap to add one, tap again to undo."))}</p></div>${likeButton(item, true)}</div><p>${h(tx(item, "desc"))}</p>
      <div class="kv"><span>${h(t("分类", "Category"))}</span><b>${h(tr(item.cat))}</b></div>
      <div class="kv"><span>${h(t("库存", "Stock"))}</span><b>${item.stock ? item.stock : h(tr("缺货"))}</b></div>
      <div class="kv"><span>${h(t("已售", "Sold"))}</span><b>${item.sold}</b></div>
      ${item.stock ? `<div class="row qty-row"><span>${h(t("数量", "Qty"))}</span><div class="qty"><button type="button" data-action="qty" data-dir="-1" aria-label="${h(t("减少", "Less"))}">−</button><span>${qty}</span><button type="button" data-action="qty" data-dir="1" aria-label="${h(t("增加", "More"))}">+</button></div></div>` : ""}
    </section>
    <section class="detail-sheet"><div class="section-title"><h2>${h(t("商品详情", "Details"))}</h2><span>${h(t(`共 ${shots.length} 张`, `${shots.length} photos`))}</span></div><p>${h(tx(item, "detail"))}</p>
      ${shots.map((src, i) => `<figure class="detail-fig">${shot(src, `${name} ${i + 1}`, "detail-img")}<figcaption>${h(i === 0 ? t("主图", "Cover") : t("细节", "Detail"))}</figcaption></figure>`).join("")}
    </section>`;
}
function renderCart(route) {
  if (route.query.empty === "1" || state.cart.length === 0) {
    const realEmpty = state.cart.length === 0 && route.query.empty !== "1";
    return `<div class="empty"><span class="chop">${state.lang === "en" ? "0" : "空"}</span><h2>${h(t("购物车是空的", "Your cart is empty"))}</h2><p class="muted">${h(realEmpty ? t("去商城挑一件。", "Pick something from the shop.") : t("这是空态示意，底部购物车仍保留示例商品。", "Empty-state sample. The tab still shows the sample cart."))}</p><button type="button" class="primary" data-go="#/mall" style="margin-top:12px">${h(t("去商城", "Go to shop"))}</button></div>`;
  }
  const lines = state.cart.map((line) => {
    const item = product(line.id);
    const name = tx(item, "name");
    return `<article class="cart-line">${shot(item.images[0], name)}<div><button type="button" class="name" style="border:0;background:transparent;padding:0" data-go="#/product/${item.id}">${h(name)}</button><p class="price">¥${yuan(item.price)}</p><div class="row"><div class="qty"><button type="button" aria-label="${h(t("减少", "Less"))}" data-action="cart-qty" data-id="${item.id}" data-dir="-1">−</button><span>${line.qty}</span><button type="button" aria-label="${h(t("增加", "More"))}" data-action="cart-qty" data-id="${item.id}" data-dir="1">+</button></div><button type="button" class="ghost" data-action="remove-line" data-id="${item.id}">${h(t("删除", "Remove"))}</button></div></div></article>`;
  }).join("");
  const goods = moneyOf(state.cart.map((line) => ({ price: product(line.id).price, qty: line.qty })));
  return `${lines}<p class="muted">${h(t(`商品 ${money(goods)}。运费在确认订单里按城市计算。`, `Items ${money(goods)}. Delivery is calculated at checkout by city.`))}</p>`;
}
function renderCheckout(route) {
  const lines = checkoutLines(route);
  if (!lines.length) return `<div class="empty"><h2>${h(t("还没有要结算的商品", "Nothing to check out"))}</h2><button type="button" class="primary" data-go="#/cart">${h(t("回购物车", "Back to cart"))}</button></div>`;
  const addr = currentAddress();
  const ok = addressOk(addr);
  const post = modeOf(state.city) === "post";
  const goods = moneyOf(lines);
  const quote = shipQuote(goods, state.city);
  const blockCopy = addr.city !== state.city
    ? t(`这个地址在${cityLabel(addr.city)}，当前城市是${cityLabel(state.city)}。`, `This address is in ${cityLabel(addr.city)}. You are shopping in ${cityLabel(state.city)}.`)
    : t(`这个地址不在线下配送范围。${cityLabel(state.city)}现在可送 ${areaList(state.city)}。`, `Local delivery does not cover this address. ${cityLabel(state.city)} currently delivers to ${areaList(state.city)}.`);
  const dates = deliveryDates();
  const schedule = post ? "" : `<div class="section-title"><h2>${h(t("送达日期", "Delivery date"))}</h2><span>${h(t("从明天起", "From tomorrow"))}</span></div><div class="date-row">${dates.map((item) => { const chip = dateChip(item.iso); return `<button type="button" class="date-chip ${state.deliveryDate === item.iso ? "on" : ""}" data-action="date" data-id="${item.iso}"><b>${h(chip.head)}</b><small>${h(chip.sub)}</small></button>`; }).join("")}</div><div class="section-title"><h2>${h(t("送达时段", "Time of day"))}</h2></div>${SLOTS.map((slot) => `<button type="button" class="slot ${state.slotId === slot.id ? "on" : ""}" data-action="slot" data-id="${slot.id}" ${slot.on ? "" : "disabled"}><b>${h(slotText(slot))}</b>${slot.on ? "" : `<small>${h(t("已停用", "Unavailable"))}</small>`}</button>`).join("")}`;
  const shipCopy = post
    ? (quote.free ? t(`已满 ${money(FREE_SHIP)}，包邮`, `Free postage, over ${money(FREE_SHIP)}`) : t(`未满 ${money(FREE_SHIP)}，邮费 ${money(POSTAGE)}`, `Under ${money(FREE_SHIP)}, postage ${money(POSTAGE)}`))
    : t("线下配送费", "Local delivery");
  return `<button type="button" class="addr ${ok ? "on" : ""}" data-go="#/address"><b>${h(addr.name)} ${h(phonePretty(addr.phone))}</b><small>${h(addressLine(addr))}</small></button>
    ${ok ? "" : `<div class="notice">${h(blockCopy)}</div>`}
    ${schedule}
    ${field("remark", t("备注", "Note"), state.form.remark, { extra: `placeholder="${h(t("例如放门口，或先打电话", "For example, leave at the door"))}" maxlength="80"` })}
    <div class="section-title"><h2>${h(t("商品", "Items"))}</h2></div>
    ${lines.map((line) => `<div class="kv"><span>${h(tx(line, "name"))} × ${line.qty}</span><b>¥${yuan(line.price * line.qty)}</b></div>`).join("")}
    <div class="kv"><span>${h(shipCopy)}</span><b>¥${yuan(quote.fee)}</b></div>
    <div class="kv"><span>${h(t("合计", "Total"))}</span><b class="price">¥${yuan(goods + quote.fee)}</b></div>
    <p class="muted">${h(post ? t("快递寄出，没有物流轨迹。支付成功后扣库存。", "Sent by courier, with no tracking. Stock is deducted after payment.") : t("线下配送，没有物流轨迹。支付成功后扣库存。稍后支付会保留 15 分钟。", "Local delivery, no tracking. Stock is deducted after payment. Pay later holds the order for 15 minutes."))}</p>`;
}
function renderAddress() {
  return state.addresses.map((addr) => {
    const hint = addressHint(addr);
    return `<button type="button" class="addr ${addr.id === state.addressId ? "on" : ""}" data-action="pick-address" data-id="${addr.id}"><b>${h(addr.name)} ${h(phonePretty(addr.phone))} ${addr.isDefault ? stamp(tr("默认")) : ""}</b><small>${h(addressLine(addr))}${hint ? ` · ${h(hint)}` : ""}</small></button>`;
  }).join("") + `<button type="button" class="ghost full" data-go="#/address-edit/new">${h(t("新增地址", "Add address"))}</button>`;
}
function renderAddressEdit(route) {
  const place = placeById(state.form.placeId);
  const city = place ? place.city : state.city;
  const post = modeOf(city) === "post";
  const picked = place
    ? `<div class="place-picked"><b>${h(place.formatted)}</b><small>${h(districtLabel(place.suburb))} · ${h(cityLabel(place.city))} ${h(place.postcode)}</small><button type="button" class="ghost" data-action="clear-place">${h(t("换一个地址", "Choose another"))}</button></div>`
    : `<label class="field">${h(t("搜索地址", "Search address"))}<input id="place-q" value="${h(state.form.placeQuery || "")}" placeholder="${h(t("街道、地点或邮编", "Street, place or postcode"))}" autocomplete="off" aria-label="${h(t("搜索地址", "Search address"))}"></label><div id="place-suggest">${placeSuggestHtml(state.form.placeQuery)}</div>`;
  return `<form data-form="address">
    ${field("addr-name", t("联系人", "Name"), state.form["addr-name"], { extra: "required" })}
    <label class="field">${h(t("手机号", "Mobile"))}${phoneField("addr-phone", state.form["addr-phone"])}</label>
    <p class="muted">${h(t("国家号已经写好。后面填 412 345 678 这种号码。", "The country code is filled in. Add the number, like 412 345 678."))}</p>
    <div class="section-title"><h2>${h(t("收货地址", "Address"))}</h2></div>
    <p class="muted">${h(t("从地图检索里点一条。不能自己写街道。", "Pick a result from the map search. You cannot type the street yourself."))}</p>
    ${picked}
    <label class="choice"><input type="checkbox" id="addr-default" ${state.form["addr-default"] ? "checked" : ""}><span>${h(t("设为默认地址", "Make this the default"))}</span></label>
    <p class="muted">${h(post ? t("这个城市走快递，选中的地址可以下单。", "This city uses courier delivery, so a matched address can check out.") : t(`线下可送：${areaList(city)}。其他区可以保存，结算时不能下单。`, `Local delivery: ${areaList(city)}. Other suburbs can be saved, but cannot check out.`))}</p>
    <button class="primary full" type="submit">${h(t("保存", "Save"))}</button>
    ${route.id && route.id !== "new" ? `<button type="button" class="ghost full" style="margin-top:8px" data-action="delete-address" data-id="${h(route.id)}">${h(t("删除地址", "Delete address"))}</button>` : ""}
  </form>`;
}
function renderPay(route) {
  if (route.query.fail === "1") {
    return `<div class="pay-hero fail"><div class="mark">${icons.close}</div><h2>${h(t("支付未完成", "Payment not finished"))}</h2><p class="muted">${h(t("订单还在待支付。15 分钟内可以继续付，超时关闭并释放库存。", "The order is still unpaid. You can pay within 15 minutes. After that it closes and the stock lock is released."))}</p><button type="button" class="primary full" data-go="#/order/o1">${h(t("查看待支付订单", "View unpaid order"))}</button></div>`;
  }
  const item = order(route.id);
  if (!item) return `<div class="empty"><h2>${h(t("没有找到这笔订单", "Order not found"))}</h2></div>`;
  const when = `${datePretty(item.deliveryDate)} ${tx(item, "slotLabel")}`;
  const how = item.fulfillment === "post"
    ? t("快递寄出。没有物流轨迹。", "Posted by courier. No tracking.")
    : t(`${when} 送达。线下配送，没有物流轨迹。`, `Arriving ${when}. Local delivery, no tracking.`);
  return `<div class="pay-hero"><div class="mark">${icons.check}</div><h2>${h(t("支付成功", "Paid"))}</h2><p class="price">¥${yuan(paidOf(item))}</p><p class="muted">${h(how)}</p><button type="button" class="primary full" data-go="#/order/${item.id}">${h(t("查看订单", "View order"))}</button><button type="button" class="ghost full" style="margin-top:8px" data-go="#/mall">${h(t("回首页", "Back home"))}</button></div>`;
}
function renderOrders(route) {
  const filters = ["全部", "待支付", "待配送", "配送中", "已完成", "退款"];
  const current = route.query.status || "全部";
  const match = { 待支付: ["unpaid"], 待配送: ["pending"], 配送中: ["delivering"], 已完成: ["done"] };
  const list = state.orders.filter((item) => {
    if (current === "全部") return true;
    if (current === "退款") return touchesRefund(item);
    return (match[current] || []).includes(item.status);
  });
  const chips = `<div class="chips">${filters.map((item) => `<button type="button" class="chip ${item === current ? "on" : ""}" data-go="#/orders?status=${encodeURIComponent(item)}">${h(tr(item))}</button>`).join("")}</div>`;
  if (!list.length) return `${chips}<div class="empty"><h2>${h(t("这里没有订单", "No orders here"))}</h2></div>`;
  return chips + list.map((item) => {
    const [label, kind] = STATUS[item.status];
    const cover = item.items[0].image ? shot(item.items[0].image, tx(item.items[0], "name")) : thumb(item.items[0].char, item.items[0].tone);
    const extra = openRefund(item) && item.status !== "refunding" ? stamp(t("部分退款中", "Partial refund"), "warn") : "";
    const when = item.fulfillment === "post" ? tr("快递寄出") : `${datePretty(item.deliveryDate)} ${tx(item, "slotLabel")}`;
    return `<button type="button" class="lcard" data-go="#/order/${item.id}"><div>${cover}</div><div><b>${h(item.items.map((line) => tx(line, "name")).join(t("、", ", ")))}</b><small style="display:block;color:var(--ink-soft);margin:4px 0">${h(item.created)} · ${h(when)}</small>${stamp(tr(label), kind === "warn" ? "warn" : kind === "mute" ? "mute" : "")}${extra}<span class="price">¥${yuan(paidOf(item))}</span></div></button>`;
  }).join("");
}
function lineMark(item, line) {
  if ((line.refunded || 0) >= line.qty) return tr("已退");
  const open = openRefund(item);
  if (open && open.lines.some((row) => row.id === line.id)) return t("退款审核中", "Refund in review");
  return "";
}
function renderOrder(route) {
  const item = order(route.id);
  if (!item) return `<div class="empty"><h2>${h(t("订单不存在", "Order not found"))}</h2></div>`;
  const [label] = STATUS[item.status];
  const post = item.fulfillment === "post";
  const happy = ["unpaid", "pending", "delivering", "done"].includes(item.status);
  const steps = post ? [t("已下单", "Placed"), t("待寄出", "To post"), t("已寄出", "Posted"), t("已完成", "Done")] : [t("已下单", "Placed"), t("待配送", "To deliver"), t("配送中", "On the way"), t("已完成", "Done")];
  const index = { unpaid: 0, pending: 1, delivering: 2, done: 3 }[item.status];
  const timeline = happy ? `<div class="timeline">${steps.map((step, i) => `<div class="step ${i === index ? "on" : ""} ${i < index ? "done" : ""}"><i></i>${h(step)}</div>`).join("")}</div>` : "";
  const open = openRefund(item);
  const banners = {
    unpaid: t("15 分钟内未支付，订单关闭，库存释放。", "Unpaid orders close after 15 minutes and release the stock lock."),
    pending: t("还没出发。可以只退其中几件，钱马上原路退回。", "It has not left yet. You can refund some items now, and that money goes back immediately."),
    delivering: t("正在配送。可以确认收货，或只退其中几件。只退一部分时，其余商品继续送。", "On the way. You can confirm delivery, or refund some items. The rest keeps moving."),
    done: withinAfterSale(item) ? t("订单已完成。7 天内可以只退其中几件，由门店审核。", "Completed. Within 7 days you can refund some items. The shop reviews it.") : t("已超过 7 天售后期限。", "The 7-day after-sale window has closed."),
    refunding: t("勾选的商品都在退款审核中。同意后原路退回。", "Every selected item is in review. Money goes back if the shop agrees."),
    refunded: t("已原路退回。", "Refunded to the original payment method."),
    cancelled: t("订单已关闭，未扣款。", "Closed before payment. You were not charged.")
  };
  const partial = open && item.status !== "refunding"
    ? `<div class="notice">${h(t(`正在退 ${open.lines.map((line) => tx(line, "name")).join("、")}。其余商品不受影响。`, `Refund in review: ${open.lines.map((line) => tx(line, "name")).join(", ")}. Other items are unchanged.`))}</div>`
    : "";
  const returned = refundedCents(item) ? `<div class="kv"><span>${h(t("已退", "Refunded"))}</span><b>${money(refundedCents(item))}</b></div>` : "";
  const shipLabel = item.status === "cancelled" ? tr("未产生") : money(item.shipFee || 0);
  return `<div class="notice ${item.status === "done" || item.status === "pending" || item.status === "delivering" ? "ok" : item.status === "refunded" || item.status === "cancelled" ? "ink" : ""}">${h(tr(label))}。${h(banners[item.status])}</div>
    ${partial}${timeline}
    <div class="kv"><span>${h(t("配送", "Delivery"))}</span><b>${h(post ? t("快递寄出，无物流轨迹", "Courier, no tracking") : t("线下配送，无物流轨迹", "Local delivery, no tracking"))}</b></div>
    ${post ? `<div class="kv"><span>${h(t("方式", "Method"))}</span><b>${h(tr("快递寄出"))}</b></div>` : `<div class="kv"><span>${h(t("日期", "Date"))}</span><b>${h(datePretty(item.deliveryDate))}</b></div><div class="kv"><span>${h(t("时段", "Time"))}</span><b>${h(tx(item, "slotLabel"))}</b></div>`}
    <div class="kv"><span>${h(t("地址", "Address"))}</span><b>${h(item.address.name)} ${h(addressLine(item.address))}</b></div>
    ${item.remark ? `<div class="kv"><span>${h(t("备注", "Note"))}</span><b>${h(tr(item.remark))}</b></div>` : ""}
    ${item.items.map((line) => {
      const mark = lineMark(item, line);
      return `<div class="kv"><span>${h(tx(line, "name"))} × ${line.qty}${mark ? ` · ${h(mark)}` : ""}</span><b>¥${yuan(line.price * line.qty)}</b></div>`;
    }).join("")}
    <div class="kv"><span>${h(post ? t("邮费", "Postage") : t("配送费", "Delivery fee"))}</span><b>${h(shipLabel)}</b></div>
    ${returned}
    <div class="kv"><span>${h(t("合计", "Total"))}</span><b class="price">¥${yuan(paidOf(item))}</b></div>
    ${(item.refunds || []).map((row) => `<p class="muted">${h(row.status === "open" ? t("待审核", "In review") : row.status === "approved" ? t("已同意", "Approved") : t("已拒绝", "Declined"))} · ${h(tx(row, "reason"))} · ${money(row.amount)}</p>`).join("")}`;
}
function orderBar(item) {
  if (!item) return "";
  if (item.status === "unpaid") return bar(`<button type="button" class="ghost" data-action="cancel-unpaid" data-id="${item.id}">${h(t("取消", "Cancel"))}</button><button type="button" class="primary" data-action="pay-existing" data-id="${item.id}">${h(t("去支付", "Pay"))}</button>`);
  if (item.status === "pending") return bar(`<button type="button" class="ghost full" data-go="#/refund/${item.id}">${h(t("选择要退的商品", "Choose items to refund"))}</button>`);
  if (item.status === "delivering") {
    const refundBtn = openRefund(item) ? "" : `<button type="button" class="ghost" data-go="#/refund/${item.id}">${h(t("申请退款", "Request a refund"))}</button>`;
    return bar(`${refundBtn}<button type="button" class="primary" data-action="receive" data-id="${item.id}">${h(t("确认收货", "Confirm delivery"))}</button>`);
  }
  if (item.status === "done" && withinAfterSale(item) && !openRefund(item) && item.items.some((line) => lineLeft(line) > 0)) {
    return bar(`<button type="button" class="ghost full" data-go="#/refund/${item.id}">${h(t("申请退款", "Request a refund"))}</button>`);
  }
  return "";
}
function bar(html) { return `<div class="actionbar">${html}</div>`; }
function renderRefund(route) {
  const item = order(route.id);
  if (!item) return `<div class="empty"><h2>${h(t("订单不存在", "Order not found"))}</h2></div>`;
  const allowed = item.status === "pending" || item.status === "delivering" || (item.status === "done" && withinAfterSale(item));
  if (item.status === "done" && !withinAfterSale(item)) return `<div class="notice">${h(t("已超过 7 天，不能再申请退款。", "The 7-day window has closed."))}</div>`;
  if (!allowed && item.status !== "refunding") return `<div class="notice">${h(t("这一单现在不能退款。", "This order cannot be refunded now."))}</div>`;
  const open = openRefund(item);
  if (open || item.status === "refunding") {
    const row = open || (item.refunds || []).find((entry) => entry.status === "open");
    return `<div class="notice">${h(t("已有一笔退款在审核，处理完才能再申请。", "A refund is already in review."))}</div>${row ? `<p>${h(row.lines.map((line) => `${tx(line, "name")} × ${line.qty}`).join(t("、", ", ")))}</p><p class="muted">${h(tx(row, "reason"))} · ${money(row.amount)}</p>` : ""}`;
  }
  const picked = refundSelection(item);
  const immediate = item.status === "pending";
  const rows = item.items.map((line) => {
    const left = lineLeft(line);
    if (left <= 0) return `<div class="kv"><span>${h(tx(line, "name"))}</span><b>${h(tr("已退"))}</b></div>`;
    const qty = state.refundPick[line.id] || 0;
    const on = qty > 0;
    const stepper = on && left > 1 ? `<div class="qty"><button type="button" data-action="refund-qty" data-id="${line.id}" data-dir="-1" aria-label="${h(t("减少", "Less"))}">−</button><span>${qty}</span><button type="button" data-action="refund-qty" data-id="${line.id}" data-dir="1" aria-label="${h(t("增加", "More"))}">+</button></div>` : "";
    return `<div class="refund-line"><label class="choice"><input type="checkbox" data-refund-id="${line.id}" ${on ? "checked" : ""}><span>${h(tx(line, "name"))} · ${h(t(`可退 ${left} 件`, `${left} available`))} · ¥${yuan(line.price)}</span></label>${stepper}</div>`;
  }).join("");
  const shipNote = picked.lines.length && picked.ship
    ? t(`商品都退完了，这一笔连运费 ${money(picked.ship)} 一起退。`, `All remaining items are selected, so postage ${money(picked.ship)} is included.`)
    : t("只退勾选的商品。没退完时，运费不退。", "Only selected items are refunded. Postage stays if anything remains.");
  return `<p>${h(t(`订单 ${item.id}`, `Order ${item.id}`))}</p>
    <form data-form="refund">${rows}
      <div class="kv"><span>${h(t("退款金额", "Refund"))}</span><b class="price">${money(picked.amount)}</b></div>
      <p class="muted">${h(shipNote)}</p>
      ${REFUND_REASONS.map((reason) => `<label class="choice"><input type="radio" name="reason" value="${h(reason)}" ${state.form.reason === reason ? "checked" : ""}><span>${h(tr(reason))}</span></label>`).join("")}
      ${field("extra", t("补充说明", "Note"), state.form.extra, { area: true, max: 120 })}
      <button class="primary full" type="submit" ${picked.lines.length ? "" : "disabled"}>${h(immediate ? t("确认退掉所选商品", "Refund selected items") : t("提交申请", "Submit"))}</button>
    </form>
    <p class="muted">${h(immediate ? t("还没出发，所选商品马上原路退回，不用等审核。", "It has not left yet, so selected items are refunded immediately.") : t("提交后等门店同意才退钱。只退一部分时，订单不会整单变成已退款。", "The shop has to agree before money moves. A partial refund does not refund the whole order."))}</p>`;
}

function visibleListings() {
  const q = state.fleaQ.trim().toLowerCase();
  return state.listings.filter((item) => item.city === state.city && item.status !== "已下架" && (state.fleaCat === "全部" || item.category === state.fleaCat) && (!q || `${item.title}\n${item.titleEn}\n${item.desc}\n${item.descEn}`.toLowerCase().includes(q)));
}
function renderFlea() {
  const chips = ["全部", ...FLEA_CATS].map((cat) => `<button type="button" class="chip ${state.fleaCat === cat ? "on" : ""}" data-action="flea-cat" data-cat="${h(cat)}">${h(tr(cat))}</button>`).join("");
  const list = visibleListings();
  const cards = list.length ? `<div class="masonry">${list.map((item) => `<article class="masonry-card"><button type="button" class="masonry-hit" data-go="#/listing/${item.id}">${item.photos[0] ? shot(item.photos[0], tx(item, "title"), `shot ${item.ratio || "square"}`) : thumb(item.char, item.tone, item.ratio || "square")}<p class="name">${h(tx(item, "title"))}</p></button><div class="masonry-foot"><b class="price">¥${yuan(item.price)}${item.negotiable ? ` <small>${h(tr("可小议"))}</small>` : ""}</b><span>${stamp(tr(item.condition))}</span></div></article>`).join("")}</div>` : `<div class="empty"><span class="chop">${state.lang === "en" ? "0" : "空"}</span><h2>${h(t(`${cityLabel(state.city)}还没有闲置`, `No listings in ${cityLabel(state.city)} yet`))}</h2><p class="muted">${h(t("换个城市，或者发布第一条。", "Switch city, or post the first one."))}</p></div>`;
  return `${cityHead(t("同城信息板。不收款、不担保、不提供聊天。", "Local noticeboard. No payment, no escrow, no chat."))}<form class="search-row" data-form="flea-search"><input id="flea-q" value="${h(state.fleaQ)}" placeholder="${h(t("搜标题或描述", "Search title or description"))}" aria-label="${h(t("搜索闲置", "Search listings"))}"><button class="pine" type="submit">${h(t("搜索", "Search"))}</button></form><div class="chips">${chips}</div>${cards}`;
}
function renderCity() {
  return `<p class="muted">${h(t("商城和闲置用同一个城市。悉尼和墨尔本是线下配送，堪培拉走快递。", "Shop and market share one city. Sydney and Melbourne are local delivery. Canberra is courier."))}</p>` + CITIES.map((city) => `<button type="button" class="city-item" data-action="pick-city" data-city="${h(city.id)}"><b>${h(cityLabel(city.id))}</b>${city.id === state.city ? `<small>${h(tr("当前"))}</small>` : ""}<small>${h(city.mode === "post" ? tr("快递") : tr("线下配送"))}</small></button>`).join("");
}
function renderListing(route) {
  const item = listing(route.id);
  if (!item) return `<div class="empty"><h2>${h(t("帖子不存在", "Listing not found"))}</h2></div>`;
  const mine = owns(item);
  const photos = item.photos || [];
  const index = photos.length ? state.imageIndex % photos.length : 0;
  const comments = item.comments.map((comment, i) => `<article class="comment"><div class="avatar">${h(comment.user.slice(0, 1))}</div><div><div class="who">${h(t(`${i + 1}楼`, `#${i + 1}`))} · ${h(comment.user)}${comment.owner ? `<span class="tag">${h(t("发布者", "Seller"))}</span>` : ""} · ${h(tr(comment.time))}</div><p>${h(tx(comment, "text"))}</p><div class="inline-actions"><button type="button" data-action="reply" data-id="${comment.id}">${h(t("回复", "Reply"))}</button><button type="button" data-go="#/report/${item.id}?floor=${i + 1}">${h(t("举报", "Report"))}</button>${comment.user === "林可" && state.auth !== "guest" ? `<button type="button" data-action="delete-comment" data-id="${comment.id}">${h(t("删除", "Delete"))}</button>` : ""}</div>${comment.replies.map((reply) => `<div class="reply"><div class="who">${h(reply.user)}${reply.owner ? `<span class="tag">${h(t("发布者", "Seller"))}</span>` : ""} · ${h(tr(reply.time))}</div><p>${h(tx(reply, "text"))}</p></div>`).join("")}</div></article>`).join("");
  const requests = mine ? (item.requests || []).map((req) => requestCard(item, req)).join("") : "";
  return `<div class="hero-wrap"><button type="button" class="hero-gallery" data-action="next-image" aria-label="${h(t("下一张图片", "Next photo"))}">${photos.length ? shot(photos[index], tx(item, "title"), "hero-img") : thumb(item.char, item.tone)}${photos.length > 1 ? `<span class="count">${index + 1}/${photos.length}</span>` : ""}</button></div>
    <p class="price">¥${yuan(item.price)}${item.negotiable ? `<small>${h(t("可小议，不在这里付款", "Negotiable. No payment here."))}</small>` : `<small>${h(tr("仅展示"))}</small>`}</p>
    <h2>${h(tx(item, "title"))}</h2>
    <div>${stamp(tr(item.condition))}${stamp(cityLabel(item.city))}${stamp(tr(item.category))}${item.status !== "在售" ? stamp(tr(item.status), "mute") : ""}</div>
    <p>${h(tx(item, "desc"))}</p>
    <div class="kv"><span>${h(t("发布者", "Seller"))}</span><b>${h(item.owner)}</b></div>
    ${contactBlockHtml(item)}
    ${mine ? `<div class="section-title"><h2>${h(t("联系方式申请", "Contact requests"))}</h2></div>${requests || `<p class="muted">${h(t("还没有人申请。", "No requests yet."))}</p>`}` : ""}
    <div class="section-title"><h2>${h(t("评论", "Comments"))}</h2><span>${h(t("时间正序", "Oldest first"))}</span></div>
    ${comments || `<p class="muted">${h(t("还没有评论。", "No comments yet."))}</p>`}
    ${item.status === "在售" ? `<form data-form="comment">${field("comment", state.replyTo ? t("回复这一楼", "Reply to this comment") : t("写下评论", "Write a comment"), state.form.comment, { area: true, max: 200 })}<button class="pine" type="submit">${h(state.replyTo ? t("发送回复", "Send reply") : t("发送", "Send"))}</button></form>` : ""}`;
}
function shownRequest(item) {
  if (state.auth === "guest") return null;
  if (!item || !item.myRequest) return null;
  if (parse().query.block === "1") return { ...item.myRequest, status: "blocked" };
  return item.myRequest;
}
function requestCard(item, req) {
  const again = req.attempts > 1 ? ` · ${h(t(`第 ${req.attempts} 次`, `Time ${req.attempts}`))}` : "";
  const head = `<b>${h(req.user)}</b> · ${h(tr(req.time))}${again}<p>${h(tx(req, "note") || t("没有附言", "No note"))}</p>`;
  if (req.status === "pending") {
    return `<article class="lock">${head}<div class="row"><button type="button" class="ghost" data-action="reject-request" data-id="${req.id}" data-listing="${item.id}">${h(t("拒绝", "Decline"))}</button><button type="button" class="primary" data-action="approve-request" data-id="${req.id}" data-listing="${item.id}">${h(t("同意并给出联系方式", "Accept and share contact"))}</button></div><button type="button" class="ghost full block-person" data-action="block-request" data-id="${req.id}" data-listing="${item.id}">${h(t("拒绝此人申请联系方式", "Stop this person asking"))}</button><p class="muted">${h(t("拒绝只挡这一次，对方还可以再申请。拒绝此人之后，这个人不能再申请这条。", "Decline stops only this request. Stopping this person means they cannot ask again."))}</p></article>`;
  }
  if (req.status === "approved") return `<article class="lock">${head}<p class="muted">${h(t("已展示你的联系方式", "Your contact is now visible"))}</p></article>`;
  if (req.status === "blocked") return `<article class="lock">${head}<p class="muted">${h(t("已拒绝此人。不能再申请这条的联系方式。", "Stopped. They cannot ask for contact on this listing again."))}</p></article>`;
  return `<article class="lock">${head}<p class="muted">${h(t("已拒绝这一次。对方还可以再申请。", "Declined this time. They can apply again."))}</p><button type="button" class="ghost full block-person" data-action="block-request" data-id="${req.id}" data-listing="${item.id}">${h(t("拒绝此人申请联系方式", "Stop this person asking"))}</button></article>`;
}
function contactBlockHtml(item) {
  if (owns(item)) {
    return `<div class="lock"><b>${h(t("给买家的联系方式", "Contact for buyers"))}</b><p>${h(t("买家申请之后，你点同意，对方才能看到。", "Buyers see this only after you accept their request."))}</p><p>${h(t("手机号", "Mobile"))} ${h(state.contact.phone ? phonePretty(state.contact.phone) : t("还没填", "Not set"))}</p><p>${h(t("微信号", "WeChat"))} ${h(state.contact.wechat || t("还没填", "Not set"))}</p><button type="button" class="ghost" data-go="#/contact">${h(t("修改手机号或微信号", "Edit mobile or WeChat"))}</button></div>`;
  }
  if (item.status !== "在售") return `<div class="lock">${h(t(`这条已经${item.status}，不能申请联系方式。`, `This listing is ${tr(item.status)}. Contact requests are closed.`))}</div>`;
  const req = shownRequest(item);
  if (!req) return `<div class="lock"><b>${h(t("联系方式未公开", "Contact is hidden"))}</b><p>${h(t("看上了就申请。对方同意后，才能看到手机号或微信号。", "Apply if you want it. You see the mobile or WeChat only after they accept."))}</p></div>`;
  if (req.status === "pending") return `<div class="notice ink">${h(t("已申请，等待对方同意。", "Requested. Waiting for them to accept."))} ${h(t("附言：", "Note: "))}${h(tx(req, "note") || t("无", "none"))}</div>`;
  if (req.status === "blocked") return `<div class="notice">${h(t("对方已拒绝你申请联系方式。不能再申请这条。", "They stopped your requests. You cannot ask again on this listing."))}</div>`;
  if (req.status === "rejected") return `<div class="notice">${h(t("对方没有同意这一次。你可以再次申请。", "They declined this time. You can apply again."))}</div>`;
  return `<div class="contact-card"><b>${h(t("对方已同意", "They accepted"))}</b><p>${h(t("手机", "Mobile"))} ${h(phonePretty(item.sellerPhone || ""))}</p><p>${h(t("微信", "WeChat"))} ${h(item.sellerWechat || "")}</p><button type="button" class="pine" data-action="copy-contact">${h(t("复制手机号", "Copy mobile"))}</button><p class="muted">${h(t("之后怎么交易，平台不再参与。", "You arrange the rest. The platform steps out."))}</p></div>`;
}
function listingBar(item) {
  if (!item) return "";
  const mine = owns(item);
  if (mine && item.status === "在售") return bar(`<button type="button" class="ghost" data-go="#/publish/${item.id}">${h(t("编辑", "Edit"))}</button><button type="button" class="ghost" data-action="mark-sold" data-id="${item.id}">${h(t("标为已出", "Mark sold"))}</button><button type="button" class="primary" data-action="unlist" data-id="${item.id}">${h(t("下架", "Unlist"))}</button>`);
  const req = shownRequest(item);
  if (!mine && item.status === "在售" && (!req || req.status === "rejected")) return bar(`<button type="button" class="ghost" data-go="#/report/${item.id}">${h(t("举报", "Report"))}</button><button type="button" class="primary" data-go="#/apply/${item.id}">${h(t("申请联系方式", "Request contact"))}</button>`);
  if (!mine && req && req.status === "pending") return bar(`<button type="button" class="primary" disabled>${h(t("等待对方同意", "Waiting for them"))}</button>`);
  return "";
}
function renderApply(route) {
  const item = listing(route.id);
  if (!item) return `<div class="empty"><h2>${h(t("帖子不存在", "Listing not found"))}</h2></div>`;
  const req = shownRequest(item);
  if (req && req.status === "blocked") return `<div class="notice">${h(t("对方已拒绝你申请联系方式。不能再申请这条。", "They stopped your requests. You cannot ask again on this listing."))}</div>`;
  if (req && req.status !== "rejected") return `<div class="notice ink">${h(t("你已经申请过了。", "You already applied."))}</div>`;
  return `<p class="name">${h(tx(item, "title"))}</p><p class="muted">${h(t("对方只会看到你的头像、昵称和下面这句话。", "They only see your avatar, name and this note."))}</p><form data-form="apply">${field("note", t("附言，可以不写", "Note, optional"), state.form.note, { area: true, max: 100 })}<button class="primary full" type="submit">${h(t("提交申请", "Submit"))}</button></form>`;
}
function renderPublish(route) {
  const firstContact = showContactForm(route);
  const tiles = state.photoSlots.map((src, i) => `<div class="photo-tile ${i === 0 ? "cover" : ""}">${shot(src, `${i + 1}`, "tile-img")}${i === 0 ? `<span class="cover-badge">${h(t("封面", "Cover"))}</span>` : ""}<button type="button" class="tile-x" data-action="remove-image" data-index="${i}" aria-label="${h(t("移除", "Remove"))}">${icons.close}</button></div>`).join("");
  const add = state.photoSlots.length < 9 ? `<button type="button" class="photo-add ${state.photoSlots.length ? "" : "big"}" data-action="add-image">${icons.plus}<b>${h(state.photoSlots.length ? t("继续加", "Add more") : t("添加实拍", "Add photos"))}</b><span>${state.photoSlots.length ? "" : h(t("最多 9 张，第一张当封面", "Up to 9. The first is the cover."))}</span></button>` : "";
  const conds = CONDITIONS.map((item) => `<button type="button" class="cond ${state.form.condition === item ? "on" : ""}" data-action="set-condition" data-value="${h(item)}"><b>${h(tr(item))}</b></button>`).join("");
  const cats = FLEA_CATS.map((item) => `<button type="button" class="chip ${state.form.category === item ? "on" : ""}" data-action="set-category" data-value="${h(item)}">${h(tr(item))}</button>`).join("");
  return `<form id="publish-form" data-form="publish" class="publish">
    <section class="form-card"><div class="card-label"><b>${h(t("实拍", "Photos"))}</b><span>${state.photoSlots.length}/9</span></div><p class="hint">${h(t("1 到 9 张。第一张是封面。", "1 to 9 photos. The first is the cover."))}</p><div class="photo-board">${tiles}${add}</div></section>
    <section class="form-card">
      <label class="bare">${h(t("标题", "Title"))}<span class="hint">${h(t("必填，最多 40 字", "Required, up to 40 characters"))}</span><input id="title" maxlength="40" required placeholder="${h(t("例如九成新四件套", "For example, cotton sheet set"))}" value="${h(state.form.title || "")}"></label>
      <div class="bare">${h(t("标价", "Price"))}<span class="hint">${h(t("只展示，不能在这里付款", "Shown only. No payment here."))}</span><label class="price-line"><span>¥</span><input id="price" inputmode="decimal" required placeholder="120" value="${h(state.form.price || "")}" aria-label="${h(t("标价", "Price"))}"></label></div>
      <label class="switch"><input id="negotiable" type="checkbox" ${state.form.negotiable ? "checked" : ""}><span><b>${h(tr("可小议"))}</b><small>${h(t("勾选后，价格旁边会显示这几个字。", "Shows next to the price when on."))}</small></span></label>
      <label class="bare">${h(t("描述", "Description"))}<span class="hint">${h(t("必填", "Required"))}</span><textarea id="desc" maxlength="300" required placeholder="${h(t("尺寸、用了多久、能不能看货", "Size, age, whether it can be viewed"))}">${h(state.form.desc || "")}</textarea></label>
    </section>
    <section class="form-card"><div class="card-label"><b>${h(t("成色", "Condition"))}</b></div><div class="cond-grid">${conds}</div></section>
    <section class="form-card"><div class="card-label"><b>${h(t("类目", "Category"))}</b></div><div class="chips">${cats}</div></section>
    <section class="form-card"><div class="card-label"><b>${h(t("城市", "City"))}</b></div><button type="button" class="city-pick" data-go="#/city"><b>${h(cityLabel(state.city))}</b><span>${h(t("选择", "Change"))}</span></button><p class="hint">${h(t(`这条闲置只出现在${cityLabel(state.city)}。`, `This listing only appears in ${cityLabel(state.city)}.`))}</p></section>
    <section class="form-card contact-preview"><div class="card-label"><b>${h(t("给买家的联系方式", "Contact for buyers"))}</b></div>
      <p class="hint">${h(firstContact ? t("还没留过。填手机号或微信号，至少一种。不会写在帖子上。", "Add a mobile or WeChat, at least one. It is not printed on the listing.") : t("下面是你已经留下的联系方式。帖子正文里不会出现。", "This is the contact you already saved. It does not appear in the listing text."))}</p>
      ${firstContact
        ? `<label class="bare">${h(t("手机号", "Mobile"))}${phoneField("pub-phone", state.form["pub-phone"])}</label><label class="bare">${h(t("微信号", "WeChat"))}<input id="pub-wechat" maxlength="30" placeholder="xiangkou_lin" value="${h(state.form["pub-wechat"] || "")}"></label>`
        : `${contactRow(t("手机号", "Mobile"), state.contact.phone ? phonePretty(state.contact.phone) : "")}${contactRow(t("微信号", "WeChat"), state.contact.wechat || "")}<button type="button" class="ghost" data-go="#/contact">${h(t("修改手机号或微信号", "Edit mobile or WeChat"))}</button>`}
    </section>
  </form>`;
}
function publishBar(route) {
  return bar(`<button type="submit" form="publish-form" class="primary">${h(route.id ? t("保存修改", "Save") : t("发布", "Post"))}</button>`);
}
function renderMyListings() {
  const mine = state.listings.filter((item) => item.mine);
  if (!mine.length) return `<div class="empty"><h2>${h(t("你还没有发布", "You have not posted yet"))}</h2><button type="button" class="primary" data-go="#/publish">${h(t("去发布", "Post one"))}</button></div>`;
  return mine.map((item) => `<button type="button" class="lcard" data-go="#/listing/${item.id}">${item.photos && item.photos[0] ? shot(item.photos[0], tx(item, "title")) : thumb(item.char, item.tone)}<div><p class="name">${h(tx(item, "title"))}</p><p class="price">¥${yuan(item.price)}</p>${stamp(tr(item.status), item.status === "在售" ? "" : "mute")}</div></button>`).join("");
}
function renderReport(route) {
  const item = listing(route.id);
  const target = route.query.floor ? t(`举报 ${route.query.floor} 楼评论`, `Report comment ${route.query.floor}`) : t("举报这条闲置", "Report this listing");
  return `<h2>${h(target)}</h2><p class="muted">${item ? h(tx(item, "title")) : ""}</p><form data-form="report">${REPORT_REASONS.map((reason) => `<label class="choice"><input type="radio" name="report-reason" value="${h(reason)}" ${state.form["report-reason"] === reason ? "checked" : ""}><span>${h(tr(reason))}</span></label>`).join("")}${field("extra", t("补充", "Details"), state.form.extra, { area: true, max: 120 })}<button class="primary full" type="submit">${h(t("提交", "Submit"))}</button></form>`;
}
function renderGuestMe() {
  return `<div class="me-head"><div class="avatar-lg">${h(t("游", "G"))}</div><div><b>${h(t("游客", "Guest"))}</b><p class="muted">${h(t("还没登录。可以先逛商城和闲置。", "Not signed in. You can browse the shop and market."))}</p></div></div>
    <button type="button" class="primary full" data-go="#/login">${h(t("微信快捷登录", "Continue with WeChat"))}</button>
    <p class="hint">${h(t("登录只拿 openid 和 unionid。国内手机号在澳洲打不通，登录后要另绑一个澳洲号码。", "Login only takes openid and unionid. A China mobile does not work in Australia, so you bind an Australian number afterwards."))}</p>
    <button type="button" class="linkrow" data-go="#/city"><b>${h(t("当前城市", "City"))}</b><small style="display:block">${h(cityLabel(state.city))}</small></button>
    <button type="button" class="linkrow" data-go="#/service"><b>${h(t("联系客服", "Support"))}</b><small style="display:block">${h(t("微信客服，不用先登录", "WeChat support, no login needed"))}</small></button>`;
}
function renderLogin() {
  return `<div class="pay-hero"><div class="mark">${icons.user}</div><h2>${h(t("微信快捷登录", "WeChat login"))}</h2><p>${h(t("点下去之后，用微信 code 换 openid 和 unionid。两个都拿到，才算登录成功。", "This exchanges a WeChat code for openid and unionid. Login succeeds only when both are present."))}</p><p class="muted">${h(t("不读取微信绑定的手机号。那个号码是国内的，在澳洲打不通。", "We do not read the mobile on the WeChat account. That number is Chinese and does not work in Australia."))}</p><button type="button" class="primary full" data-action="wechat-login">${h(t("微信快捷登录", "Continue with WeChat"))}</button></div>`;
}
function renderBindPhone() {
  return `<form data-form="account-phone"><p>${h(t("留一个在澳洲能打通的手机号。配送、发布闲置之前都要用它。", "Leave a mobile that works in Australia. Checkout and posting need it."))}</p><p class="hint">${h(t("这不是微信手机号授权，也不发短信验证码。格式不对不能保存。", "This is not WeChat phone authorization, and there is no SMS code. A bad format will not save."))}</p><label class="field">${h(t("澳洲手机号", "Australian mobile"))}${phoneField("account-phone", state.form["account-phone"] || "")}</label><button class="primary full" type="submit">${h(t("绑定", "Bind"))}</button></form><button type="button" class="ghost full" style="margin-top:8px" data-action="skip-phone">${h(t("稍后绑定", "Not now"))}</button>`;
}
function renderMe() {
  if (state.auth === "guest") return renderGuestMe();
  const counts = {
    unpaid: state.orders.filter((item) => item.status === "unpaid").length,
    pending: state.orders.filter((item) => item.status === "pending").length,
    delivering: state.orders.filter((item) => item.status === "delivering").length,
    done: state.orders.filter((item) => item.status === "done").length
  };
  const rows = [
    ["#/messages", t("消息", "Messages"), unreadCount() ? t(`${unreadCount()} 条未读`, `${unreadCount()} unread`) : t("评论、申请和结果", "Comments, requests and results")],
    ["#/my-listings", t("我的闲置", "My listings"), t("发布、已出、下架", "Posted, sold, unlisted")],
    ["#/address", t("收货地址", "Addresses"), t("配送用，不公开到闲置", "For delivery, not shown on listings")],
    ["#/contact", t("给买家的联系方式", "Contact for buyers"), t("申请通过后才会给对方", "Shared only after you accept")],
    ["#/service", t("联系客服", "Support"), t("微信客服，不是站内聊天", "WeChat support, not a chat with buyers")]
  ];
  const shortcuts = [["unpaid", "待支付"], ["pending", "待配送"], ["delivering", "配送中"], ["done", "已完成"]];
  const phoneBanner = state.auth === "nophone"
    ? `<div class="notice">${h(t("已登录，还没绑定澳洲手机号。下单、收货地址和发布闲置之前要先绑定。", "Signed in, but no Australian mobile yet. Bind one before checkout, addresses or posting."))}</div><button type="button" class="primary full" data-action="open-bind" style="margin:8px 0 12px">${h(t("绑定澳洲手机号", "Bind Australian mobile"))}</button>`
    : "";
  return `<div class="me-head"><div class="avatar-lg">林</div><div><b>林可</b><p class="muted">${h(state.auth === "nophone" ? t("已登录 · 未绑定澳洲手机号", "Signed in · no Australian mobile") : t("微信登录 · 已绑定澳洲手机号", "WeChat login · Australian mobile saved"))}</p></div></div>
    ${phoneBanner}
    <div class="order-shortcuts">${shortcuts.map(([key, label]) => `<button type="button" data-go="#/orders?status=${encodeURIComponent(label)}"><strong>${counts[key]}</strong>${h(tr(label))}</button>`).join("")}</div>
    <div style="height:12px"></div>
    ${rows.map(([hash, title, sub]) => `<button type="button" class="linkrow" data-go="${hash}"><b>${h(title)}</b><small style="display:block">${h(sub)}</small></button>`).join("")}`;
}
function renderMessages() {
  if (!state.messages.length) return `<div class="empty"><h2>${h(t("没有消息", "No messages"))}</h2></div>`;
  return state.messages.map((item) => `<button type="button" class="msg ${item.read ? "" : "unread"}" data-go="#/message/${item.id}"><b>${h(tx(item, "title"))}</b><small>${h(tr(item.time))} · ${h(tx(item, "body"))}</small></button>`).join("");
}
function renderMessage(route) {
  const item = state.messages.find((msg) => msg.id === route.id);
  if (!item) return `<div class="empty"><h2>${h(t("消息不存在", "Message not found"))}</h2></div>`;
  return `<h2>${h(tx(item, "title"))}</h2><p class="muted">${h(tr(item.time))}</p><p>${h(tx(item, "body"))}</p><p class="muted">${h(t("若你授权过订阅消息，离开小程序也能收到。没授权就只在这里亮红点。", "If you allowed subscription messages, you can be notified outside the mini program. Otherwise the badge here is the only reminder."))}</p><button type="button" class="primary" data-go="${h(item.go)}">${h(t("查看", "Open"))}</button>`;
}
function contactRow(label, value) {
  const empty = !value;
  return `<div class="kv"><span>${h(label)}</span><b class="${empty ? "muted" : ""}">${h(empty ? t("还没填", "Not set") : value)}</b></div>`;
}
function renderContact() {
  return `<form data-form="contact"><p>${h(t("填在这里的手机号或微信号，不会写进帖子。买家申请之后，你点同意，对方才能看到。", "The mobile or WeChat saved here is not printed on the listing. Buyers see it only after you accept."))}</p><p class="hint">${h(t("至少填一个。收货地址里的电话不会自动填到这里。", "At least one is required. Delivery phones are not copied here."))}</p><label class="field">${h(t("手机号", "Mobile"))}${phoneField("c-phone", state.form["c-phone"])}</label><p class="muted">${h(t("国家号已经写好。", "The country code is filled in."))}</p>${field("c-wechat", t("微信号", "WeChat"), state.form["c-wechat"], { extra: 'placeholder="xiangkou_lin"' })}<button class="primary full" type="submit">${h(t("保存", "Save"))}</button></form>`;
}
function renderService() {
  return `<div class="pay-hero"><div class="mark">${icons.user}</div><h2>${h(t("微信客服", "WeChat support"))}</h2><p>${h(t("正式环境里，这个按钮打开小程序客服。这里不是买家和卖家的聊天。", "In production this opens WeChat support. It is not a chat between buyer and seller."))}</p><button type="button" class="primary" data-action="fake-service">${h(t("联系客服", "Contact support"))}</button></div>`;
}
function productBar(item) {
  if (!item || item.stock <= 0) return bar(`<button type="button" class="primary" disabled>${h(t("暂时缺货", "Out of stock"))}</button>`);
  return bar(`<button type="button" class="ghost" data-action="add-cart">${h(t("加入购物车", "Add to cart"))}</button><button type="button" class="primary" data-action="buy-now">${h(t("立即购买", "Buy now"))}</button>`);
}
function checkoutBar(route) {
  const lines = checkoutLines(route);
  const ok = canPay(route);
  const goods = moneyOf(lines);
  const quote = shipQuote(goods || 0, state.city);
  return bar(`<div><small class="muted">${h(t("合计", "Total"))}</small><div class="price">¥${yuan((goods || 0) + (ok || lines.length ? quote.fee : 0))}</div></div><button type="button" class="ghost" data-action="pay-later" ${ok ? "" : "disabled"}>${h(t("稍后付", "Pay later"))}</button><button type="button" class="primary" data-action="pay" ${ok ? "" : "disabled"}>${h(t("微信支付", "WeChat Pay"))}</button>`);
}

function render() {
  const route = parse();
  if (bounce(route)) return;
  const prev = document.getElementById("view");
  const top = prev ? prev.scrollTop : 0;
  const hash = location.hash || "#/mall";
  const changed = hash !== state.lastHash;
  if (changed) enter(route);
  state.lastHash = hash;
  const view = views(route);
  shell(route, view.title, view.body, view);
  if (!changed) {
    const next = document.getElementById("view");
    if (next) next.scrollTop = top;
  }
  paintDirectory(changed);
}
function views(route) {
  const itemP = route.name === "product" ? product(route.id) : null;
  const itemO = route.name === "order" ? order(route.id) : null;
  const itemL = route.name === "listing" ? listing(route.id) : null;
  const refundOrder = route.name === "refund" ? order(route.id) : null;
  const refundTitle = refundOrder && refundOrder.status === "pending" ? t("取消并退款", "Cancel items") : t("申请退款", "Request a refund");
  const map = {
    mall: [t("巷口到家", "Lanehome"), renderMall(), { tab: "mall" }],
    category: [tr(route.id) || t("分类", "Category"), renderCategory(route), {}],
    search: [t("搜索", "Search"), renderSearch(route), {}],
    product: [itemP ? tx(itemP, "name") : t("商品", "Product"), renderProduct(route), { bar: productBar(itemP) }],
    cart: [t("购物车", "Cart"), renderCart(route), { tab: "cart", bar: route.query.empty === "1" || !state.cart.length ? "" : bar(`<button type="button" class="primary" data-go="#/checkout">${h(t("去结算", "Checkout"))}</button>`) }],
    checkout: [t("确认订单", "Checkout"), renderCheckout(route), { bar: checkoutBar(route) }],
    address: [t("收货地址", "Addresses"), renderAddress(), {}],
    "address-edit": [route.id === "new" ? t("新增地址", "New address") : t("编辑地址", "Edit address"), renderAddressEdit(route), {}],
    "pay-result": [t("支付结果", "Payment"), renderPay(route), {}],
    orders: [t("我的订单", "Orders"), renderOrders(route), {}],
    order: [t("订单详情", "Order"), renderOrder(route), { bar: orderBar(itemO) }],
    refund: [refundTitle, renderRefund(route), {}],
    city: [t("选择城市", "Choose city"), renderCity(), {}],
    flea: [t("闲置", "Market"), renderFlea(), { tab: "flea", fab: `<button type="button" class="fab" data-go="#/publish" aria-label="${h(t("发布闲置", "Post a listing"))}">${icons.plus}</button>` }],
    listing: [itemL ? tx(itemL, "title") : t("闲置", "Listing"), renderListing(route), { bar: listingBar(itemL) }],
    apply: [t("申请联系方式", "Request contact"), renderApply(route), {}],
    publish: [route.id ? t("编辑闲置", "Edit listing") : t("发布闲置", "New listing"), renderPublish(route), { bar: publishBar(route) }],
    "my-listings": [t("我的闲置", "My listings"), renderMyListings(), {}],
    report: [t("举报", "Report"), renderReport(route), {}],
    me: [t("我的", "Me"), renderMe(), { tab: "me" }],
    messages: [t("消息", "Messages"), renderMessages(), {}],
    message: [t("消息详情", "Message"), renderMessage(route), {}],
    contact: [t("给买家的联系方式", "Contact for buyers"), renderContact(), {}],
    service: [t("客服", "Support"), renderService(), {}],
    login: [t("微信登录", "WeChat login"), renderLogin(), {}],
    "bind-phone": [t("绑定手机号", "Bind mobile"), renderBindPhone(), {}]
  };
  const found = map[route.name] || [t("页面不存在", "Page not found"), `<div class="empty"><h2>${h(t("没有这一页", "This page does not exist"))}</h2><button type="button" class="primary" data-go="#/mall">${h(t("回首页", "Back home"))}</button></div>`, {}];
  return { title: found[0], body: found[1], ...found[2] };
}

function pageMeta(hash) {
  const normal = normalizeHash(hash);
  const exact = pages.find((item) => item[1] === normal);
  if (exact) return exact;
  const path = normal.split("?")[0];
  const samePath = pages.find((item) => item[1].split("?")[0] === path);
  if (samePath) return samePath;
  const route = path.split("/")[1] || "mall";
  return pages.find((item) => (item[1].split("?")[0].split("/")[1] || "mall") === route);
}
function normalizeHash(hash) {
  const raw = hash || "#/mall";
  const [path, qs] = raw.split("?");
  const decodedPath = path.split("/").map((part) => { try { return decodeURIComponent(part); } catch { return part; } }).join("/");
  if (!qs) return decodedPath;
  const decodedQs = qs.split("&").map((pair) => {
    const [k, v = ""] = pair.split("=");
    try { return `${decodeURIComponent(k)}=${decodeURIComponent(v)}`; } catch { return pair; }
  }).join("&");
  return `${decodedPath}?${decodedQs}`;
}
function paintDirectory(scroll) {
  const aside = document.getElementById("directory");
  if (!aside.dataset.ready) {
    const groups = [];
    pages.forEach(([group, hash]) => {
      if (!groups.length || groups[groups.length - 1].group !== group) groups.push({ group, items: [] });
      groups[groups.length - 1].items.push({ hash });
    });
    aside.innerHTML = `<div class="dir-top"><p class="dir-kicker">MINI PROGRAM</p><h1>页面与规则</h1><p class="dir-lead">点一个页面，手机右侧列出这一页要交给 UI 的关键点。</p></div>` + groups.map((group) => `<div class="dir-group">${h(group.group)}</div>${group.items.map((item) => `<button type="button" class="dir-btn" data-hash="${h(item.hash)}">${h(labelOf(item.hash))}</button>`).join("")}`).join("");
    aside.dataset.ready = "1";
    aside.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-hash]");
      if (btn) jump(btn.dataset.hash);
    });
  }
  const hash = normalizeHash(location.hash || "#/mall");
  const meta = pageMeta(hash);
  paintSpec(meta);
  aside.querySelectorAll(".dir-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.hash === (meta ? meta[1] : "")));
  if (scroll) aside.querySelector(".dir-btn.active")?.scrollIntoView({ block: "nearest" });
}
function paintSpec(meta) {
  const spec = document.getElementById("spec");
  if (!spec) return;
  const points = meta && Array.isArray(meta[2]) ? meta[2] : ["在手机里继续点。左侧可跳到每一种状态。"];
  spec.innerHTML = `<p class="spec-kicker">这一页的关键点</p><h2>${h(meta ? labelOf(meta[1]) : "页面")}</h2><ol>${points.map((point) => `<li>${h(point)}</li>`).join("")}</ol>`;
}
function labelOf(hash) {
  const names = {
    "#/mall": "首页",
    "#/mall?city=canberra": "堪培拉 · 快递",
    "#/category/清洁": "分类列表",
    "#/search": "搜索",
    "#/search?q=没有这个": "搜索无结果",
    "#/product/p1": "商品详情",
    "#/product/p9": "商品缺货",
    "#/cart": "购物车",
    "#/cart?empty=1": "购物车空态",
    "#/checkout": "确认订单",
    "#/checkout?addr=a2": "地址不可配送",
    "#/address": "地址列表",
    "#/address-edit/new": "新增地址",
    "#/pay-result/o2": "支付成功",
    "#/pay-result?fail=1": "支付未完成",
    "#/orders": "订单列表",
    "#/order/o1": "待支付",
    "#/order/o2": "待配送",
    "#/order/o3": "配送中",
    "#/order/o4": "已完成·可售后",
    "#/order/o5": "已完成·超期",
    "#/order/o6": "部分退款审核中",
    "#/order/o7": "已退款",
    "#/order/o8": "已取消",
    "#/refund/o4": "部分退款",
    "#/city": "选择城市",
    "#/flea": "闲置列表",
    "#/flea?city=canberra": "城市空态",
    "#/listing/l1": "帖子·买家",
    "#/listing/l2": "帖子·卖家",
    "#/listing/l4": "联系方式已给出",
    "#/listing/l5": "拒绝后可再申请",
    "#/listing/l5?block=1": "已拒绝此人",
    "#/listing/l3": "已出",
    "#/apply/l1": "申请联系方式",
    "#/publish": "发布闲置",
    "#/publish?nocontact=1": "缺联系方式",
    "#/my-listings": "我的闲置",
    "#/report/l1": "举报",
    "#/me": "我的",
    "#/mall?guest=1": "游客 · 商城",
    "#/flea?guest=1": "游客 · 闲置",
    "#/product/p1?guest=1": "游客 · 商品",
    "#/cart?guest=1": "游客 · 购物车",
    "#/me?guest=1": "游客 · 我的",
    "#/login": "微信登录",
    "#/bind-phone": "绑定澳洲手机号",
    "#/me?nophone=1": "已登录未绑手机",
    "#/messages": "消息",
    "#/message/m2": "消息详情",
    "#/contact": "给买家的联系方式",
    "#/service": "微信客服"
  };
  return names[hash] || hash;
}
function val(id) {
  const el = document.getElementById(id);
  if (!el) return state.form[id] || "";
  return el.type === "checkbox" ? el.checked : el.value.trim();
}
function rememberInputs(target) {
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) return;
  if (target.type === "radio") state.form[target.name] = target.value;
  else if (target.id) state.form[target.id] = target.type === "checkbox" ? target.checked : target.value;
}

function createOrder(status) {
  const route = parse();
  const lines = checkoutLines(route);
  const addr = currentAddress();
  const goods = moneyOf(lines);
  const quote = shipQuote(goods, state.city);
  const post = quote.mode === "post";
  const slot = slotById(state.slotId);
  const item = {
    id: `o${Date.now()}`,
    status,
    created: "10-27 17:10",
    deliveryDate: post ? "" : state.deliveryDate,
    slotLabel: post ? "快递寄出" : (slot ? `${slot.zh} ${slot.start}–${slot.end}` : ""),
    slotLabelEn: post ? "Posted by courier" : (slot ? `${slot.en} ${slot.start}–${slot.end}` : ""),
    fulfillment: quote.mode,
    city: state.city,
    shipFee: quote.fee,
    address: { name: addr.name, phone: addr.phone, city: addr.city, district: addr.district, detail: addr.detail, postcode: addr.postcode, formatted: addr.formatted, placeId: addr.placeId },
    items: lines.map((line) => ({ ...line, refunded: 0 })),
    remark: val("remark"),
    goods,
    refunds: []
  };
  state.orders.unshift(item);
  if (route.query.mode === "buynow") state.buyNow = null;
  else state.cart = [];
  return item;
}
function finishPay(status) {
  const addr = currentAddress();
  if (!addressOk(addr)) return notify(t("这个地址不能配送", "This address cannot be delivered to"));
  if (modeOf(state.city) === "local") {
    const slot = slotById(state.slotId);
    if (!slot || !slot.on || !deliveryDates().some((item) => item.iso === state.deliveryDate)) return notify(t("请选择明天起的日期和还能约的时段", "Pick a date from tomorrow and an open time"));
  }
  const item = createOrder(status);
  if (status === "pending") go(`#/pay-result/${item.id}`);
  else {
    notify(t("订单已保留 15 分钟", "Order held for 15 minutes"));
    go(`#/order/${item.id}`);
  }
}
function badPhone() { return t("请填写 +61 后面的澳大利亚手机号，例如 412 345 678", "Enter the Australian mobile after +61, for example 412 345 678"); }

const actions = {
  back,
  "toggle-lang"() {
    state.lang = state.lang === "zh" ? "en" : "zh";
    render();
  },
  qty(el) {
    const item = product(parse().id);
    const next = state.detailQty + Number(el.dataset.dir);
    if (next < 1) return;
    if (item && next > item.stock) return notify(t("不能超过库存", "Not enough stock"));
    state.detailQty = next;
    render();
  },
  "add-cart"() {
    const item = product(parse().id);
    const qty = state.detailQty;
    const line = state.cart.find((row) => row.id === item.id);
    if (line) {
      if (line.qty + qty > item.stock) return notify(t("购物车里的数量已经到库存上限", "Cart quantity is already at the stock limit"));
      line.qty += qty;
    } else state.cart.push({ id: item.id, qty });
    notify(t("已加入购物车", "Added to cart"));
  },
  "buy-now"() {
    const dest = "#/checkout?mode=buynow";
    if (!requirePhone(dest)) return;
    const item = product(parse().id);
    state.buyNow = { id: item.id, qty: state.detailQty };
    go(dest);
  },
  "cart-qty"(el) {
    const line = state.cart.find((row) => row.id === el.dataset.id);
    const item = product(el.dataset.id);
    const next = line.qty + Number(el.dataset.dir);
    if (next > item.stock) return notify(t("不能超过库存", "Not enough stock"));
    if (next <= 0) state.cart = state.cart.filter((row) => row.id !== line.id);
    else line.qty = next;
    render();
  },
  "remove-line"(el) {
    state.cart = state.cart.filter((row) => row.id !== el.dataset.id);
    render();
  },
  slot(el) {
    const slot = slotById(el.dataset.id);
    if (!slot || !slot.on) return;
    state.slotId = slot.id;
    render();
  },
  date(el) {
    if (!deliveryDates().some((item) => item.iso === el.dataset.id)) return;
    state.deliveryDate = el.dataset.id;
    render();
  },
  like(el) {
    if (!requireLogin(location.hash || "#/mall")) return;
    const id = el.dataset.id;
    state.likes[id] = !state.likes[id];
    render();
  },
  "pick-place"(el) {
    state.form.placeId = el.dataset.id;
    state.form.placeQuery = "";
    render();
  },
  "clear-place"() {
    state.form.placeId = "";
    state.form.placeQuery = "";
    render();
  },
  pay() { if (!requirePhone(location.hash || "#/checkout")) return; finishPay("pending"); },
  "pay-later"() { if (!requirePhone(location.hash || "#/checkout")) return; finishPay("unpaid"); },
  "pay-existing"(el) {
    if (!requirePhone(location.hash || "#/orders")) return;
    const item = order(el.dataset.id);
    item.status = "pending";
    notify(t("支付成功", "Paid"));
    go(`#/pay-result/${item.id}`);
  },
  "cancel-unpaid"(el) {
    ask(t("取消订单", "Cancel order"), t("还没付款。取消后库存锁定会释放。", "You have not paid. Cancelling releases the stock lock."), t("确认取消", "Cancel order"), () => {
      order(el.dataset.id).status = "cancelled";
      notify(t("订单已关闭", "Order closed"));
    });
  },
  receive(el) {
    ask(t("确认收货", "Confirm delivery"), t("确认后订单完成。若其实没收到，7 天内仍可以申请退款。", "The order completes. If it did not arrive, you can still request a refund within 7 days."), t("确认收货", "Confirm"), () => {
      const item = order(el.dataset.id);
      item.status = "done";
      item.doneAt = Date.now();
      notify(t("已确认收货", "Delivery confirmed"));
    });
  },
  "pick-address"(el) {
    state.addressId = el.dataset.id;
    go(state.buyNow ? "#/checkout?mode=buynow" : "#/checkout");
  },
  "delete-address"(el) {
    if (state.addresses.length === 1) return notify(t("至少留一个地址", "Keep at least one address"));
    ask(t("删除地址", "Delete address"), t("删掉后结算页不再出现这个地址。", "Checkout will no longer offer this address."), t("删除", "Delete"), () => {
      state.addresses = state.addresses.filter((addr) => addr.id !== el.dataset.id);
      if (state.addressId === el.dataset.id) state.addressId = state.addresses[0].id;
      notify(t("已删除", "Deleted"));
      go("#/address");
    });
  },
  "flea-cat"(el) {
    state.fleaCat = el.dataset.cat;
    render();
  },
  "pick-city"(el) {
    state.city = el.dataset.city;
    state.fleaCat = "全部";
    state.fleaQ = "";
    syncAddressToCity();
    const prev = String(stack.pop() || "#/mall");
    const dest = prev.includes("flea") ? "#/flea" : prev.includes("publish") ? prev : "#/mall";
    lockHash = true;
    location.hash = dest;
    render();
  },
  "next-image"() {
    const route = parse();
    const item = route.name === "product" ? product(route.id) : listing(route.id);
    const total = route.name === "product" ? item.images.length : (item.photos || []).length;
    if (total < 2) return;
    state.imageIndex = (state.imageIndex + 1) % total;
    render();
  },
  "set-condition"(el) { state.form.condition = el.dataset.value; render(); },
  "set-category"(el) { state.form.category = el.dataset.value; render(); },
  reply(el) {
    if (!requireLogin(location.hash || "#/flea")) return;
    state.replyTo = el.dataset.id;
    render();
  },
  "wechat-login"() {
    state.auth = "nophone";
    if (!state.afterAuth) state.afterAuth = "#/mall";
    go("#/bind-phone");
  },
  "open-bind"() {
    state.afterAuth = "#/me?nophone=1";
    go("#/bind-phone");
  },
  "skip-phone"() {
    const next = stripAuthQuery(state.afterAuth || "#/mall");
    state.afterAuth = "";
    if (hashNeedsPhone(next)) {
      notify(t("下单、地址和发布闲置要先绑定澳洲手机号", "Checkout, addresses and posting need an Australian mobile"));
      return;
    }
    go(next);
  },
  "delete-comment"(el) {
    ask(t("删除评论", "Delete comment"), t("只删除你自己发的这一条。", "Only this comment of yours is deleted."), t("删除", "Delete"), () => {
      const item = listing(parse().id);
      item.comments = item.comments.filter((comment) => comment.id !== el.dataset.id);
      notify(t("已删除", "Deleted"));
    });
  },
  "add-image"() {
    if (state.photoSlots.length >= 9) return;
    const next = UPLOADS.find((src) => !state.photoSlots.includes(src)) || UPLOADS[state.photoSlots.length % UPLOADS.length];
    state.photoSlots.push(next);
    render();
  },
  "remove-image"(el) {
    state.photoSlots.splice(Number(el.dataset.index), 1);
    render();
  },
  "refund-qty"(el) {
    const item = order(parse().id);
    const line = item.items.find((row) => row.id === el.dataset.id);
    const left = lineLeft(line);
    const next = (state.refundPick[line.id] || 0) + Number(el.dataset.dir);
    if (next < 1 || next > left) return;
    state.refundPick[line.id] = next;
    render();
  },
  "approve-request"(el) {
    const item = listing(el.dataset.listing);
    const req = item.requests.find((row) => row.id === el.dataset.id);
    ask(t("给出联系方式", "Share contact"), t("对方将看到你预留的手机号或微信号。平台不介入之后的交易。", "They will see the mobile or WeChat you saved. The platform does not join the trade."), t("同意", "Accept"), () => {
      req.status = "approved";
      notify(t("已展示联系方式，并给对方发了提醒", "Contact shared, and they were notified"));
    });
  },
  "reject-request"(el) {
    const item = listing(el.dataset.listing);
    const req = item.requests.find((row) => row.id === el.dataset.id);
    if (!req || req.status !== "pending") return;
    ask(t("拒绝这一次", "Decline this request"), t("只拒绝这一次。对方还可以再申请。若不想再被这个人申请，用「拒绝此人申请联系方式」。", "This only declines the current request. They can apply again. Use “Stop this person asking” if you do not want another request."), t("拒绝", "Decline"), () => {
      req.status = "rejected";
      notify(t("已拒绝这一次。对方还可以再申请", "Declined this time. They can apply again"));
    });
  },
  "block-request"(el) {
    const item = listing(el.dataset.listing);
    const req = item.requests.find((row) => row.id === el.dataset.id);
    if (!req || req.status === "approved" || req.status === "blocked") return;
    ask(t("拒绝此人申请联系方式", "Stop this person asking"), t("这个人不能再申请这条闲置的联系方式。", "This person cannot ask for contact on this listing again."), t("拒绝此人", "Stop them"), () => {
      req.status = "blocked";
      notify(t("已拒绝此人。对方不能再申请", "Stopped. They cannot ask again"));
    });
  },
  "mark-sold"(el) {
    ask(t("标为已出", "Mark sold"), t("列表里还会留着，但不能再申请联系方式，也不能编辑。", "It stays visible, but contact requests and editing close."), t("标为已出", "Mark sold"), () => {
      listing(el.dataset.id).status = "已出";
      notify(t("已标为已出", "Marked sold"));
    });
  },
  unlist(el) {
    ask(t("下架", "Unlist"), t("下架后不会出现在城市列表里。", "It disappears from the city feed."), t("下架", "Unlist"), () => {
      listing(el.dataset.id).status = "已下架";
      notify(t("已下架", "Unlisted"));
      go("#/my-listings");
    });
  },
  "copy-contact"() {
    const item = listing(parse().id);
    const text = normalizeAuMobile(item && item.sellerPhone) || "";
    if (navigator.clipboard && text) navigator.clipboard.writeText(text).catch(() => {});
    notify(t(`已复制 ${phonePretty(text)}`, `Copied ${phonePretty(text)}`));
  },
  "fake-service"() { notify(t("正式环境将打开微信客服会话", "Production opens a WeChat support chat")); },
  "dialog-ok"() {
    const run = state.dialog && state.dialog.run;
    state.dialog = null;
    if (run) run();
    else render();
  },
  "dialog-cancel"() {
    state.dialog = null;
    if (state.auth === "guest") state.afterAuth = "";
    render();
  }
};

function onSubmit(event) {
  const form = event.target.closest("form");
  if (!form) return;
  event.preventDefault();
  const kind = form.dataset.form;
  if (kind === "search") { go(`#/search?q=${encodeURIComponent(val("q"))}`); return; }
  if (kind === "flea-search") { state.fleaQ = val("flea-q"); render(); return; }
  if (kind === "address") return saveAddress();
  if (kind === "contact") return saveContact();
  if (kind === "comment") return saveComment();
  if (kind === "apply") return saveApply();
  if (kind === "publish") return savePublish();
  if (kind === "refund") return saveRefund();
  if (kind === "report") return saveReport();
  if (kind === "account-phone") return saveAccountPhone();
}
function saveAccountPhone() {
  const phone = normalizeAuMobile(val("account-phone"));
  if (!phone) return notify(badPhone());
  state.accountPhone = phone;
  state.auth = "member";
  const next = stripAuthQuery(state.afterAuth || "#/me");
  state.afterAuth = "";
  notify(t("澳洲手机号已绑定", "Australian mobile saved"));
  go(next);
}
function saveAddress() {
  const name = val("addr-name");
  const phone = normalizeAuMobile(val("addr-phone"));
  const place = placeById(state.form.placeId);
  if (!name) return notify(t("请填写联系人", "Add a name"));
  if (!phone) return notify(badPhone());
  if (!place) return notify(t("请从检索结果里点一条地址", "Pick an address from the search results"));
  const route = parse();
  const makeDefault = !!document.getElementById("addr-default")?.checked;
  const fields = { name, phone, city: place.city, district: place.suburb, detail: place.line, postcode: place.postcode, formatted: place.formatted, placeId: place.id };
  if (makeDefault) state.addresses.forEach((addr) => { addr.isDefault = false; });
  if (route.id && route.id !== "new") {
    const addr = addressById(route.id);
    Object.assign(addr, fields, { isDefault: makeDefault || addr.isDefault });
  } else {
    const addr = { id: `a${Date.now()}`, ...fields, isDefault: makeDefault };
    state.addresses.push(addr);
    state.addressId = addr.id;
  }
  notify(t("地址已保存", "Address saved"));
  go("#/address");
}
function saveContact() {
  const phone = normalizeAuMobile(val("c-phone"));
  const wechat = val("c-wechat");
  if (!val("c-phone") && !wechat) return notify(t("至少留一种联系方式", "Leave at least one contact method"));
  if (val("c-phone") && !phone) return notify(badPhone());
  state.contact = { phone, wechat };
  notify(t("已保存。买家申请后，你同意了才会把这些给对方", "Saved. Buyers see it only after you accept."));
  const prev = String(stack[stack.length - 1] || "");
  if (prev.includes("publish")) state.keepPublish = true;
  back();
}
function saveComment() {
  if (!requireLogin(location.hash || "#/flea")) return;
  const text = val("comment");
  if (!text) return notify(t("先写点内容", "Write something first"));
  const item = listing(parse().id);
  if (state.replyTo) {
    const parent = item.comments.find((comment) => comment.id === state.replyTo);
    parent.replies.push({ id: `r${Date.now()}`, user: "林可", owner: item.mine, text: text.slice(0, 200), textEn: text.slice(0, 200), time: "刚刚" });
    state.replyTo = null;
  } else {
    item.comments.push({ id: `c${Date.now()}`, user: "林可", owner: item.mine, text: text.slice(0, 200), textEn: text.slice(0, 200), time: "刚刚", replies: [] });
  }
  state.form.comment = "";
  notify(item.mine ? t("已发出", "Sent") : t("已评论。发布者会看到红点。", "Commented. The seller gets a badge."));
}
function saveApply() {
  if (!requireLogin(location.hash || "#/flea")) return;
  const item = listing(parse().id);
  const req = shownRequest(item);
  if (req && req.status === "blocked") return notify(t("对方已拒绝你申请联系方式", "They stopped your requests"));
  if (req && req.status !== "rejected") return notify(t("已经申请过了", "You already applied"));
  item.myRequest = { status: "pending", note: val("note").slice(0, 100), noteEn: val("note").slice(0, 100), attempts: (item.myRequest && item.myRequest.attempts || 0) + 1 };
  notify(t("已提交。对方打开小程序会看到红点", "Submitted. They will see a badge."));
  go(`#/listing/${item.id}`);
}
function savePublish() {
  if (!requirePhone(location.hash || "#/publish")) return;
  const route = parse();
  const firstContact = showContactForm(route);
  let nextContact = null;
  if (firstContact) {
    const rawPhone = val("pub-phone");
    const phone = normalizeAuMobile(rawPhone);
    const wechat = val("pub-wechat").trim();
    if (!rawPhone && !wechat) return notify(t("手机号和微信号至少填一个", "Add a mobile or WeChat"));
    if (rawPhone && !phone) return notify(badPhone());
    nextContact = { phone, wechat };
  }
  if (state.photoSlots.length < 1) return notify(t("至少上传一张图", "Add at least one photo"));
  const title = val("title");
  const desc = val("desc");
  const priceYuan = Number(val("price"));
  if (!title || !desc) return notify(t("标题和描述都要填", "Title and description are required"));
  if (!priceYuan || priceYuan <= 0) return notify(t("标价要大于 0", "Price must be greater than 0"));
  if (nextContact) state.contact = nextContact;
  const payload = {
    title, titleEn: title, desc, descEn: desc,
    price: Math.round(priceYuan * 100),
    negotiable: !!document.getElementById("negotiable")?.checked,
    condition: state.form.condition || "几乎全新",
    category: state.form.category || "日用品",
    photos: [...state.photoSlots],
    imageCount: state.photoSlots.length,
    ratio: state.listings.length % 2 ? "square" : "tall",
    city: state.city
  };
  if (route.id) {
    Object.assign(listing(route.id), payload);
    notify(t("已保存", "Saved"));
    go(`#/listing/${route.id}`);
    return;
  }
  state.listings.unshift({
    id: `l${Date.now()}`, mine: true, owner: "林可", status: "在售", char: title.slice(0, 1), tone: "pine", comments: [], requests: [], ...payload
  });
  notify(firstContact ? t("已发布，联系方式已记下", "Posted, and the contact was saved") : t("已发布", "Posted"));
  go(`#/listing/${state.listings[0].id}`);
}
function saveRefund() {
  const item = order(parse().id);
  const picked = refundSelection(item);
  if (!picked.lines.length) return notify(t("先选择要退的商品", "Choose at least one item"));
  if (openRefund(item)) return notify(t("已有一笔退款在审核", "A refund is already in review"));
  const extra = val("extra");
  const reason = state.form.reason || "其他";
  const reasonText = extra ? `${reason}：${extra}` : reason;
  const record = {
    id: `rf${Date.now()}`,
    status: item.status === "pending" ? "approved" : "open",
    lines: picked.lines,
    goods: picked.goods,
    ship: picked.ship,
    amount: picked.amount,
    reason: reasonText,
    reasonEn: extra ? `${tr(reason)}: ${extra}` : tr(reason),
    from: item.status
  };
  item.refunds = item.refunds || [];
  if (item.status === "pending") {
    picked.lines.forEach((line) => {
      const row = item.items.find((entry) => entry.id === line.id);
      row.refunded = (row.refunded || 0) + line.qty;
    });
    item.refunds.push(record);
    if (item.items.every((line) => (line.refunded || 0) >= line.qty)) item.status = "refunded";
    notify(t("所选商品已原路退回", "Selected items have been refunded"));
    go(`#/order/${item.id}`);
    return;
  }
  if (picked.remainAfter) {
    item.refundFrom = item.status;
    item.status = "refunding";
  }
  item.refunds.push(record);
  notify(t("已提交，等待门店审核", "Submitted. The shop will review it."));
  go(`#/order/${item.id}`);
}
function saveReport() {
  if (!requireLogin(location.hash || "#/flea")) return;
  notify(t("已提交。后台可以下架这条内容", "Submitted. The desk can unlist it."));
  back();
}

function bind() {
  const app = document.getElementById("app");
  app.addEventListener("click", (event) => {
    const el = event.target.closest("[data-action],[data-go]");
    if (!el || !app.contains(el)) return;
    if (el.dataset.go) {
      const dest = el.dataset.go;
      if (hashNeedsPhone(dest)) {
        if (!requirePhone(dest)) return;
      } else if (hashNeedsLogin(dest)) {
        if (!requireLogin(dest)) return;
      }
      const route = parse();
      if (route.name === "publish" && (dest.startsWith("#/city") || dest.startsWith("#/contact"))) state.keepPublish = true;
      go(dest);
      return;
    }
    const fn = actions[el.dataset.action];
    if (fn) fn(el);
  });
  app.addEventListener("submit", onSubmit);
  app.addEventListener("input", (event) => {
    rememberInputs(event.target);
    if (event.target.id !== "place-q") return;
    state.form.placeQuery = event.target.value;
    const box = document.getElementById("place-suggest");
    if (box) box.innerHTML = placeSuggestHtml(event.target.value);
  });
  app.addEventListener("change", (event) => {
    rememberInputs(event.target);
    const box = event.target.closest("[data-refund-id]");
    if (!box) return;
    const id = box.dataset.refundId;
    if (box.checked) {
      const item = order(parse().id);
      const line = item.items.find((row) => row.id === id);
      state.refundPick[id] = lineLeft(line);
    } else delete state.refundPick[id];
    render();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.dialog) { state.dialog = null; render(); }
  });
  window.addEventListener("hashchange", () => {
    if (lockHash) { lockHash = false; return; }
    stack.length = 0;
    render();
  });
}

seed();
bind();
if (!location.hash) {
  lockHash = true;
  location.hash = "#/mall";
}
state.auth = authFromHash(location.hash || "#/mall");
render();
