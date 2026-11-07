// Quick type — plain words in, sorted fields out, and NOTHING lost.
const test = require('node:test'), assert = require('node:assert/strict');
const { QuickType } = require('./helpers.js');
const P = t => QuickType.parse(t);
const flat = o => Object.entries(o).filter(([k]) => k !== '__cats').map(([, v]) => (Array.isArray(v) ? v.map(x => (typeof x === 'string' ? x : [x.title, x.url].join(' '))).join(' ') : String(v))).join(' ');

const CASES = [
  ["Cian O'Brien from OCS Development Group 646-331-2205, transferred by the Building Department, re: zoning, permits, mercantile license",
    { caller: "Cian O'Brien", company: 'OCS Development Group', phone: '646-331-2205', topics: 'Zoning\nPermits\nMercantile license', reason: /transferred by the Building Department/ }],
  ["call Phil Gordon 5167879090 SWA Development Corp, Industrial Zone, Wants to Speak to Law Staff, questions about development of 4 Retails Sites, and 2 Residential sites, details for him -- website name: swadevelopment.co and email is pgordon@swadevelopment.co -- also reachable at 6468980560 -- prefers calls after 3pm and can be reached by email or sms",
    { caller: 'Phil Gordon', company: 'SWA Development Corp', phone: '516-787-9090', forWho: 'Law Staff', alt: /pgordon@swadevelopment\.co · 646-898-0560/, extra: /Prefers calls after 3pm/, refs: /swadevelopment\.co/ }],
  ['Message for Sandra Cole: Tom Reyes from Reyes Realty 718-555-0143 called about a lease', { forWho: 'Sandra Cole', caller: 'Tom Reyes', company: 'Reyes Realty', phone: '718-555-0143' }],
  ['Tom Reyes called asking for Mr. Patel about the lease, 718-555-0143', { forWho: 'Mr. Patel', caller: 'Tom Reyes', phone: '718-555-0143' }],
  ['Tom Reyes 718-555-0143 wants to speak to the zoning attorney about parcel 14', { forWho: 'Zoning Attorney', caller: 'Tom Reyes' }],
  ['Tom Reyes called about parking, 718-555-0143, check with team', { forWho: 'Check with team', topics: 'Parking' }],
  ['bob called about the parking ticket, wants someone to call him back, says he is out of town until Friday', { caller: 'Bob', topics: /parking ticket/i, reason: /out of town until Friday/ }],
  ['Maria Gomez, Gomez Plumbing, (516) 555-0188 or cell 516-555-0199, called at 2:15 pm about a water main leak on Park Ave. Very urgent! Her email is maria@gomezplumbing.com. See www.gomezplumbing.com. Says the inspector never showed up.',
    { caller: 'Maria Gomez', company: 'Gomez Plumbing', phone: '516-555-0188', urgent: true, time: '14:15', alt: /maria@gomezplumbing\.com/, topics: /water main leak/i, refs: /gomezplumbing\.com/ }],
  ['Caller: Dr. Lee\nCompany: Mercy Hospital\nPhone: 212-555-0100\nNotes: prefers mornings\nre: lab results, billing', { caller: 'Dr. Lee', company: 'Mercy Hospital', phone: '212-555-0100', extra: /prefers mornings/, topics: 'Lab results\nBilling', action: /Dr\. Lee’s call/ }],
  ['ASAP: Joan Park from Park & Sons 917-555-0100 wants a callback', { caller: 'Joan Park', urgent: true, phone: '917-555-0100' }],
  ['Will call again later. Dave from Acme Corp', { methods: ['Telephoned', 'Will call again'] }],
  ['Priya Shah 646 555 0111 priya@example.org', { caller: 'Priya Shah', phone: '646-555-0111', alt: 'priya@example.org' }],
  ['Left message: Ed Kim, 212.555.0199, re: invoice 4471', { phone: '212-555-0199', topics: /invoice 4471/i }],
  ['Sam at the city clerk wants Dana to call back about mercantile licence renewal', { forWho: /Dana/, company: 'City Clerk', caller: 'Sam', topics: /mercantile licence renewal/i }]
];
for (const [input, want] of CASES) {
  test('⚡ ' + input.slice(0, 64).replace(/\n/g, ' ') + '…', () => {
    const got = P(input);
    for (const [k, v] of Object.entries(want)) {
      const val = k === 'refs' ? flat({ refs: got.refs || [] }) : got[k];
      if (v instanceof RegExp) assert.match(String(val), v, `${k}: ${JSON.stringify(val)}`);
      else if (Array.isArray(v)) assert.deepEqual(val, v, k);
      else assert.equal(val, v, `${k}: ${JSON.stringify(val)}`);
    }
  });
}

// The promise: every meaningful word you type survives somewhere in the note (fields, topics, notes or references).
const FILLER = new Set(['the', 'and', 'for', 'was', 'his', 'her', 'him', 'she', 'has', 'are', 'with', 'from', 'that', 'this', 'call', 'called', 'calls', 'please', 'back', 'also', 'email', 'phone', 'cell', 'website', 'name', 'about', 'wants', 'want', 'asking', 'said', 'says', 'very', 'see', 'speak', 'details', 'reachable', 'can', 'reached', 'message', 'left', 'later', 'will', 'out', 'who', 'not', 'questions', 'someone', 'caller', 'urgent', 'asap', 'callback', 'company', 'notes']);
test('⚡ nothing is lost: every meaningful word typed ends up in the note', () => {
  const lost = [];
  for (const [input] of CASES) {
    const out = flat(P(input)).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9@. ]+/g, ' ');
    for (const w of new Set(input.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9@. ]+/g, ' ').split(/\s+/))) {
      const word = w.replace(/^\.+|\.+$/g, '').replace(/'s$/, '');
      if (word.length < 4 || FILLER.has(word) || /^[\d.]+$/.test(word)) continue;
      if (!out.includes(word) && !out.includes(word.replace(/s$/, ''))) lost.push(word + '  ⟵  ' + input.slice(0, 40));
    }
  }
  assert.deepEqual(lost, [], 'words that vanished:\n' + lost.join('\n'));
});
test('⚡ empty / junk input never throws', () => { for (const t of ['', '   ', '!!!', '\n\n', '😀😀', '555']) assert.doesNotThrow(() => P(t)); });
