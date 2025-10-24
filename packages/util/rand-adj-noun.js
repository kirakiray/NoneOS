// adjectives 词表（40 个常用正面形容词，可按需增删）
const ADJECTIVES = [
  "Red",
  "Happy",
  "Brave",
  "Calm",
  "Sweet",
  "Cool",
  "Sharp",
  "Fresh",
  "Soft",
  "Lucky",
  "Golden",
  "Swift",
  "Gentle",
  "Cosy",
  "Zesty",
  "Sunny",
  "Cozy",
  "Noble",
  "Prime",
  "Spicy",
  "Fluffy",
  "Clever",
  "Eager",
  "Kind",
  "Wise",
  "Jolly",
  "Mighty",
  "Playful",
  "Spark",
  "Charm",
  "Quick",
  "Bright",
  "Cute",
  "Fun",
  "Nice",
  "Good",
  "Pure",
  "Real",
  "Safe",
  "Warm",
];

// nouns 词表（40 个日常可见的小物件，可按需增删）
const NOUNS = [
  "Star",
  "Bear",
  "Puppy",
  "Kitty",
  "Bunny",
  "Cloud",
  "Cake",
  "Snail",
  "Heart",
  "Moon",
  "Whale",
  "Bird",
  "Apple",
  "Candy",
  "Honey",
  "Stone",
  "Plant",
  "Clock",
  "Phone",
  "Table",
  "Chair",
  "House",
  "Tower",
  "Train",
  "Plane",
  "Boat",
  "Bike",
  "Lamp",
  "Book",
  "Pen",
  "Ball",
  "Hat",
  "Cup",
  "Sock",
  "Toy",
  "Key",
  "Wallet",
  "Mirror",
  "Comb",
  "Brush",
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
    Math.random().toString().slice(2, 4)
  );
}

// 默认导出对象，方便按需扩展
const RandAdjNoun = { generate, ADJECTIVES, NOUNS };
export default RandAdjNoun;
