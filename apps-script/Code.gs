/**
 * FitPlan – Google Apps Script receiver.
 * Bound to the "FitPlan – Responses & Plans" spreadsheet.
 * Setup: Extensions > Apps Script > paste this file > Deploy > New deployment >
 * type "Web app", Execute as "Me", Who has access "Anyone" > copy the /exec URL
 * into fitplan-config.js (SCRIPT_URL).
 */
var HEADERS = ['Submission ID','Submitted At','Name','Telegram / Phone','Gender','Age','Height (cm)','Weight (kg)','Target Weight (kg)','Goal','Fitness Level','Location','Days per Week','Minutes per Session','Equipment','Preferred Days','Preferred Time','Injuries / Limits','Notes','Plan Status'];
var PLAN_HEADERS = ['Submission ID','Name','Telegram / Phone','Week Day','Session','Focus','Exercise','Sets x Reps / Time','Notes'];

function doGet() { return ContentService.createTextOutput('FitPlan endpoint OK'); }

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var d = JSON.parse(e.postData.contents);
    if (!d || !d.name || !d.contact) throw new Error('name and contact required');
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = getSheet_(ss, 'Responses', HEADERS, true);
    var id = 'FP-' + Utilities.formatDate(new Date(), 'Asia/Yangon', 'yyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 900 + 100);
    var row = [id, new Date(), clean_(d.name), clean_(d.contact), clean_(d.gender), num_(d.age), num_(d.height), num_(d.weight), num_(d.target),
      clean_(d.goal), clean_(d.level), clean_(d.location), num_(d.daysPerWeek), num_(d.minutes),
      (d.equipment || []).map(clean_).join(', '), (d.days || []).map(clean_).join(', '), clean_(d.time), clean_(d.injuries), clean_(d.notes), 'Plan created'];
    sh.appendRow(row);
    buildPlan_(ss, id, d);
    return json_({ ok: true, id: id });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/* Re-run the plan for any row (select a row in Responses, then Fitness Plan menu). */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Fitness Plan').addItem('Rebuild plan for selected row', 'rebuildSelected').addToUi();
}
function rebuildSelected() {
  var sh = SpreadsheetApp.getActiveSheet();
  if (sh.getName() !== 'Responses') { SpreadsheetApp.getUi().alert('Select a row in the Responses tab.'); return; }
  var r = sh.getActiveRange().getRow();
  if (r < 2) return;
  var v = sh.getRange(r, 1, 1, HEADERS.length).getValues()[0];
  var d = { name: v[2], contact: v[3], gender: v[4], age: v[5], height: v[6], weight: v[7], target: v[8], goal: v[9], level: v[10], location: v[11],
    daysPerWeek: v[12], minutes: v[13], equipment: String(v[14]).split(', '), days: String(v[15]).split(', '), time: v[16], injuries: v[17], notes: v[18] };
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var plans = getSheet_(ss, 'Plans', PLAN_HEADERS, false);
  var last = plans.getLastRow();
  for (var i = last; i >= 2; i--) if (plans.getRange(i, 1).getValue() === v[0]) plans.deleteRow(i);
  buildPlan_(ss, v[0], d);
}

