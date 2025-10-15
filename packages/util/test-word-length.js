import { ADJECTIVES, NOUNS } from './rand-adj-noun.js';

console.log('Adjectives (max 5 letters):');
ADJECTIVES.forEach(word => {
  if (word.length > 5) {
    console.log(`ERROR: "${word}" has ${word.length} letters`);
  } else {
    console.log(`${word} (${word.length} letters)`);
  }
});

console.log('\nNouns (max 5 letters):');
NOUNS.forEach(word => {
  if (word.length > 5) {
    console.log(`ERROR: "${word}" has ${word.length} letters`);
  } else {
    console.log(`${word} (${word.length} letters)`);
  }
});