import RandAdjNoun from './rand-adj-noun.js';

console.log('Testing updated random username generation:');
for (let i = 0; i < 10; i++) {
  console.log(RandAdjNoun.generate());
}

// 测试不同分隔符
console.log('\nTesting with different separators:');
console.log(RandAdjNoun.generate('_'));
console.log(RandAdjNoun.generate(''));