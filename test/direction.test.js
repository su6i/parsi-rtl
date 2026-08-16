const test = require('node:test');
const assert = require('node:assert/strict');
const { decideDirection } = require('../src/rtl.js');

test('a Persian sentence that OPENS with a Latin term is still RTL', () => {
    // The exact line that first-strong (`unicode-bidi: plaintext`) gets wrong.
    const line = 'Gemini web app رو Google سرو می‌کند (تو نمی‌تونی local app رو modify کنی)';
    assert.equal(decideDirection(line), 'rtl');
});

test('Persian prose is RTL', () => {
    assert.equal(decideDirection('این یک خط کاملاً فارسی است.'), 'rtl');
});

test('English prose is LTR', () => {
    assert.equal(decideDirection('This is an entirely English answer.'), 'ltr');
});

test('an English sentence with one Persian word stays LTR', () => {
    const line = 'The Persian word for hello is سلام and it is used everywhere in daily speech.';
    assert.equal(decideDirection(line), 'ltr');
});

test('a Persian sentence dense with English terms stays RTL', () => {
    const line = 'برای patch کردن app.asar باید header hash را در Info.plist بنویسی.';
    assert.equal(decideDirection(line), 'rtl');
});

test('code-like text is LTR', () => {
    assert.equal(decideDirection("el.dir = fa >= en * 0.35 ? 'rtl' : 'ltr';"), 'ltr');
});

test('too little signal returns null instead of guessing', () => {
    assert.equal(decideDirection(''), null);
    assert.equal(decideDirection(null), null);
    assert.equal(decideDirection('   '), null);
    assert.equal(decideDirection('...'), null);
    assert.equal(decideDirection('🙂'), null);
    assert.equal(decideDirection('«»'), null);
});

test('digits and punctuation alone never flip the direction', () => {
    assert.equal(decideDirection('۱۲۳۴ ۵۶۷۸'), null);
    assert.equal(decideDirection('1234 5678'), null);
});

test('Arabic script text is RTL', () => {
    assert.equal(decideDirection('هذه جملة عربية كاملة.'), 'rtl');
});

test('the ratio boundary behaves as documented', () => {
    // 4 Persian letters vs 10 Latin: 4 >= 10 * 0.35 -> rtl
    assert.equal(decideDirection('سلام abcdefghij'), 'rtl');
    // 3 Persian letters vs 10 Latin: 3 < 3.5 -> ltr
    assert.equal(decideDirection('سلا abcdefghij'), 'ltr');
});

test('every RTL script is detected, not just Persian', () => {
    assert.equal(decideDirection('این یک خط فارسی است'), 'rtl');          // Persian
    assert.equal(decideDirection('هذه جملة عربية كاملة'), 'rtl');          // Arabic
    assert.equal(decideDirection('یہ اردو کا جملہ ہے'), 'rtl');            // Urdu
    assert.equal(decideDirection('دا د پښتو جمله ده'), 'rtl');             // Pashto
    assert.equal(decideDirection('זהו משפט בעברית מלא'), 'rtl');           // Hebrew
    assert.equal(decideDirection('މިއީ ދިވެހި ބަހުން ލިޔެފައިވާ ޖުމްލައެކެވެ'), 'rtl'); // Dhivehi (Thaana)
    assert.equal(decideDirection('ܗܢܐ ܟܬܒܐ ܣܘܪܝܝܐ'), 'rtl');              // Syriac
});

test('an RTL script mixed with heavy English still wins at the same ratio', () => {
    assert.equal(decideDirection('שלום abcdefghij'), 'rtl');
    assert.equal(decideDirection('שלו abcdefghij'), 'ltr');
});
