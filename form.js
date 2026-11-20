(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var all = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var txt = function (e) { return (e.textContent || '').replace(/\s+/g, ' ').trim(); };
  var CHECKED = /^(check|check_circle|check_box|radio_button_checked)$/;
  var ICONS = /^(check|check_circle|check_box|radio_button_checked|radio_button_unchecked|check_box_outline_blank)$/;

  var style = document.createElement('style');
  style.textContent = '.fp-opt{cursor:pointer}.fp-in{background:transparent;border:0;border-bottom:1px solid #424936;color:inherit;font:inherit;outline:none;min-width:0}.fp-in:focus{border-color:#9ee939}.fp-err{outline:2px solid #ffb4ab!important;border-radius:8px}.fp-box{background:#1b202d;border-radius:12px;padding:16px;margin:0 16px 16px;display:flex;flex-direction:column;gap:10px}.fp-box label{font-size:13px;color:#c1cab0}.fp-box input{background:#0e131f;border:1px solid #424936;border-radius:8px;color:#dde2f3;padding:12px;font-size:16px}';
  document.head.appendChild(style);

  var cards = all('h2').map(function (h) {
    var c = h;
    while (c.parentElement && all('h2', c.parentElement).length < 2) c = c.parentElement;
    return c;
  });

  // option element = highest ancestor of the title that holds no other option's title
  function optionsFromTitles(root, titles) {
    var els = titles.map(function (t) {
      return all('span,p,div', root).filter(function (e) { return e.children.length === 0 && txt(e).indexOf(t) === 0; })[0];
    });
    return els.map(function (el, i) {
      var o = el;
      while (o.parentElement && !els.some(function (x, j) { return j !== i && o.parentElement.contains(x); })) o = o.parentElement;
      return o;
    });
  }
  function iconOf(o) { return all('.material-symbols-outlined', o).filter(function (s) { return ICONS.test(txt(s)); })[0]; }
  function isSel(o) { var ic = iconOf(o); return ic ? CHECKED.test(txt(ic)) : /(^|\s)bg-primary(\s|$)/.test(o.className); }

  function group(opts, multi) {
    var sel = opts.filter(isSel)[0], un = opts.filter(function (o) { return !isSel(o); })[0];
    var selC = sel && sel.className, unC = un && un.className;
    function paint(o, on) {
      if (selC && unC) o.className = (on ? selC : unC) + ' fp-opt';
      var ic = iconOf(o);
      if (ic) {
        var isBox = /box/.test(txt(ic));
        ic.textContent = isBox ? (on ? 'check_box' : 'check_box_outline_blank') : (on ? 'radio_button_checked' : 'radio_button_unchecked');
        ic.style.fontVariationSettings = on ? "'FILL' 1" : '';
      }
      o.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    opts.forEach(function (o) {
      o._on = isSel(o);
      o.classList.add('fp-opt'); o.setAttribute('role', multi ? 'checkbox' : 'radio'); o.tabIndex = 0;
      function go() {
        if (multi) { o._on = !o._on; paint(o, o._on); return; }
        opts.forEach(function (x) { x._on = false; paint(x, false); });
        o._on = true; paint(o, true);
      }
      o.addEventListener('click', function (e) { e.preventDefault(); go(); });
      o.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); go(); } });
    });
    return { opts: opts };
  }
  function picked(g, vals) { var i = g.opts.map(function (o) { return o._on; }).indexOf(true); return i < 0 ? '' : vals[i]; }
  function pickedMany(g, vals) { return g.opts.map(function (o, i) { return o._on ? vals[i] : null; }).filter(Boolean); }

  // 1. body info
  var c0 = cards[0];
  var gender = group(all('button[type=button]', c0).slice(0, 3), false);
  var inputs = {};
  var metricSpans = all('span', c0).filter(function (s) { return s.children.length === 0 && /^\d+$/.test(txt(s)); }).slice(0, 3);
  var ranges = { age: [12, 90], height: [100, 230], weight: [30, 250], target: [30, 250] };
  function numInput(span, key, val) {
    var inp = document.createElement('input');
    inp.type = 'number'; inp.inputMode = 'numeric'; inp.className = 'fp-in ' + span.className; inp.value = val;
    inp.min = ranges[key][0]; inp.max = ranges[key][1]; inp.style.width = '5.5ch'; inp.setAttribute('aria-label', key);
    span.replaceWith(inp); inputs[key] = inp;
  }
  ['age', 'height', 'weight'].forEach(function (k, i) { numInput(metricSpans[i], k, txt(metricSpans[i])); });
  var tgtSpan = all('span', c0).filter(function (s) { return s.children.length === 0 && /^\d+\s*kg$/i.test(txt(s)); })[0];
  numInput(tgtSpan, 'target', parseInt(txt(tgtSpan), 10));
  var delta = all('div', c0).filter(function (d) { return /trending_/.test(txt(d)) && d.children.length <= 2; }).pop();
  function updDelta() {
    if (!delta) return;
    var d = (+inputs.target.value) - (+inputs.weight.value);
    var ic = delta.querySelector('.material-symbols-outlined');
    delta.lastChild.textContent = ' ' + (d > 0 ? '+' : '') + d + ' kg';
    if (ic) ic.textContent = d <= 0 ? 'trending_down' : 'trending_up';
  }
  inputs.target.addEventListener('input', updDelta); inputs.weight.addEventListener('input', updDelta); updDelta();

  // 2-4. goal / level / location
  var goalVals = ['Weight Loss', 'Muscle Building', 'Strength & Power', 'Stamina', 'General Health'];
  var lvlVals = ['Beginner', 'Intermediate', 'Advanced'];
  var locVals = ['Home', 'Gym', 'Outdoor', 'Mixed'];
  var goal = group(optionsFromTitles(cards[1], ['ကိုယ်အလေးချိန် လျှော့', 'ကြွက်သား တည်ဆောက်', 'ခွန်အား တိုး', 'ခံနိုင်ရည်', 'အထွေထွေ']), false);
  var level = group(optionsFromTitles(cards[2], ['စတင်လေ့ကျင့်သူ', 'အသင့်အတင့်', 'ကျွမ်းကျင်']), false);
  var location_ = group(optionsFromTitles(cards[3], ['အိမ်တွင်', 'Gym တွင်', 'ပြင်ပတွင်', 'အိမ် + Gym']), false);

  // 5. schedule
  var sb = all('button[type=button]', cards[4]);
  var daysG = group(sb.slice(0, 5), false), minsG = group(sb.slice(5, 9), false);
  var dayVals = [2, 3, 4, 5, 6], minVals = [20, 30, 45, 60];

  // 6. equipment
  var eqVals = ['No Equipment', 'Dumbbells', 'Resistance Bands', 'Home Equipment', 'Full Gym'];
  var equip = group(optionsFromTitles(cards[5], ['No Equipment', 'Dumbbells', 'Resistance Bands', 'Home Equipment', 'Full Gym']), true);

  // 7. preferred days, time, injuries, notes
  var chips = all('span', cards[6]).filter(function (s) { return s.children.length === 0 && /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/.test(txt(s)); });
  var dowVals = chips.map(function (c) { return txt(c).split(' ')[0]; });
  var dow = group(chips, true);
  function field(match, ph) {
    var s = all('span,p', cards[6]).filter(function (e) { return e.children.length === 0 && match.test(txt(e)); })[0];
    if (!s) return { value: '' };
    var inp = document.createElement('input');
    inp.type = 'text'; inp.className = 'fp-in ' + s.className; inp.value = ''; inp.placeholder = ph; inp.maxLength = 300; inp.style.width = '100%';
    s.replaceWith(inp); return inp;
  }
  var timeF = field(/AM|PM|Morning/, 'e.g. 7:00 AM');
  var injF = field(/ဒူးနာ|knee/i, 'None / e.g. knee pain');
  var noteF = field(/ရုံးထိုင်|Desk/i, 'Anything else?');

  // contact box (new fields)
  var box = document.createElement('div');
  box.className = 'fp-box';
  box.innerHTML = '<label for="fp-name">နာမည် (Name) *</label><input id="fp-name" maxlength="80" autocomplete="name">' +
    '<label for="fp-contact">Telegram username / Phone *</label><input id="fp-contact" maxlength="80" placeholder="@username or 09..." autocomplete="tel">' +
    '<label for="fp-email">Email (plan will be sent here) *</label><input id="fp-email" type="email" maxlength="120" placeholder="you@example.com" autocomplete="email">';
  cards[0].parentElement.insertBefore(box, cards[0]);

  var btn = all('button').filter(function (b) { return /Plan စီစဉ်ပေးမယ်/.test(txt(b)); })[0];
  btn.removeAttribute('onclick');
  var label = btn.querySelector('span');
  var original = label.textContent;

  btn.addEventListener('click', function () {
    all('.fp-err').forEach(function (e) { e.classList.remove('fp-err'); });
    var bad = [];
    function need(el, ok) { if (!ok) { el.classList.add('fp-err'); bad.push(el); } }
    var name = $('#fp-name').value.trim(), contact = $('#fp-contact').value.trim(), email = $('#fp-email').value.trim();
    need($('#fp-name'), name.length > 0);
    need($('#fp-contact'), contact.length > 2);
    need($('#fp-email'), /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email));
    Object.keys(ranges).forEach(function (k) { var v = +inputs[k].value; need(inputs[k], v >= ranges[k][0] && v <= ranges[k][1]); });
    var data = {
      name: name, contact: contact, email: email,
      gender: picked(gender, ['Male', 'Female', 'Other']),
      age: +inputs.age.value, height: +inputs.height.value, weight: +inputs.weight.value, target: +inputs.target.value,
      goal: picked(goal, goalVals), level: picked(level, lvlVals), location: picked(location_, locVals),
      daysPerWeek: picked(daysG, dayVals), minutes: picked(minsG, minVals),
      equipment: pickedMany(equip, eqVals), days: pickedMany(dow, dowVals),
      time: timeF.value, injuries: injF.value, notes: noteF.value
    };
    need(goal.opts[0].parentElement, !!data.goal);
    need(level.opts[0].parentElement, !!data.level);
    need(location_.opts[0].parentElement, !!data.location);
    need(daysG.opts[0].parentElement, !!data.daysPerWeek);
    need(minsG.opts[0].parentElement, !!data.minutes);
    if (bad.length) {
      bad[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
      label.textContent = 'အနီရောင်ပြထားသော အကွက်များ ဖြည့်ပါ';
      setTimeout(function () { label.textContent = original; }, 3000);
      return;
    }
    try { localStorage.setItem('fitplan_last', JSON.stringify(data)); } catch (e) {}
    var url = window.FITPLAN_SCRIPT_URL;
    function done() { location.href = 'checkout.html'; }
    if (!url) { console.warn('FITPLAN_SCRIPT_URL is empty: answers kept in this browser only'); return done(); }
    btn.disabled = true; label.textContent = 'ပို့နေပါသည်...';
    // text/plain body avoids a CORS preflight, which Apps Script web apps cannot answer
    fetch(url, { method: 'POST', body: JSON.stringify(data) })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (!j.ok) throw new Error(j.error); try { localStorage.setItem('fitplan_id', j.id); } catch (e) {} done(); })
      .catch(function () { btn.disabled = false; label.textContent = 'မအောင်မြင်ပါ၊ ထပ်ကြိုးစားပါ (Retry)'; });
  });
})();
