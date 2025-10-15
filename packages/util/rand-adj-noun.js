// adjectives 词表（40 个常用正面形容词，可按需增删）
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
  "Wise",
  "Jolly",
  "Mighty",
  "Cheerful",
  "Playful",
  "Sparkly",
  "Charming",
  "Delightful",
  "Friendly",
  "Joyful",
];

// nouns 词表（40 个日常可见的小物件，可按需增删）
const NOUNS = [
  "Marshmallow",
  "TeddyBear",
  "Star",
  "Butterfly",
  "Puppy",
  "Kitten",
  "Lollipop",
  "Bunny",
  "Cloud",
  "Cupcake",
  "Macaron",
  "Snail",
  "Daisy",
  "Heart",
  "Moon",
  "Sunshine",
  "Whale",
  "Penguin",
  "Unicorn",
  "Balloon",
  "Candy",
  "Honey",
  "Pillow",
  "SockPuppet",
  "Chocolate",
  "IceCream",
  "Cookie",
  "Muffin",
  "Sparkle",
  "Rainbow",
  "Panda",
  "Koala",
  "Flower",
  "Robot",
  "Castle",
  "Dragon",
  "Pizza",
  "Donut",
  "Book",
  "Guitar",
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
