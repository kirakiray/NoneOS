// adjectives 词表（30 个常用正面形容词，可按需增删）
const ADJECTIVES = [
  "Red",
  "Happy",
  "Brave",
  "Calm",
  "Bright",
  "Sweet",
  "Cool",
  "Sharp",
  "Fresh",
  "Soft",
  "Lucky",
  "Golden",
  "Silent",
  "Swift",
  "Gentle",
  "Cosy",
  "Vivid",
  "Zesty",
  "Plucky",
  "Sunny",
  "Cozy",
  "Noble",
  "Prime",
  "Radiant",
  "Spicy",
  "Fluffy",
  "Clever",
  "Daring",
  "Eager",
  "Kind",
];

// nouns 词表（30 个日常可见的小物件，可按需增删）
const NOUNS = [
  "Banana",
  "Apple",
  "Kettle",
  "Lamp",
  "Pencil",
  "Wallet",
  "Shoe",
  "Cookie",
  "Orange",
  "Book",
  "Chair",
  "Bottle",
  "Mouse",
  "Phone",
  "Watch",
  "Bag",
  "Guitar",
  "Camera",
  "Flower",
  "Candle",
  "Cupcake",
  "Donut",
  "Pillow",
  "Blanket",
  "Socks",
  "Teapot",
  "Mirror",
  "Rocket",
  "Balloon",
  "Trophy",
];

// 内部工具：从数组随机取一项
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * 生成随机用户名：Adjective + Noun
 * @param {string} sep  分隔符，默认空串；可传 '_' 或 '-' 等
 * @returns {string}    例如 "SwiftKettle" 或 "Happy_Banana"
 */
export function generate(sep = "-") {
  return (
    pick(ADJECTIVES) +
    sep +
    pick(NOUNS) +
    sep +
    Math.random().toString().slice(2, 6)
  );
}

// 默认导出对象，方便按需扩展
const RandAdjNoun = { generate, ADJECTIVES, NOUNS };
export default RandAdjNoun;