function buildPlan_(ss, id, d) {
  var plans = getSheet_(ss, 'Plans', PLAN_HEADERS, false);
  var n = Math.max(2, Math.min(6, num_(d.daysPerWeek) || 3));
  var mins = num_(d.minutes) || 45;
  var perSession = mins <= 20 ? 4 : mins <= 30 ? 5 : mins <= 45 ? 6 : 8;
  var level = String(d.level || 'Beginner');
  var sets = level.indexOf('Adv') === 0 ? '4 x 8-12' : level.indexOf('Inter') === 0 ? '3 x 10-12' : '2-3 x 10-12';
  var goal = String(d.goal || '');
  var loc = String(d.location || 'Home');
  var eq = (d.equipment || []).join(' ').toLowerCase();
  var gym = loc.indexOf('Gym') === 0 || eq.indexOf('gym') >= 0;
  var db = eq.indexOf('dumbbell') >= 0 || gym;
  var band = eq.indexOf('band') >= 0;
  var inj = String(d.injuries || '').toLowerCase();
  var kneeSafe = /knee|ဒူး/.test(inj);
  var backSafe = /back|ခါး/.test(inj);
  var shoulderSafe = /shoulder|ပခုံး/.test(inj);

  var lib = {
    push: [gym ? 'Barbell/Machine Chest Press' : db ? 'Dumbbell Floor Press' : 'Push-ups (knee push-ups if needed)', shoulderSafe ? 'Incline Push-ups (low range)' : (db ? 'Dumbbell Shoulder Press' : 'Pike Push-ups'), 'Triceps Dips (bench/chair)', band ? 'Band Chest Fly' : 'Plank Shoulder Taps', 'Lateral Raise (light)', 'Plank'],
    pull: [gym ? 'Lat Pulldown / Cable Row' : db ? 'One-arm Dumbbell Row' : band ? 'Band Row' : 'Superman Hold + Towel Row', band ? 'Band Pull-apart' : 'Reverse Snow Angels', db ? 'Dumbbell Biceps Curl' : 'Isometric Towel Curl', 'Face Pull / Rear Delt Raise', 'Dead Bug', 'Bird-dog'],
    legs: [kneeSafe ? 'Glute Bridge' : (gym ? 'Leg Press / Goblet Squat' : db ? 'Goblet Squat' : 'Bodyweight Squat (box squat)'), kneeSafe ? 'Hip Thrust (bodyweight)' : 'Reverse Lunge', backSafe ? 'Glute Bridge March' : (db ? 'Romanian Deadlift' : 'Single-leg Hip Hinge'), 'Calf Raise', kneeSafe ? 'Wall Sit (short holds)' : 'Step-ups', 'Side-lying Leg Raise'],
    cardio: [mins <= 30 ? 'Brisk walk / light jog 10 min' : 'Brisk walk / light jog 15 min', kneeSafe ? 'Low-impact march intervals 30s on / 30s off' : 'Jumping jacks / skipping 30s on / 30s off', 'Mountain Climbers (slow)', 'Burpee-free circuit: squat to reach', 'Core: Bicycle Crunch', 'Core: Plank 3 x 30s'],
    full: [kneeSafe ? 'Glute Bridge' : 'Squat', 'Push-ups', db ? 'Dumbbell Row' : 'Reverse Snow Angels', 'Romanian Deadlift / Hip Hinge', 'Plank', 'Brisk walk 10 min'],
    mobility: ['Cat-Cow', 'Hip Flexor Stretch', 'Thoracic Rotation', 'Hamstring Stretch', 'Chest Opener (doorway)', 'Neck & Upper-trap Release (desk posture)']
  };

  var split;
  if (goal.indexOf('Weight Loss') === 0) split = ['full', 'cardio', 'legs', 'cardio', 'push', 'pull'];
  else if (goal.indexOf('Muscle') === 0) split = ['push', 'pull', 'legs', 'push', 'pull', 'legs'];
  else if (goal.indexOf('Strength') === 0) split = ['legs', 'push', 'pull', 'legs', 'full', 'mobility'];
  else if (goal.indexOf('Stamina') === 0) split = ['cardio', 'full', 'cardio', 'legs', 'cardio', 'mobility'];
  else split = ['full', 'cardio', 'full', 'mobility', 'full', 'cardio'];
  if (n === 2) split = [split[0], split[2] || split[1]];
  if (n === 3 && goal.indexOf('Muscle') === 0) split = ['push', 'pull', 'legs'];

  var days = (d.days && d.days.length >= n) ? d.days.slice(0, n) : ['Mon', 'Wed', 'Fri', 'Sat', 'Tue', 'Thu'].slice(0, n);
  var rows = [];
  for (var s = 0; s < n; s++) {
    var focus = split[s % split.length];
    var items = lib[focus].slice(0, perSession);
    items.push('Cool-down mobility 5 min');
    var cardioOrMob = (focus === 'cardio' || focus === 'mobility');
    for (var k = 0; k < items.length; k++) {
      rows.push([id, clean_(d.name), clean_(d.contact), days[s], 'Session ' + (s + 1), focus.toUpperCase(), items[k],
        k === items.length - 1 ? '5 min' : (cardioOrMob ? '30-40s work / 20s rest x 3 rounds' : sets), s === 0 && k === 0 ? 'Preferred time: ' + clean_(d.time) : '']);
    }
  }
  var tip = [];
  if (kneeSafe) tip.push('Knee: avoid jumping and deep lunges.');
  if (backSafe) tip.push('Back: keep spine neutral, no heavy hinging.');
  if (shoulderSafe) tip.push('Shoulder: limit overhead pressing.');
  rows.push([id, clean_(d.name), clean_(d.contact), '', 'Coach notes', 'REVIEW', 'Target ' + num_(d.weight) + ' kg -> ' + num_(d.target) + ' kg. ' + tip.join(' '), 'Progress: add 1-2 reps/week; add weight when all sets are easy.', 'Needs coach review before sending']);
  plans.getRange(plans.getLastRow() + 1, 1, rows.length, PLAN_HEADERS.length).setValues(rows);
}

function getSheet_(ss, name, headers, renameFirst) {
  var sh = ss.getSheetByName(name);
  if (!sh && renameFirst) { sh = ss.getSheets()[0]; sh.setName(name); }
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#9ee939');
    sh.setFrozenRows(1);
  }
  return sh;
}
function clean_(v) { // strip leading =,+,-,@ to prevent formula injection in Sheets
  var s = String(v == null ? '' : v).slice(0, 500);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
function num_(v) { var n = Number(v); return isFinite(n) ? n : ''; }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
