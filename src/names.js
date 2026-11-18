// Player names can't be swear words or rude body words (Ethan and his dad, 2026-11-18). English and German.
// The word lists are base64-encoded, so nobody reading the game's code has to see them. To change them, decode with
// atob(...) in the browser console, edit, and encode again with btoa(...).
const ANYWHERE = atob('ZnVjayxzaGl0LGJpdGNoLGN1bnQsYXNob2xlLHB1c3ksc2x1dCx3aG9yZSx3YW5rZXIsdHdhdCxuaWdlcixuaWdhLGZhZ290LHBvcm4sYmFzdGFyZCxyZXRhcmQsbW90aGVyZixzY2hlaXMsZmljayxhcnNjaGxvY2gsZm90emUsaHVyZW5zb2huLHdpY2hzZXIsc2NobGFtcGUsbWlzZ2VidXJ0LHNjaHd1Y2h0ZWwsc3Bhc3QsYm9sbG9jayxkaWNraGVhZCxwZW5pcyx2YWdpbmEscGltbWVsLHRpdGVuLHNwZXJtYSxob2Rlbixmb3R6').split(','); // blocked anywhere in the name
const WHOLE = atob('YXNzLGFyc2UsZGljayxjb2NrLHBpc3MsZGFtbixjcmFwLGZhZyxzZXgsYXJzY2gsaHVyZSxrYWNrZSxuZWdlcixwaXNzZXIsdGl0cyx3dGYsc3RmdSxtdXNjaGksc2Nod2Fueixib29iLGJvb2JzLGFudXMscHVzc3ksbmFja3QsbnVkZSxuYWtlZCx2dWx2YSxkaWxkbw==').split(','); // blocked only as a whole word (so "Cassie" and "Glass" are fine)

// Lowercase, German letters spelled out, number tricks undone (5h1t → shit), and doubled letters squashed (fuuuck → fuck)
function normalize(text) {
  return text
    .toLowerCase()
    .replaceAll('ä', 'a').replaceAll('ö', 'o').replaceAll('ü', 'u').replaceAll('ß', 's')
    .replace(/[0@4]/g, (c) => ({ 0: 'o', '@': 'a', 4: 'a' })[c])
    .replace(/[1!|]/g, 'i').replaceAll('3', 'e').replace(/[5$]/g, 's').replaceAll('7', 't');
}
const squash = (text) => text.replace(/(.)\1+/g, '$1');

// true when the name is OK to use
export function niceName(name) {
  const clean = normalize(name);
  const joined = squash(clean.replace(/[^a-z]/g, '')); // "f u c k" or "f.u.c.k" too
  if (ANYWHERE.some((word) => joined.includes(squash(word)))) return false;
  const words = clean.split(/[^a-z]+/).filter(Boolean);
  const squashedWhole = WHOLE.map(squash);
  return !words.some((word) => WHOLE.includes(word) || squashedWhole.includes(squash(word)));
}
