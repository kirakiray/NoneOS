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

// nouns 词表（40 个水果，可按需增删）
const NOUNS = [
  "Apple",
  "Pear",
  "Plum",
  "Peach",
  "Mango",
  "Kiwi",
  "Lime",
  "Lemon",
  "Grape",
  "Cherry",
  "Berry",
  "Melon",
  "Guava",
  "Orange",
  "Banana",
  "Apricot",
  "Coconut",
  "Olive",
  "Mulberry",
  "Loquat",
  "Lychee",
  "Mora",
  "Nectarine",
  "Pomelo",
  "Tangerine",
  "Yuzu",
  "Satsuma",
  "Persimmon",
  "Longan",
  "Rambutan",
  "Mangosteen",
  "Durian",
  "Jackfruit",
  "Starfruit",
  "Dragonfruit",
  "Passionfruit",
  "Cranberry",
  "Blueberry",
  "Raspberry",
  "Gooseberry",
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
