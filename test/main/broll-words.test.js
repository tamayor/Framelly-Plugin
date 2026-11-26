// B-roll "Sync to words", the pure part (src/main/broll-words.js). findWordHit and the suggestions are in broll.test.js.
const test = require('node:test');
const assert = require('node:assert/strict');
const env = require('../helpers/env');

const W = env.main('broll-words');

test('numbers the transcription split are joined back: "1" + ",600", "$" + "174,953"', () => {
    const got = W.mergeSplitNumbers([
        { w: '1', start: 0, end: 1 }, { w: ',600', start: 1, end: 2 }, { w: 'dollars', start: 2, end: 3 },
        { w: '$', start: 4, end: 5 }, { w: '174,953', start: 5, end: 6 }
    ]);
    assert.deepEqual(got.map(x => x.w), ['1,600', 'dollars', '$174,953']);
    assert.equal(got[0].end, 2, 'the joined word ends where its last piece ends');
});

test('words compare without case, accents or punctuation; first / last word of a text', () => {
    assert.equal(W.normWord('Café!'), 'cafe');
    assert.equal(W.firstWordOf('  hello there '), 'hello');
    assert.equal(W.lastWordOf('hello there'), 'there');
    assert.equal(W.lastWordOf(''), '');
});

test('versus-split rows are counted as the Board counts them (a row with no label is still a row)', () => {
    const units = W.WORD_UNITS['versus-split']({ rows: ['| 1M | 3M', 'Views | 2M | 5M', '   ', 'a', 'b', 'c', 'd'] });
    assert.deepEqual(units, ['1M', 'Views', 'a', 'b', 'c']);
});
