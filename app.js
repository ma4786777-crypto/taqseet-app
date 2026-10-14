/* ============================================================
   قاعدة البيانات
   ============================================================ */
const DB = {
  KEY: 'taqseet_db_v3',
  data: {
    merchants: [], customers: [],
    admins: [{ id: 'admin1', name: 'admin', password: 'admin123' }],
    customersList: [], contracts: [], collaterals: [], traders: [],
    session: null, theme: 'light'
  },
  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (raw) this.data = { ...this.data, ...JSON.parse(raw) };
    } catch (e) {}
  },
  save() {
    try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (e) {}
  },
  uid(p = 'id') {
    return p + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  }
};
DB.load();

/* ============================================================
   المجالات الأربعة
   ============================================================ */
const SECTORS = {
  phones:  { key: 'phones',  name: 'تقسيط جوالات',  short: 'جوالات',  icon: '📱', cls: 'cat-phones'  },
  systems: { key: 'systems', name: 'تقسيط منظومات', short: 'منظومات', icon: '🖥️', cls: 'cat-systems' },
  ac:      { key: 'ac',      name: 'تقسيط مكيفات',  short: 'مكيفات',  icon: '❄️', cls: 'cat-ac'      },
  cars:    { key: 'cars',    name: 'تقسيط سيارات',  short: 'سيارات',  icon: '🚗', cls: 'cat-cars'    }
};
const SECTOR_KEYS = ['phones', 'systems', 'ac', 'cars'];

/* ============================================================
   أدوات
   ============================================================ */
const $ = id => document.getElementById(id);
const fmt = n => (Number(n) || 0).toLocaleString('en-US');
function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = $(id);
  if (el) el.classList.add('active');
  window.scrollTo(0, 0);
}
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  DB.data.theme = t; DB.save();
}
function toggleTheme() {
  applyTheme(DB.data.theme === 'dark' ? 'light' : 'dark');
}
function getInitial(name) {
  if (!name) return '؟';
  return String(name).trim().charAt(0).toUpperCase();
}

/* ============================================================
   حفظ/استرجاع آخر مستخدم (الدخول السريع)
   ============================================================ */
const LAST_USER_KEY = 'taqseet_last_user';

function saveLastUser(role, name) {
  if (!role || !name) return;
  if (role === 'admin') return;
  try {
    localStorage.setItem(LAST_USER_KEY, JSON.stringify({
      role: role, name: name, savedAt: Date.now()
    }));
  } catch (e) {}
}
function getLastUser() {
  try {
    const raw = localStorage.getItem(LAST_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}
function clearLastUser() {
  try { localStorage.removeItem(LAST_USER_KEY); } catch (e) {}
}

/* ============================================================
   نظام PIN (رمز الحماية)
   ============================================================ */
const PIN_KEY_PREFIX = 'taqseet_pin_';

function pinKeyFor(role, name) {
  return PIN_KEY_PREFIX + role + '_' + name;
}
function savePIN(role, name, pin) {
  if (!role || !name || !pin) return;
  try { localStorage.setItem(pinKeyFor(role, name), String(pin)); } catch (e) {}
}
function getPIN(role, name) {
  try { return localStorage.getItem(pinKeyFor(role, name)); } catch (e) { return null; }
}
function removePIN(role, name) {
  try { localStorage.removeItem(pinKeyFor(role, name)); } catch (e) {}
}
function hasPIN(role, name) {
  const p = getPIN(role, name);
  return p && p.length === 4;
}

/* ============================================================
   الإقلاع
   ============================================================ */
window.addEventListener('load', () => {
  applyTheme(DB.data.theme || 'light');
  if (DB.data.session) {
    const s = DB.data.session;
    if (s.role === 'merchant') showScreen('merchant-dashboard');
    else if (s.role === 'customer') showScreen('customer-dashboard');
    else if (s.role === 'admin') showScreen('admin-dashboard');
    refreshAll();
    return;
  }
  setTimeout(() => goToLogin(), 1800);
});

/* ============================================================
   تسجيل الدخول
   ============================================================ */
let currentLoginRole = 'merchant';

function selectRole(role) {
  currentLoginRole = role;
  document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
  const btn = $('role-' + role);
  if (btn) btn.classList.add('active');
  const regLink = document.querySelector('.login-footer');
  if (regLink) regLink.style.display = role === 'admin' ? 'none' : 'block';

  const lastUser = getLastUser();
  const nameInput = $('login-name');

  if (lastUser && lastUser.role === role && lastUser.name) {
    nameInput.value = lastUser.name;
  } else if (role === 'admin') {
    nameInput.value = 'admin';
  } else {
    nameInput.value = '';
  }

  $('login-password').value = '';
  $('login-error').textContent = '';
  updatePINButton();

  setTimeout(() => {
    if (nameInput.value && $('login-password')) $('login-password').focus();
  }, 200);
}

function goToLogin(role) {
  const lastUser = getLastUser();

  if (!role) {
    if (lastUser && lastUser.role) currentLoginRole = lastUser.role;
    else currentLoginRole = 'merchant';
  } else {
    currentLoginRole = role;
  }

  document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
  const btn = $('role-' + currentLoginRole);
  if (btn) btn.classList.add('active');

  const regLink = document.querySelector('.login-footer');
  if (regLink) regLink.style.display = currentLoginRole === 'admin' ? 'none' : 'block';

  const nameInput = $('login-name');
  const passInput = $('login-password');

  if (currentLoginRole === 'admin') {
    nameInput.value = 'admin';
    passInput.value = '';
  } else if (lastUser && lastUser.name && lastUser.role === currentLoginRole) {
    nameInput.value = lastUser.name;
    passInput.value = '';
  } else {
    nameInput.value = '';
    passInput.value = '';
  }

  $('login-error').textContent = '';
  updatePINButton();
  showScreen('login-screen');

  setTimeout(() => {
    if (passInput && nameInput.value && nameInput.value !== '') passInput.focus();
  }, 300);
}

function updatePINButton() {
  const btn = $('btn-pin-login');
  if (!btn) return;
  const lastUser = getLastUser();
  if (lastUser && lastUser.role !== 'admin' && hasPIN(lastUser.role, lastUser.name)) {
    btn.style.display = 'block';
  } else {
    btn.style.display = 'none';
  }
}

function togglePassword() {
  const inp = $('login-password');
  const btn = document.querySelector('.eye-btn');
  if (inp.type === 'password') { inp.type = 'text'; if (btn) btn.textContent = '🙈'; }
  else { inp.type = 'password'; if (btn) btn.textContent = '👁️'; }
}

function doLogin() {
  const name = $('login-name').value.trim();
  const pass = $('login-password').value;
  const errEl = $('login-error');
  errEl.textContent = '';

  if (!name || !pass) { errEl.textContent = 'املأ جميع الحقول'; return; }

  let account = null;

  if (currentLoginRole === 'admin') {
    account = DB.data.admins.find(x => x.name === name && x.password === pass);
    if (!account) { errEl.textContent = 'بيانات الأدمن خاطئة'; return; }
    DB.data.session = { role: 'admin', id: account.id, name: account.name };
  }
  else if (currentLoginRole === 'merchant') {
    account = DB.data.merchants.find(x => x.name === name && x.password === pass);
    if (!account) { errEl.textContent = 'اسم أو كلمة مرور خاطئة'; return; }
    DB.data.session = { role: 'merchant', id: account.id, name: account.name };
  }
  else if (currentLoginRole === 'customer') {
    account = DB.data.customers.find(x => x.name === name && x.password === pass);
    if (!account) { errEl.textContent = 'اسم أو كلمة مرور خاطئة'; return; }
    DB.data.session = { role: 'customer', id: account.id, name: account.name };
  }

  DB.save();
  saveLastUser(currentLoginRole, name);

  if (currentLoginRole === 'admin') showScreen('admin-dashboard');
  else if (currentLoginRole === 'merchant') showScreen('merchant-dashboard');
  else if (currentLoginRole === 'customer') showScreen('customer-dashboard');

  refreshAll();
}

/* ============================================================
   التسجيل
   ============================================================ */
function goToRegister() {
  $('reg-merchant-error').textContent = '';
  $('reg-customer-error').textContent = '';
  if (currentLoginRole === 'merchant') showScreen('register-merchant-screen');
  else showScreen('register-customer-screen');
}

function registerMerchant() {
  const name = $('reg-merchant-name').value.trim();
  const pass = $('reg-merchant-password').value;
  const confirm = $('reg-merchant-confirm').value;
  const err = $('reg-merchant-error');
  err.textContent = '';

  if (!name || !pass) { err.textContent = 'املأ جميع الحقول'; return; }
  if (pass !== confirm) { err.textContent = 'كلمتا المرور غير متطابقتين'; return; }
  if (pass.length < 4) { err.textContent = 'كلمة المرور قصيرة جدًا'; return; }
  if (DB.data.merchants.some(m => m.name === name)) { err.textContent = 'الاسم مستخدم مسبقًا'; return; }

  const newMerchant = {
    id: DB.uid('m'), name, password: pass, createdAt: Date.now(),
    profile: {
      shopName: '', phone: '', address: '',
      sectors: [], maxAmount: 0, durations: [],
      collaterals: false, collateralTypes: '',
      guarantor: false, notes: '', completed: false
    }
  };
  DB.data.merchants.push(newMerchant);
  DB.data.session = { role: 'merchant', id: newMerchant.id, name: newMerchant.name };
  DB.save();
  saveLastUser('merchant', name);

  $('reg-merchant-name').value = '';
  $('reg-merchant-password').value = '';
  $('reg-merchant-confirm').value = '';

  showScreen('merchant-dashboard');
  refreshAll();
  setTimeout(() => openMerchantProfile(), 400);
}

function registerCustomer() {
  const name = $('reg-customer-name').value.trim();
  const pass = $('reg-customer-password').value;
  const confirm = $('reg-customer-confirm').value;
  const err = $('reg-customer-error');
  err.textContent = '';

  if (!name || !pass) { err.textContent = 'املأ جميع الحقول'; return; }
  if (pass !== confirm) { err.textContent = 'كلمتا المرور غير متطابقتين'; return; }
  if (pass.length < 4) { err.textContent = 'كلمة المرور قصيرة جدًا'; return; }
  if (DB.data.customers.some(c => c.name === name)) { err.textContent = 'الاسم مستخدم مسبقًا'; return; }

  const newCustomer = { id: DB.uid('c'), name, password: pass, createdAt: Date.now() };
  DB.data.customers.push(newCustomer);
  DB.data.session = { role: 'customer', id: newCustomer.id, name: newCustomer.name };
  DB.save();
  saveLastUser('customer', name);

  $('reg-customer-name').value = '';
  $('reg-customer-password').value = '';
  $('reg-customer-confirm').value = '';

  showScreen('customer-dashboard');
  refreshAll();
}

function logout() {
  const s = DB.data.session;
  if (s && s.role !== 'admin' && s.name) saveLastUser(s.role, s.name);
  DB.data.session = null;
  DB.save();
  goToLogin();
}

/* ============================================================
   نافذة PIN للدخول السريع
   ============================================================ */
let pinLoginBuffer = '';

function openPINLoginModal() {
  const lastUser = getLastUser();
  if (!lastUser || lastUser.role === 'admin') return;
  if (!hasPIN(lastUser.role, lastUser.name)) return;

  pinLoginBuffer = '';
  $('pin-login-user').textContent = '👤 ' + lastUser.name;
  $('pin-login-input').value = '';
  $('pin-login-error').textContent = '';
  $('pin-login-modal').classList.add('active');
  setTimeout(() => $('pin-login-input').focus(), 200);
}

function closePINLoginModal() {
  $('pin-login-modal').classList.remove('active');
  pinLoginBuffer = '';
}

function pinKey(k) {
  const inp = $('pin-login-input');
  if (k === 'del') {
    pinLoginBuffer = pinLoginBuffer.slice(0, -1);
  } else if (pinLoginBuffer.length < 4) {
    pinLoginBuffer += k;
  }
  inp.value = pinLoginBuffer;
  $('pin-login-error').textContent = '';

  if (pinLoginBuffer.length === 4) {
    setTimeout(verifyPINLogin, 200);
  }
}

function verifyPINLogin() {
  const lastUser = getLastUser();
  if (!lastUser) return;
  const saved = getPIN(lastUser.role, lastUser.name);
  if (saved && saved === pinLoginBuffer) {
    let account = null;
    if (lastUser.role === 'merchant') account = DB.data.merchants.find(m => m.name === lastUser.name);
    else if (lastUser.role === 'customer') account = DB.data.customers.find(c => c.name === lastUser.name);

    if (!account) {
      $('pin-login-error').textContent = 'الحساب غير موجود';
      pinLoginBuffer = '';
      $('pin-login-input').value = '';
      return;
    }

    DB.data.session = { role: lastUser.role, id: account.id, name: account.name };
    DB.save();
    closePINLoginModal();

    if (lastUser.role === 'merchant') showScreen('merchant-dashboard');
    else showScreen('customer-dashboard');
    refreshAll();
  } else {
    $('pin-login-error').textContent = '❌ رمز خاطئ';
    pinLoginBuffer = '';
    $('pin-login-input').value = '';
    if (navigator.vibrate) navigator.vibrate(200);
  }
}

/* ============================================================
   الشريط السفلي + شاشة الملف
   ============================================================ */
function openFileScreen() {
  const s = DB.data.session;
  if (!s) return;

  const infoBox = $('file-info');
  const avatar = $('file-avatar');
  const nameEl = $('file-name');
  const roleBadge = $('file-role-badge');

  avatar.textContent = getInitial(s.name);
  nameEl.textContent = s.name;

  if (s.role === 'merchant') {
    roleBadge.textContent = '🏪 مقسط';
    const me = DB.data.merchants.find(m => m.id === s.id);
    const p = me ? getMerchantProfile(me) : null;

    let sectorTags = '';
    if (p && p.sectors && p.sectors.length) {
      sectorTags = p.sectors.map(k => {
        const sec = SECTORS[k];
        return sec ? `<span class="tag tag-${k}">${sec.icon} ${sec.short}</span>` : '';
      }).join(' ');
    }

    infoBox.innerHTML = `
      ${p && p.shopName ? `<div class="card"><div class="card-row"><span>🏪 اسم المحل:</span><strong>${escapeHtml(p.shopName)}</strong></div></div>` : ''}
      ${p && p.phone ? `<div class="card"><div class="card-row"><span>📞 الهاتف:</span><strong>${escapeHtml(p.phone)}</strong></div></div>` : ''}
      ${p && p.address ? `<div class="card"><div class="card-row"><span>📍 العنوان:</span><strong>${escapeHtml(p.address)}</strong></div></div>` : ''}
      ${sectorTags ? `<div class="card"><div class="card-row" style="align-items:flex-start;"><span>🎯 المجالات:</span><strong style="text-align:left;display:flex;flex-wrap:wrap;gap:4px;justify-content:flex-end;">${sectorTags}</strong></div></div>` : ''}
    `;
  }
  else if (s.role === 'customer') {
    roleBadge.textContent = '👤 عميل';
    const me = DB.data.customers.find(c => c.id === s.id);
    const regDate = me ? new Date(me.createdAt).toLocaleDateString('ar') : '—';

    infoBox.innerHTML = `
      <div class="card"><div class="card-row"><span>👤 اسم المستخدم:</span><strong>${escapeHtml(s.name)}</strong></div></div>
      <div class="card"><div class="card-row"><span>📅 تاريخ التسجيل:</span><strong>${regDate}</strong></div></div>
    `;
  }
  else if (s.role === 'admin') {
    roleBadge.textContent = '⚙️ أدمن';
    infoBox.innerHTML = `
      <div class="card"><div class="card-row"><span>👤 اسم المستخدم:</span><strong>${escapeHtml(s.name)}</strong></div></div>
      <div class="card"><div class="card-row"><span>🛡️ الدور:</span><strong>مدير النظام</strong></div></div>
    `;
  }

  // مؤشر PIN
  const pinIndicator = $('pin-status-indicator');
  if (pinIndicator) {
    if (s.role !== 'admin' && hasPIN(s.role, s.name)) {
      pinIndicator.textContent = '✅ مفعّل';
      pinIndicator.style.color = 'var(--green)';
      pinIndicator.style.fontSize = '12px';
    } else if (s.role === 'admin') {
      pinIndicator.textContent = '';
    } else {
      pinIndicator.textContent = 'غير مفعّل';
      pinIndicator.style.color = 'var(--text-muted)';
      pinIndicator.style.fontSize = '12px';
    }
  }

  showScreen('file-screen');
}

function goToHomeFromFile() {
  const s = DB.data.session;
  if (!s) return;
  if (s.role === 'merchant') showScreen('merchant-dashboard');
  else if (s.role === 'customer') showScreen('customer-dashboard');
  else if (s.role === 'admin') showScreen('admin-dashboard');
}

/* ============================================================
   تغيير كلمة المرور
   ============================================================ */
function openChangePasswordModal() {
  const s = DB.data.session;
  if (!s) return;

  openModal('🔑 تغيير كلمة المرور', `
    <label class="label">كلمة المرور الحالية</label>
    <input type="password" id="cp-current" class="input" placeholder="أدخل كلمة المرور الحالية" />

    <label class="label">كلمة المرور الجديدة</label>
    <input type="password" id="cp-new" class="input" placeholder="4 أحرف على الأقل" />

    <label class="label">تأكيد كلمة المرور الجديدة</label>
    <input type="password" id="cp-confirm" class="input" placeholder="أعد كتابة كلمة المرور" />

    <p id="cp-error" class="error"></p>
  `, () => {
    const current = $('cp-current').value;
    const newPass = $('cp-new').value;
    const confirm = $('cp-confirm').value;
    const err = $('cp-error');
    err.textContent = '';

    if (!current || !newPass || !confirm) { err.textContent = 'املأ جميع الحقول'; return; }
    if (newPass !== confirm) { err.textContent = 'كلمتا المرور غير متطابقتين'; return; }
    if (newPass.length < 4) { err.textContent = 'كلمة المرور قصيرة جدًا'; return; }

    // البحث عن الحساب
    let account = null;
    if (s.role === 'merchant') account = DB.data.merchants.find(m => m.id === s.id);
    else if (s.role === 'customer') account = DB.data.customers.find(c => c.id === s.id);
    else if (s.role === 'admin') account = DB.data.admins.find(a => a.id === s.id);

    if (!account) { err.textContent = 'الحساب غير موجود'; return; }
    if (account.password !== current) { err.textContent = 'كلمة المرور الحالية خاطئة'; return; }

    account.password = newPass;
    DB.save();
    closeModal();
    alert('✅ تم تغيير كلمة المرور بنجاح');
  });
}

/* ============================================================
   إعداد PIN / بصمة
   ============================================================ */
function openPINSetupModal() {
  const s = DB.data.session;
  if (!s) return;

  if (s.role === 'admin') {
    alert('ميزة PIN غير متاحة لحساب الأدمن لأسباب أمنية');
    return;
  }

  const alreadyHas = hasPIN(s.role, s.name);

  openModal('🔒 رمز الحماية', `
    <p style="font-size:13.5px;color:var(--text-muted);line-height:1.7;margin-bottom:16px;text-align:center;">
      ${alreadyHas
        ? 'لديك رمز حماية مُفعّل حاليًا. يمكنك تغييره أو إزالته.'
        : 'أضف رمز PIN مكوّن من 4 أرقام لتسجيل الدخول بسرعة دون كتابة كلمة المرور.'}
    </p>

    ${alreadyHas ? `
      <button class="btn btn-secondary" onclick="changePINExisting()">🔄 تغيير الرمز الحالي</button>
      <button class="btn btn-danger" onclick="disablePIN()">🗑️ إزالة رمز الحماية</button>
    ` : `
      <label class="label">أدخل رمز PIN (4 أرقام)</label>
      <input type="tel" id="pin-new-1" class="input" maxlength="4" inputmode="numeric" placeholder="مثال: 1234" />

      <label class="label">تأكيد الرمز</label>
      <input type="tel" id="pin-new-2" class="input" maxlength="4" inputmode="numeric" placeholder="أعد كتابة الرمز" />

      <p id="pin-setup-error" class="error"></p>
    `}
  `, () => {
    if (alreadyHas) return;

    const p1 = $('pin-new-1').value.trim();
    const p2 = $('pin-new-2').value.trim();
    const err = $('pin-setup-error');
    err.textContent = '';

    if (!/^\d{4}$/.test(p1)) { err.textContent = 'الرمز يجب أن يكون 4 أرقام'; return; }
    if (p1 !== p2) { err.textContent = 'الرمزان غير متطابقين'; return; }

    savePIN(s.role, s.name, p1);
    closeModal();
    alert('✅ تم تفعيل رمز الحماية بنجاح');
    openFileScreen();
  });
}
/* ============================================================
   نظام البصمة (WebAuthn)
   ============================================================ */
const BIO_KEY_PREFIX = 'taqseet_bio_';

function bioKeyFor(role, name) {
  return BIO_KEY_PREFIX + role + '_' + name;
}
function saveBio(role, name, credIdBase64) {
  if (!role || !name || !credIdBase64) return;
  try { localStorage.setItem(bioKeyFor(role, name), credIdBase64); } catch (e) {}
}
function getBio(role, name) {
  try { return localStorage.getItem(bioKeyFor(role, name)); } catch (e) { return null; }
}
function removeBio(role, name) {
  try { localStorage.removeItem(bioKeyFor(role, name)); } catch (e) {}
}
function hasBio(role, name) {
  return !!getBio(role, name);
}

// تحويل بين ArrayBuffer و Base64
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// فحص دعم البصمة
async function isBiometricSupported() {
  if (!window.PublicKeyCredential) return false;
  if (!window.isSecureContext) return false; // يحتاج HTTPS

  try {
    if (PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return !!available;
    }
  } catch (e) {}

  return false;
}

// توليد challenge عشوائي
function generateChallenge() {
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  return challenge;
}

// تسجيل بصمة جديدة
async function enrollBiometric(role, name) {
  const challenge = generateChallenge();
  const userId = new Uint8Array(16);
  crypto.getRandomValues(userId);

  const publicKey = {
    challenge: challenge,
    rp: {
      name: 'قسط - إدارة التقسيط',
      id: window.location.hostname || 'localhost'
    },
    user: {
      id: userId,
      name: name,
      displayName: name
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },   // ES256
      { alg: -257, type: 'public-key' }  // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      requireResidentKey: false
    },
    timeout: 60000,
    attestation: 'none'
  };

  const credential = await navigator.credentials.create({ publicKey });
  if (!credential) throw new Error('لم يتم إنشاء البصمة');

  const credIdBase64 = arrayBufferToBase64(credential.rawId);
  saveBio(role, name, credIdBase64);
  return true;
}

// التحقق بالبصمة
async function verifyBiometric(role, name) {
  const credIdBase64 = getBio(role, name);
  if (!credIdBase64) throw new Error('لا توجد بصمة مسجلة');

  const credId = base64ToArrayBuffer(credIdBase64);
  const challenge = generateChallenge();

  const publicKey = {
    challenge: challenge,
    allowCredentials: [{
      id: credId,
      type: 'public-key',
      transports: ['internal']
    }],
    userVerification: 'required',
    timeout: 60000
  };

  const assertion = await navigator.credentials.get({ publicKey });
  return !!assertion;
}

// إزالة البصمة
function disableBio() {
  const s = DB.data.session;
  if (!s) return;
  if (!confirm('هل تريد إزالة البصمة؟')) return;
  removeBio(s.role, s.name);
  closeModal();
  alert('🗑️ تم إزالة البصمة');
  openFileScreen();
}

// فتح نافذة إعداد البصمة
async function openBiometricSetup() {
  const s = DB.data.session;
  if (!s) return;

  if (s.role === 'admin') {
    alert('ميزة البصمة غير متاحة لحساب الأدمن');
    return;
  }

  // فحص الدعم
  const supported = await isBiometricSupported();
  const alreadyHas = hasBio(s.role, s.name);

  if (!supported) {
    openModal('👆 بصمة الإصبع', `
      <div class="bio-setup-content">
        <div class="bio-setup-icon">⚠️</div>
        <p style="margin-bottom:12px;">
          البصمة <span class="bio-not-supported">غير مدعومة</span> على هذا الجهاز أو المتصفح.
        </p>
        <div class="bio-info-box">
          <strong>الأسباب المحتملة:</strong><br>
          • الرابط لا يستخدم HTTPS<br>
          • المتصفح لا يدعم WebAuthn<br>
          • الجهاز لا يحتوي على مستشعر بصمة<br>
          • التطبيق يعمل داخل WebView
        </div>
        <p style="font-size:13px;color:var(--text-muted);">
          يمكنك استخدام <strong>رمز PIN</strong> كبديل مضمون.
        </p>
      </div>
    `, () => {
      closeModal();
      setTimeout(() => openPINSetupModal(), 200);
    });
    return;
  }

  if (alreadyHas) {
    openModal('👆 بصمة الإصبع', `
      <div class="bio-setup-content">
        <div class="bio-setup-icon">✅</div>
        <p style="margin-bottom:16px;">
          البصمة <span class="bio-supported">مفعّلة</span> حاليًا.
        </p>
      </div>
    `, () => {
      closeModal();
    });

    // إضافة زر إزالة منفصل
    setTimeout(() => {
      const body = $('modal-body');
      if (body && !body.querySelector('.bio-disable-btn')) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-danger bio-disable-btn';
        btn.textContent = '🗑️ إزالة البصمة';
        btn.onclick = disableBio;
        body.appendChild(btn);
      }
    }, 50);
    return;
  }

  // إظهار نافذة التسجيل
  openModal('👆 تسجيل بصمة جديدة', `
    <div class="bio-setup-content">
      <div class="bio-setup-icon">👆</div>
      <p style="margin-bottom:16px;font-size:14px;line-height:1.6;">
        اضغط "تسجيل" ثم استخدم بصمة إصبعك أو Face ID لتسجيل الدخول لاحقًا بسهولة.
      </p>
      <div class="bio-info-box">
        🔒 بصمتك <strong>لا تُرسل</strong> لأي جهاز — تبقى محفوظة بأمان داخل جهازك.
      </div>
      <p id="bio-setup-error" class="error"></p>
    </div>
  `, async () => {
    const err = $('bio-setup-error');
    err.textContent = '';

    try {
      $('modal-save-btn').disabled = true;
      $('modal-save-btn').textContent = '⏳ جاري التسجيل...';

      await enrollBiometric(s.role, s.name);

      closeModal();
      alert('✅ تم تسجيل البصمة بنجاح');
      openFileScreen();
    } catch (e) {
      err.textContent = '❌ فشل التسجيل: ' + (e.message || 'حاول مرة أخرى');
      $('modal-save-btn').disabled = false;
      $('modal-save-btn').textContent = 'تسجيل';
    }
  });
}

// تسجيل الدخول بالبصمة من شاشة الدخول
async function loginWithBiometric() {
  const lastUser = getLastUser();
  if (!lastUser) return;
  if (!hasBio(lastUser.role, lastUser.name)) return;

  const errEl = $('login-error');
  errEl.textContent = '';

  try {
    const btn = $('btn-bio-login');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="bio-pulse">👆</span> جاري التحقق...';
    }

    await verifyBiometric(lastUser.role, lastUser.name);

    // نجحت — سجّل الدخول
    let account = null;
    if (lastUser.role === 'merchant') account = DB.data.merchants.find(m => m.name === lastUser.name);
    else if (lastUser.role === 'customer') account = DB.data.customers.find(c => c.name === lastUser.name);

    if (!account) {
      errEl.textContent = 'الحساب غير موجود';
      return;
    }

    DB.data.session = { role: lastUser.role, id: account.id, name: account.name };
    DB.save();

    if (lastUser.role === 'merchant') showScreen('merchant-dashboard');
    else showScreen('customer-dashboard');
    refreshAll();

  } catch (e) {
    errEl.textContent = '❌ فشل التحقق بالبصمة';
    if (navigator.vibrate) navigator.vibrate(200);
  } finally {
    const btn = $('btn-bio-login');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '👆 دخول بالبصمة';
    }
  }
}

function changePINExisting() {
  const s = DB.data.session;
  if (!s) return;

  openModal('🔄 تغيير رمز PIN', `
    <label class="label">الرمز الحالي</label>
    <input type="tel" id="pin-old" class="input" maxlength="4" inputmode="numeric" />

    <label class="label">الرمز الجديد</label>
    <input type="tel" id="pin-n1" class="input" maxlength="4" inputmode="numeric" />

    <label class="label">تأكيد الرمز الجديد</label>
    <input type="tel" id="pin-n2" class="input" maxlength="4" inputmode="numeric" />

    <p id="pin-ch-error" class="error"></p>
  `, () => {
    const oldP = $('pin-old').value.trim();
    const n1 = $('pin-n1').value.trim();
    const n2 = $('pin-n2').value.trim();
    const err = $('pin-ch-error');
    err.textContent = '';

    const saved = getPIN(s.role, s.name);
    if (saved !== oldP) { err.textContent = 'الرمز الحالي خاطئ'; return; }
    if (!/^\d{4}$/.test(n1)) { err.textContent = 'الرمز الجديد 4 أرقام'; return; }
    if (n1 !== n2) { err.textContent = 'الرمزان غير متطابقين'; return; }

    savePIN(s.role, s.name, n1);
    closeModal();
    alert('✅ تم تغيير الرمز بنجاح');
    openFileScreen();
  });
}

function disablePIN() {
  const s = DB.data.session;
  if (!s) return;
  if (!confirm('هل تريد إزالة رمز الحماية؟')) return;
  removePIN(s.role, s.name);
  closeModal();
  alert('🗑️ تم إزالة رمز الحماية');
  openFileScreen();
}

/* ============================================================
   أدوات حسابية للعقود
   ============================================================ */
function contractRemaining(c) {
  const paid = c.payments.reduce((s, p) => s + p.amount, 0);
  return Math.max(0, c.total - c.down - paid);
}
function contractPaidAmount(c) {
  return c.down + c.payments.reduce((s, p) => s + p.amount, 0);
}
function installmentAmount(c) {
  const f = c.total - c.down;
  return c.count > 0 ? Math.ceil(f / c.count) : 0;
}
function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function addPeriod(date, freq, n = 1) {
  const d = new Date(date);
  if (freq === 'daily') d.setDate(d.getDate() + n);
  else if (freq === 'weekly') d.setDate(d.getDate() + 7 * n);
  else if (freq === 'monthly') d.setMonth(d.getMonth() + n);
  else if (freq === 'yearly') d.setFullYear(d.getFullYear() + n);
  return d;
}
function nextDueDate(c) {
  if (c.status !== 'active') return null;
  const paidCount = Math.floor(contractPaidAmount(c) / installmentAmount(c));
  if (paidCount >= c.count) return null;
  return addPeriod(new Date(c.startDate), c.frequency, paidCount + 1);
}
function contractStatus(c) {
  if (c.status === 'completed') return 'completed';
  const next = nextDueDate(c);
  if (!next) return 'completed';
  const now = new Date(); now.setHours(0,0,0,0);
  if (next < now) return 'late';
  return 'active';
}
function freqLabel(f) {
  return { daily: 'يومي', weekly: 'أسبوعي', monthly: 'شهري', yearly: 'سنوي' }[f] || f;
}
function getMerchantProfile(m) {
  if (!m.profile) {
    m.profile = {
      shopName: '', phone: '', address: '',
      sectors: [], maxAmount: 0, durations: [],
      collaterals: false, collateralTypes: '',
      guarantor: false, notes: '', completed: false
    };
  }
  if (!Array.isArray(m.profile.sectors)) m.profile.sectors = [];
  return m.profile;
}

/* ============================================================
   لوحة المقسط
   ============================================================ */
function refreshMerchantDashboard() {
  const s = DB.data.session;
  if (!s || s.role !== 'merchant') return;
  $('merchant-welcome').textContent = 'مرحبًا، ' + s.name;

  const me = DB.data.merchants.find(m => m.id === s.id);
  const prof = me ? getMerchantProfile(me) : null;
  const alertEl = $('merchant-profile-alert');
  if (alertEl) alertEl.style.display = (prof && prof.completed) ? 'none' : 'flex';

  const myCustomers = DB.data.customersList.filter(c => c.merchantId === s.id);
  const myContracts = DB.data.contracts.filter(c => c.merchantId === s.id);
  const active = myContracts.filter(c => c.status === 'active');
  let totalRemaining = 0;
  active.forEach(c => { totalRemaining += contractRemaining(c); });
  const today = new Date(); today.setHours(0,0,0,0);
  let dueToday = 0;
  active.forEach(c => {
    const next = nextDueDate(c);
    if (next && sameDay(next, today)) dueToday++;
  });
  $('stat-customers').textContent = fmt(myCustomers.length);
  $('stat-active').textContent = fmt(active.length);
  $('stat-remaining').textContent = fmt(totalRemaining);
  $('stat-due').textContent = fmt(dueToday);
}

/* ============================================================
   بروفايل المقسط
   ============================================================ */
let mpCollateral = false;
let mpGuarantor = false;

function openMerchantProfile() {
  const s = DB.data.session;
  if (!s || s.role !== 'merchant') return;
  const me = DB.data.merchants.find(m => m.id === s.id);
  if (!me) return;
  const p = getMerchantProfile(me);

  $('mp-shop-name').value = p.shopName || '';
  $('mp-phone').value = p.phone || '';
  $('mp-address').value = p.address || '';
  $('mp-max-amount').value = p.maxAmount || '';
  $('mp-collateral-types').value = p.collateralTypes || '';
  $('mp-notes').value = p.notes || '';
  $('mp-error').textContent = '';

  document.querySelectorAll('#mp-sectors .checkbox-item').forEach(item => {
    const v = item.dataset.value;
    item.classList.toggle('checked', (p.sectors || []).includes(v));
  });

  document.querySelectorAll('#mp-durations .checkbox-item').forEach(item => {
    const v = item.dataset.value;
    item.classList.toggle('checked', (p.durations || []).includes(v));
  });

  mpCollateral = !!p.collaterals;
  updateCollateralUI();
  mpGuarantor = !!p.guarantor;
  updateGuarantorUI();

  showScreen('merchant-profile-screen');
}

['mp-sectors', 'mp-durations'].forEach(gridId => {
  document.querySelectorAll('#' + gridId + ' .checkbox-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      item.classList.toggle('checked');
    });
  });
});

function toggleCollateral(v) {
  mpCollateral = v;
  updateCollateralUI();
}
function updateCollateralUI() {
  $('mp-collateral-yes').classList.toggle('checked', mpCollateral);
  $('mp-collateral-no').classList.toggle('checked', !mpCollateral);
  $('mp-collateral-types-wrap').style.display = mpCollateral ? 'block' : 'none';
}
function toggleGuarantor(v) {
  mpGuarantor = v;
  updateGuarantorUI();
}
function updateGuarantorUI() {
  $('mp-guarantor-yes').classList.toggle('checked', mpGuarantor);
  $('mp-guarantor-no').classList.toggle('checked', !mpGuarantor);
}

function saveMerchantProfile() {
  const s = DB.data.session;
  const me = DB.data.merchants.find(m => m.id === s.id);
  if (!me) return;

  const err = $('mp-error');
  err.textContent = '';

  const shopName = $('mp-shop-name').value.trim();
  const phone = $('mp-phone').value.trim();
  const address = $('mp-address').value.trim();
  const maxAmount = Number($('mp-max-amount').value);
  const collateralTypes = $('mp-collateral-types').value.trim();
  const notes = $('mp-notes').value.trim();

  const sectors = [];
  document.querySelectorAll('#mp-sectors .checkbox-item').forEach(item => {
    if (item.classList.contains('checked')) sectors.push(item.dataset.value);
  });

  const durations = [];
  document.querySelectorAll('#mp-durations .checkbox-item').forEach(item => {
    if (item.classList.contains('checked')) durations.push(item.dataset.value);
  });

  if (!shopName) { err.textContent = 'أدخل اسم المحل'; return; }
  if (!phone) { err.textContent = 'أدخل رقم الهاتف'; return; }
  if (!address) { err.textContent = 'أدخل العنوان'; return; }
  if (!sectors.length) { err.textContent = 'اختر مجالًا واحدًا على الأقل'; return; }
  if (!maxAmount || maxAmount <= 0) { err.textContent = 'أدخل الحد الأقصى للتقسيط'; return; }
  if (!durations.length) { err.textContent = 'اختر مدة تقسيط واحدة على الأقل'; return; }

  me.profile = {
    shopName, phone, address, sectors, maxAmount, durations,
    collaterals: mpCollateral, collateralTypes,
    guarantor: mpGuarantor, notes, completed: true
  };
  DB.save();
  showScreen('merchant-dashboard');
  refreshMerchantDashboard();
}

/* ============================================================
   العملاء
   ============================================================ */
function openCustomers() { renderCustomers(); showScreen('customers-screen'); }
function renderCustomers() {
  const s = DB.data.session;
  const list = DB.data.customersList.filter(c => c.merchantId === s.id);
  const box = $('customers-list');
  if (!list.length) { box.innerHTML = `<div class="empty-state"><div class="icon">👥</div><div>لا يوجد عملاء بعد</div></div>`; return; }
  box.innerHTML = list.map(c => `
    <div class="list-item">
      <div class="info">
        <div class="name">${escapeHtml(c.name)}</div>
        <div class="sub">📞 ${escapeHtml(c.phone || 'لا يوجد')}</div>
      </div>
      <button class="delete-btn" onclick="deleteCustomer('${c.id}')">🗑️</button>
    </div>
  `).join('');
}
function addCustomerDialog() {
  openModal('إضافة عميل', `
    <input type="text" id="cust-name" class="input" placeholder="اسم العميل" />
    <input type="tel" id="cust-phone" class="input" placeholder="رقم الهاتف" />
    <textarea id="cust-address" class="input" rows="2" placeholder="العنوان (اختياري)"></textarea>
  `, () => {
    const name = $('cust-name').value.trim();
    const phone = $('cust-phone').value.trim();
    const address = $('cust-address').value.trim();
    if (!name) { alert('أدخل اسم العميل'); return; }
    DB.data.customersList.push({ id: DB.uid('cl'), merchantId: DB.data.session.id, name, phone, address, createdAt: Date.now() });
    DB.save(); closeModal(); renderCustomers(); refreshMerchantDashboard();
  });
}
function deleteCustomer(id) {
  if (!confirm('حذف هذا العميل؟')) return;
  DB.data.customersList = DB.data.customersList.filter(c => c.id !== id);
  DB.save(); renderCustomers(); refreshMerchantDashboard();
}

/* ============================================================
   العقود
   ============================================================ */
let currentContractFilter = 'all';
function openContracts() {
  currentContractFilter = 'all';
  document.querySelectorAll('#contracts-filters .chip').forEach(c => c.classList.toggle('active', c.dataset.filter === 'all'));
  renderContracts(); showScreen('contracts-screen');
}
function filterContracts(f) {
  currentContractFilter = f;
  document.querySelectorAll('#contracts-filters .chip').forEach(c => c.classList.toggle('active', c.dataset.filter === f));
  renderContracts();
}
function renderContracts() {
  const s = DB.data.session;
  let list = DB.data.contracts.filter(c => c.merchantId === s.id);
  if (currentContractFilter !== 'all') list = list.filter(c => contractStatus(c) === currentContractFilter);
  list.sort((a, b) => b.createdAt - a.createdAt);
  const box = $('contracts-list');
  if (!list.length) { box.innerHTML = `<div class="empty-state"><div class="icon">📄</div><div>لا توجد عقود</div></div>`; return; }
  box.innerHTML = list.map(c => {
    const status = contractStatus(c);
    const sm = { active: ['نشط', 'badge-active'], completed: ['مكتمل', 'badge-completed'], late: ['متأخر', 'badge-late'] };
    const [txt, cls] = sm[status];
    const customer = DB.data.customersList.find(x => x.id === c.customerId);
    return `
      <div class="card" onclick="openContractDetails('${c.id}')">
        <div class="card-title">
          <span>${escapeHtml(customer ? customer.name : 'غير معروف')}</span>
          <span class="badge ${cls}">${txt}</span>
        </div>
        <div class="card-row"><span>الإجمالي:</span><strong>${fmt(c.total)} ${c.currency}</strong></div>
        <div class="card-row"><span>المتبقي:</span><strong>${fmt(contractRemaining(c))} ${c.currency}</strong></div>
        <div class="card-row"><span>الأقساط:</span><strong>${c.payments.length} / ${c.count}</strong></div>
      </div>
    `;
  }).join('');
}

/* ============================================================
   إنشاء عقد
   ============================================================ */
let draftItems = [], draftCollaterals = [], draftGuarantors = [];
function openCreateContract() {
  draftItems = []; draftCollaterals = []; draftGuarantors = [];
  const s = DB.data.session;
  const customers = DB.data.customersList.filter(c => c.merchantId === s.id);
  if (!customers.length) { alert('أضف عميلًا أولًا'); return; }
  $('cc-customer').innerHTML = customers.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  $('cc-total').value = ''; $('cc-down').value = '0'; $('cc-count').value = '';
  $('cc-frequency').value = 'monthly'; $('cc-currency').value = 'YER';
  $('cc-notes').value = ''; $('cc-error').textContent = '';
  renderDraftItems(); renderDraftCollaterals(); renderDraftGuarantors();
  showScreen('create-contract-screen');
}
function renderDraftItems() {
  const box = $('cc-items');
  if (!draftItems.length) { box.innerHTML = `<div style="color:var(--text-muted);font-size:13px;margin-bottom:8px;">لا توجد منتجات</div>`; return; }
  box.innerHTML = draftItems.map((it, i) => `<div class="dynamic-item"><span>${escapeHtml(it.name)} — ${fmt(it.price)}</span><span class="remove" onclick="removeItem(${i})">✕</span></div>`).join('');
}
function addItemDialog() {
  openModal('إضافة منتج', `
    <input type="text" id="item-name" class="input" placeholder="اسم المنتج" />
    <input type="number" id="item-price" class="input" placeholder="السعر" />
  `, () => {
    const name = $('item-name').value.trim();
    const price = Number($('item-price').value);
    if (!name || !price) { alert('املأ الحقول'); return; }
    draftItems.push({ name, price }); closeModal(); renderDraftItems();
  });
}
function removeItem(i) { draftItems.splice(i, 1); renderDraftItems(); }
function renderDraftCollaterals() {
  const box = $('cc-collaterals');
  if (!draftCollaterals.length) { box.innerHTML = `<div style="color:var(--text-muted);font-size:13px;margin-bottom:8px;">لا توجد ضمانات</div>`; return; }
  box.innerHTML = draftCollaterals.map((c, i) => `<div class="dynamic-item"><span>${escapeHtml(c.type)} — ${escapeHtml(c.desc)}</span><span class="remove" onclick="removeCollateral(${i})">✕</span></div>`).join('');
}
function addCollateralDialog() {
  openModal('إضافة ضمانة', `
    <input type="text" id="col-type" class="input" placeholder="النوع (سيارة، منزل...)" />
    <input type="text" id="col-desc" class="input" placeholder="الوصف" />
  `, () => {
    const type = $('col-type').value.trim();
    const desc = $('col-desc').value.trim();
    if (!type) { alert('أدخل النوع'); return; }
    draftCollaterals.push({ type, desc }); closeModal(); renderDraftCollaterals();
  });
}
function removeCollateral(i) { draftCollaterals.splice(i, 1); renderDraftCollaterals(); }
function renderDraftGuarantors() {
  const box = $('cc-guarantors');
  if (!draftGuarantors.length) { box.innerHTML = `<div style="color:var(--text-muted);font-size:13px;margin-bottom:8px;">لا يوجد كفلاء</div>`; return; }
  box.innerHTML = draftGuarantors.map((g, i) => `<div class="dynamic-item"><span>${escapeHtml(g.name)} — ${escapeHtml(g.phone || '')}</span><span class="remove" onclick="removeGuarantor(${i})">✕</span></div>`).join('');
}
function addGuarantorDialog() {
  openModal('إضافة كفيل', `
    <input type="text" id="g-name" class="input" placeholder="اسم الكفيل" />
    <input type="tel" id="g-phone" class="input" placeholder="رقم الهاتف" />
  `, () => {
    const name = $('g-name').value.trim();
    const phone = $('g-phone').value.trim();
    if (!name) { alert('أدخل اسم الكفيل'); return; }
    draftGuarantors.push({ name, phone }); closeModal(); renderDraftGuarantors();
  });
}
function removeGuarantor(i) { draftGuarantors.splice(i, 1); renderDraftGuarantors(); }
function saveContract() {
  const err = $('cc-error'); err.textContent = '';
  const customerId = $('cc-customer').value;
  const total = Number($('cc-total').value);
  const down = Number($('cc-down').value) || 0;
  const count = Number($('cc-count').value);
  const frequency = $('cc-frequency').value;
  const currency = $('cc-currency').value;
  const notes = $('cc-notes').value.trim();
  if (!customerId) { err.textContent = 'اختر زبونًا'; return; }
  if (!total || total <= 0) { err.textContent = 'أدخل السعر الإجمالي'; return; }
  if (down < 0 || down >= total) { err.textContent = 'الدفعة الأولى غير صحيحة'; return; }
  if (!count || count <= 0) { err.textContent = 'أدخل عدد الأقساط'; return; }
  const contract = {
    id: DB.uid('ct'), merchantId: DB.data.session.id, customerId,
    items: [...draftItems], total, down, count, frequency, currency, notes,
    collaterals: [...draftCollaterals], guarantors: [...draftGuarantors],
    payments: [], status: 'active', startDate: new Date().toISOString(), createdAt: Date.now()
  };
  DB.data.contracts.push(contract);
  draftCollaterals.forEach(c => {
    DB.data.collaterals.push({ id: DB.uid('col'), merchantId: DB.data.session.id, contractId: contract.id, type: c.type, desc: c.desc, createdAt: Date.now() });
  });
  DB.save(); showScreen('contracts-screen'); renderContracts(); refreshMerchantDashboard();
}

/* ============================================================
   تفاصيل العقد
   ============================================================ */
let currentContractId = null;
function openContractDetails(id) {
  currentContractId = id;
  const c = DB.data.contracts.find(x => x.id === id);
  if (!c) return;
  const customer = DB.data.customersList.find(x => x.id === c.customerId);
  const status = contractStatus(c);
  const sm = { active: ['نشط', 'badge-active'], completed: ['مكتمل', 'badge-completed'], late: ['متأخر', 'badge-late'] };
  const [statusTxt, statusCls] = sm[status];
  $('cd-title').textContent = 'عقد: ' + (customer ? customer.name : '');
  const instAmt = installmentAmount(c);
  const paid = contractPaidAmount(c);
  const remaining = contractRemaining(c);
  const next = nextDueDate(c);
  const itemsHtml = c.items.length ? c.items.map(it => `<div class="card-row"><span>${escapeHtml(it.name)}</span><strong>${fmt(it.price)}</strong></div>`).join('') : '<div class="card-row"><span>لا توجد منتجات</span></div>';
  const collHtml = c.collaterals.length ? c.collaterals.map(x => `<div class="card-row"><span>🔒 ${escapeHtml(x.type)}</span><strong>${escapeHtml(x.desc)}</strong></div>`).join('') : '<div class="card-row"><span>لا توجد ضمانات</span></div>';
  const guarHtml = c.guarantors.length ? c.guarantors.map(x => `<div class="card-row"><span>👤 ${escapeHtml(x.name)}</span><strong>${escapeHtml(x.phone || '')}</strong></div>`).join('') : '<div class="card-row"><span>لا يوجد كفلاء</span></div>';
  const paymentsHtml = c.payments.length ? c.payments.map(p => `<div class="card-row"><span>📅 ${new Date(p.date).toLocaleDateString('ar')} — ${p.method === 'cash' ? 'نقدي' : 'تحويل'}</span><strong>${fmt(p.amount)} ${c.currency}</strong></div>`).join('') : '<div class="card-row"><span>لا توجد دفعات</span></div>';
  $('cd-content').innerHTML = `
    <div class="card">
      <div class="card-title"><span>${escapeHtml(customer ? customer.name : '')}</span><span class="badge ${statusCls}">${statusTxt}</span></div>
      <div class="card-row"><span>الإجمالي:</span><strong>${fmt(c.total)} ${c.currency}</strong></div>
      <div class="card-row"><span>الدفعة الأولى:</span><strong>${fmt(c.down)} ${c.currency}</strong></div>
      <div class="card-row"><span>عدد الأقساط:</span><strong>${c.count}</strong></div>
      <div class="card-row"><span>قيمة القسط:</span><strong>${fmt(instAmt)} ${c.currency}</strong></div>
      <div class="card-row"><span>الدورية:</span><strong>${freqLabel(c.frequency)}</strong></div>
      <div class="card-row"><span>المدفوع:</span><strong>${fmt(paid)} ${c.currency}</strong></div>
      <div class="card-row"><span>المتبقي:</span><strong>${fmt(remaining)} ${c.currency}</strong></div>
      ${next ? `<div class="card-row"><span>القسط القادم:</span><strong>${next.toLocaleDateString('ar')}</strong></div>` : ''}
    </div>
    <h3 style="margin:16px 0 8px;">📦 المنتجات</h3><div class="card">${itemsHtml}</div>
    <h3 style="margin:16px 0 8px;">🔒 الضمانات</h3><div class="card">${collHtml}</div>
    <h3 style="margin:16px 0 8px;">👤 الكفلاء</h3><div class="card">${guarHtml}</div>
    <h3 style="margin:16px 0 8px;">💵 الدفعات</h3><div class="card">${paymentsHtml}</div>
    ${c.notes ? `<h3 style="margin:16px 0 8px;">📝 ملاحظات</h3><div class="card">${escapeHtml(c.notes)}</div>` : ''}
    <button class="btn btn-primary" onclick="openPaymentScreen()">+ تسجيل دفعة</button>
    <button class="btn btn-secondary" onclick="deleteContract('${c.id}')">🗑️ حذف العقد</button>
  `;
  showScreen('contract-details-screen');
}
function deleteContract(id) {
  if (!confirm('حذف هذا العقد؟')) return;
  DB.data.contracts = DB.data.contracts.filter(c => c.id !== id);
  DB.data.collaterals = DB.data.collaterals.filter(c => c.contractId !== id);
  DB.save(); openContracts(); refreshMerchantDashboard();
}

/* ============================================================
   الدفعات
   ============================================================ */
function openPaymentScreen() {
  const c = DB.data.contracts.find(x => x.id === currentContractId);
  if (!c) return;
  const remaining = contractRemaining(c);
  const inst = installmentAmount(c);
  $('pay-info').innerHTML = `المتبقي: <strong>${fmt(remaining)} ${c.currency}</strong><br>قيمة القسط: <strong>${fmt(inst)} ${c.currency}</strong>`;
  $('pay-amount').value = inst > remaining ? remaining : inst;
  $('pay-method').value = 'cash'; $('pay-notes').value = ''; $('pay-error').textContent = '';
  showScreen('payment-screen');
}
function savePayment() {
  const c = DB.data.contracts.find(x => x.id === currentContractId);
  if (!c) return;
  const err = $('pay-error'); err.textContent = '';
  const amount = Number($('pay-amount').value);
  const method = $('pay-method').value;
  const notes = $('pay-notes').value.trim();
  if (!amount || amount <= 0) { err.textContent = 'أدخل مبلغًا صحيحًا'; return; }
  if (amount > contractRemaining(c)) { err.textContent = 'المبلغ أكبر من المتبقي'; return; }
  c.payments.push({ id: DB.uid('p'), amount, method, notes, date: Date.now() });
  if (contractRemaining(c) <= 0) c.status = 'completed';
  DB.save(); openContractDetails(c.id); refreshMerchantDashboard();
}

/* ============================================================
   الضمانات
   ============================================================ */
function openCollaterals() { renderCollaterals(); showScreen('collaterals-screen'); }
function renderCollaterals() {
  const s = DB.data.session;
  const list = DB.data.collaterals.filter(c => c.merchantId === s.id);
  const box = $('collaterals-list');
  if (!list.length) { box.innerHTML = `<div class="empty-state"><div class="icon">🔒</div><div>لا توجد ضمانات</div></div>`; return; }
  box.innerHTML = list.map(c => {
    const contract = DB.data.contracts.find(x => x.id === c.contractId);
    const customer = contract ? DB.data.customersList.find(x => x.id === contract.customerId) : null;
    return `<div class="list-item"><div class="info"><div class="name">${escapeHtml(c.type)}</div><div class="sub">${escapeHtml(c.desc || '')}</div><div class="sub">👤 ${customer ? escapeHtml(customer.name) : '—'}</div></div></div>`;
  }).join('');
}

/* ============================================================
   التجار
   ============================================================ */
function openTraders() { renderTraders(); showScreen('traders-screen'); }
function renderTraders() {
  const s = DB.data.session;
  const list = DB.data.traders.filter(t => t.merchantId === s.id);
  const box = $('traders-list');
  if (!list.length) { box.innerHTML = `<div class="empty-state"><div class="icon">🏪</div><div>لا يوجد تجار</div></div>`; return; }
  box.innerHTML = list.map(t => `<div class="list-item"><div class="info"><div class="name">${escapeHtml(t.name)}</div><div class="sub">📞 ${escapeHtml(t.phone || '—')}</div></div><button class="delete-btn" onclick="deleteTrader('${t.id}')">🗑️</button></div>`).join('');
}
function addTraderDialog() {
  openModal('إضافة تاجر', `<input type="text" id="tr-name" class="input" placeholder="اسم التاجر" /><input type="tel" id="tr-phone" class="input" placeholder="رقم الهاتف" />`, () => {
    const name = $('tr-name').value.trim();
    const phone = $('tr-phone').value.trim();
    if (!name) { alert('أدخل الاسم'); return; }
    DB.data.traders.push({ id: DB.uid('tr'), merchantId: DB.data.session.id, name, phone, createdAt: Date.now() });
    DB.save(); closeModal(); renderTraders();
  });
}
function deleteTrader(id) {
  if (!confirm('حذف هذا التاجر؟')) return;
  DB.data.traders = DB.data.traders.filter(t => t.id !== id);
  DB.save(); renderTraders();
}

/* ============================================================
   لوحة الزبون
   ============================================================ */
function refreshCustomerDashboard() {
  const s = DB.data.session;
  if (!s || s.role !== 'customer') return;
  $('customer-welcome').textContent = 'مرحبًا، ' + s.name;
  const allContracts = DB.data.contracts.filter(c => {
    const cust = DB.data.customersList.find(x => x.id === c.customerId);
    return cust && cust.name === s.name;
  });
  let remaining = 0;
  allContracts.forEach(c => { remaining += contractRemaining(c); });
  $('cust-contracts').textContent = fmt(allContracts.length);
  $('cust-remaining').textContent = fmt(remaining);
}

/* ============================================================
   قائمة التقسيط (المجالات)
   ============================================================ */
function openCategoriesList() {
  SECTOR_KEYS.forEach(k => {
    const count = DB.data.merchants.filter(m => {
      const p = getMerchantProfile(m);
      return p.completed && (p.sectors || []).includes(k);
    }).length;
    const el = $('cat-count-' + k);
    if (el) el.textContent = count + ' مقسط';
  });
  showScreen('categories-list-screen');
}

let currentCategoryKey = null;
let currentCategoryDuration = 'all';

function openCategoryMerchants(sectorKey) {
  const sec = SECTORS[sectorKey];
  if (!sec) return;
  currentCategoryKey = sectorKey;
  currentCategoryDuration = 'all';

  $('cm-title').textContent = sec.name;

  const searchInput = $('cm-search');
  if (searchInput) searchInput.value = '';
  document.querySelectorAll('[data-cm]').forEach(c => c.classList.toggle('active', c.dataset.cm === 'all'));

  applyCategoryMerchantFilters();
  showScreen('category-merchants-screen');
}

function filterCategoryByDuration(d) {
  currentCategoryDuration = d;
  document.querySelectorAll('[data-cm]').forEach(c => c.classList.toggle('active', c.dataset.cm === d));
  applyCategoryMerchantFilters();
}

function applyCategoryMerchantFilters() {
  if (!currentCategoryKey) return;
  const sec = SECTORS[currentCategoryKey];

  const q = ($('cm-search').value || '').trim().toLowerCase();

  let list = DB.data.merchants.filter(m => {
    const p = getMerchantProfile(m);
    return p.completed && (p.sectors || []).includes(currentCategoryKey);
  });

  if (q) {
    list = list.filter(m => {
      const p = getMerchantProfile(m);
      return (p.shopName || '').toLowerCase().includes(q)
          || (p.address || '').toLowerCase().includes(q)
          || (m.name || '').toLowerCase().includes(q);
    });
  }

  if (currentCategoryDuration !== 'all') {
    list = list.filter(m => {
      const p = getMerchantProfile(m);
      return (p.durations || []).includes(currentCategoryDuration);
    });
  }

  renderCategoryMerchantsList(list, sec);
}

function renderCategoryMerchantsList(list, sec) {
  const box = $('category-merchants-list');
  if (!list.length) {
    box.innerHTML = `
      <div class="empty-state">
        <div class="icon">${sec.icon}</div>
        <div>لا يوجد مقسطون في ${sec.short} حاليًا</div>
      </div>`;
    return;
  }
  box.innerHTML = list.map(m => {
    const p = getMerchantProfile(m);
    const durTags = (p.durations || []).map(d => `<span class="tag tag-green">${freqLabel(d)}</span>`).join('');
    const maxTag = p.maxAmount ? `<span class="tag">💰 حتى ${fmt(p.maxAmount)}</span>` : '';
    const collTag = p.collaterals ? `<span class="tag">🔒 ضمان</span>` : '';
    const guarTag = p.guarantor ? `<span class="tag">👤 كفيل</span>` : '';
    const sectorTag = `<span class="tag tag-${currentCategoryKey}">${sec.icon} ${sec.short}</span>`;

    return `
      <div class="merchant-card" onclick="openMerchantDetails('${m.id}')">
        <div class="merchant-header">
          <div class="merchant-avatar">${sec.icon}</div>
          <div class="merchant-info">
            <div class="merchant-name">${escapeHtml(p.shopName || m.name)}</div>
            <div class="merchant-sub">📍 ${escapeHtml(p.address || '')}</div>
          </div>
          <span class="merchant-arrow">›</span>
        </div>
        <div class="merchant-tags">
          ${sectorTag}
          ${durTags}
          ${maxTag}
          ${collTag}
          ${guarTag}
        </div>
      </div>
    `;
  }).join('');
}

/* ============================================================
   تفاصيل المقسط (للعميل)
   ============================================================ */
let lastMerchantDetailsFrom = 'categories-list-screen';

function goBackFromMerchantDetails() {
  if (lastMerchantDetailsFrom === 'category-merchants-screen') {
    showScreen('category-merchants-screen');
  } else {
    showScreen('categories-list-screen');
  }
}

function openMerchantDetails(id) {
  const m = DB.data.merchants.find(x => x.id === id);
  if (!m) return;
  const p = getMerchantProfile(m);

  const activeScreen = document.querySelector('.screen.active');
  if (activeScreen && activeScreen.id === 'category-merchants-screen') {
    lastMerchantDetailsFrom = 'category-merchants-screen';
  } else {
    lastMerchantDetailsFrom = 'categories-list-screen';
  }

  $('md-title').textContent = p.shopName || m.name;

  const durTags = (p.durations || []).map(d => `<span class="tag tag-green">${freqLabel(d)}</span>`).join(' ');
  const sectorTags = (p.sectors || []).map(k => {
    const s = SECTORS[k];
    if (!s) return '';
    return `<span class="tag tag-${k}">${s.icon} ${s.short}</span>`;
  }).join(' ');
  const phone = (p.phone || '').replace(/\D/g, '');

  $('md-content').innerHTML = `
    <div class="card">
      <div class="card-title">
        <span>🏪 ${escapeHtml(p.shopName || m.name)}</span>
      </div>
      ${p.address ? `<div class="card-row"><span>📍 العنوان:</span><strong>${escapeHtml(p.address)}</strong></div>` : ''}
      ${p.phone ? `<div class="card-row"><span>📞 الهاتف:</span><strong>${escapeHtml(p.phone)}</strong></div>` : ''}
      ${p.maxAmount ? `<div class="card-row"><span>💰 الحد الأقصى:</span><strong>${fmt(p.maxAmount)}</strong></div>` : ''}
    </div>

    ${sectorTags ? `
      <h3 style="margin:16px 0 8px;">🎯 مجالات العمل</h3>
      <div class="card"><div class="merchant-tags">${sectorTags}</div></div>
    ` : ''}

    ${p.durations && p.durations.length ? `
      <h3 style="margin:16px 0 8px;">📅 مدد التقسيط المتاحة</h3>
      <div class="card"><div class="merchant-tags">${durTags}</div></div>
    ` : ''}

    <h3 style="margin:16px 0 8px;">🛡️ الشروط</h3>
    <div class="card">
      <div class="card-row">
        <span>🔒 يقبل ضمانات:</span>
        <strong>${p.collaterals ? '✅ نعم' : '❌ لا'}</strong>
      </div>
      ${p.collaterals && p.collateralTypes ? `<div class="card-row"><span>📋 أنواع الضمانات:</span><strong>${escapeHtml(p.collateralTypes)}</strong></div>` : ''}
      <div class="card-row">
        <span>👤 يحتاج كفيل:</span>
        <strong>${p.guarantor ? '✅ نعم' : '❌ لا'}</strong>
      </div>
    </div>

    ${p.notes ? `
      <h3 style="margin:16px 0 8px;">📝 ملاحظات</h3>
      <div class="card">${escapeHtml(p.notes)}</div>
    ` : ''}

    ${phone ? `
      <h3 style="margin:16px 0 8px;">📞 تواصل مع المقسط</h3>
      <div class="contact-actions">
        <a class="contact-btn contact-call" href="tel:${phone}">
          <span>📞</span> اتصال
        </a>
        <a class="contact-btn contact-whatsapp" href="https://wa.me/${phone}" target="_blank" rel="noopener">
          <span>💬</span> واتساب
        </a>
      </div>
    ` : ''}
  `;
  showScreen('merchant-details-screen');
}

/* ============================================================
   عقودي (للعميل)
   ============================================================ */
function openMyContracts() {
  const s = DB.data.session;
  const list = DB.data.contracts.filter(c => {
    const cust = DB.data.customersList.find(x => x.id === c.customerId);
    return cust && cust.name === s.name;
  });
  const box = $('my-contracts-list');
  if (!list.length) { box.innerHTML = `<div class="empty-state"><div class="icon">📄</div><div>لا توجد عقود</div></div>`; }
  else {
    box.innerHTML = list.map(c => {
      const merchant = DB.data.merchants.find(m => m.id === c.merchantId);
      const status = contractStatus(c);
      const sm = { active: ['نشط', 'badge-active'], completed: ['مكتمل', 'badge-completed'], late: ['متأخر', 'badge-late'] };
      const [txt, cls] = sm[status];
      const mp = merchant ? getMerchantProfile(merchant) : null;
      const mName = mp && mp.shopName ? mp.shopName : (merchant ? merchant.name : '');
      return `<div class="card"><div class="card-title"><span>🏪 ${escapeHtml(mName)}</span><span class="badge ${cls}">${txt}</span></div><div class="card-row"><span>الإجمالي:</span><strong>${fmt(c.total)} ${c.currency}</strong></div><div class="card-row"><span>المتبقي:</span><strong>${fmt(contractRemaining(c))} ${c.currency}</strong></div></div>`;
    }).join('');
  }
  showScreen('my-contracts-screen');
}

/* ============================================================
   الأدمن
   ============================================================ */
function refreshAdminDashboard() {
  $('admin-merchants').textContent = fmt(DB.data.merchants.length);
  $('admin-customers').textContent = fmt(DB.data.customers.length);
  $('admin-contracts').textContent = fmt(DB.data.contracts.length);
}

function openAdminMerchants() { renderAdminMerchants(); showScreen('admin-merchants-screen'); }
function renderAdminMerchants() {
  const box = $('admin-merchants-list');
  const list = DB.data.merchants;
  if (!list.length) { box.innerHTML = `<div class="empty-state"><div class="icon">🏪</div><div>لا يوجد مقسطون</div></div>`; return; }
  box.innerHTML = list.map(m => {
    const p = getMerchantProfile(m);
    const contractsCount = DB.data.contracts.filter(c => c.merchantId === m.id).length;
    const durTags = (p.durations || []).map(d => `<span class="tag tag-green">${freqLabel(d)}</span>`).join(' ');
    const sectorTags = (p.sectors || []).map(k => {
      const s = SECTORS[k];
      return s ? `<span class="tag tag-${k}">${s.icon} ${s.short}</span>` : '';
    }).join(' ');

    return `
      <div class="card">
        <div class="card-title">
          <span>🏪 ${escapeHtml(p.shopName || m.name)}</span>
          <button class="delete-btn" onclick="adminDeleteMerchant('${m.id}')">🗑️</button>
        </div>
        <div class="card-row"><span>👤 اسم المستخدم:</span><strong>${escapeHtml(m.name)}</strong></div>
        <div class="card-row"><span>🔑 كلمة المرور:</span><strong><span class="pass-chip">${escapeHtml(m.password)}</span></strong></div>
        <div class="card-row"><span>📞 الهاتف:</span><strong>${escapeHtml(p.phone || '—')}</strong></div>
        <div class="card-row"><span>📍 العنوان:</span><strong>${escapeHtml(p.address || '—')}</strong></div>
        ${sectorTags ? `<div class="card-row"><span>🎯 المجالات:</span><strong>${sectorTags}</strong></div>` : ''}
        ${p.maxAmount ? `<div class="card-row"><span>💰 الحد الأقصى:</span><strong>${fmt(p.maxAmount)}</strong></div>` : ''}
        ${durTags ? `<div class="card-row"><span>📅 المدد:</span><strong>${durTags}</strong></div>` : ''}
        <div class="card-row"><span>🔒 ضمانات:</span><strong>${p.collaterals ? '✅' : '❌'}</strong></div>
        <div class="card-row"><span>👤 كفيل:</span><strong>${p.guarantor ? '✅' : '❌'}</strong></div>
        <div class="card-row"><span>📄 عدد العقود:</span><strong>${contractsCount}</strong></div>
        <div class="card-row"><span>📋 حالة البروفايل:</span><strong>${p.completed ? '✅ مكتمل' : '⚠️ ناقص'}</strong></div>
      </div>
    `;
  }).join('');
}
function adminDeleteMerchant(id) {
  if (!confirm('حذف هذا المقسط وكل بياناته؟')) return;
  DB.data.merchants = DB.data.merchants.filter(m => m.id !== id);
  DB.data.customersList = DB.data.customersList.filter(c => c.merchantId !== id);
  DB.data.contracts = DB.data.contracts.filter(c => c.merchantId !== id);
  DB.data.collaterals = DB.data.collaterals.filter(c => c.merchantId !== id);
  DB.data.traders = DB.data.traders.filter(t => t.merchantId !== id);
  DB.save();
  renderAdminMerchants();
  refreshAdminDashboard();
}

function openAdminCustomers() { renderAdminCustomers(); showScreen('admin-customers-screen'); }
function renderAdminCustomers() {
  const box = $('admin-customers-list');
  const list = DB.data.customers;
  if (!list.length) { box.innerHTML = `<div class="empty-state"><div class="icon">👥</div><div>لا يوجد زبائن</div></div>`; return; }
  box.innerHTML = list.map(c => {
    const contractsCount = DB.data.contracts.filter(ct => {
      const cust = DB.data.customersList.find(x => x.id === ct.customerId);
      return cust && cust.name === c.name;
    }).length;
    return `
      <div class="card">
        <div class="card-title">
          <span>👤 ${escapeHtml(c.name)}</span>
          <button class="delete-btn" onclick="adminDeleteCustomer('${c.id}')">🗑️</button>
        </div>
        <div class="card-row"><span>👤 اسم المستخدم:</span><strong>${escapeHtml(c.name)}</strong></div>
        <div class="card-row"><span>🔑 كلمة المرور:</span><strong><span class="pass-chip">${escapeHtml(c.password)}</span></strong></div>
        <div class="card-row"><span>📄 عدد العقود:</span><strong>${contractsCount}</strong></div>
        <div class="card-row"><span>📅 تاريخ التسجيل:</span><strong>${new Date(c.createdAt).toLocaleDateString('ar')}</strong></div>
      </div>
    `;
  }).join('');
}
function adminDeleteCustomer(id) {
  if (!confirm('حذف هذا الزبون؟')) return;
  DB.data.customers = DB.data.customers.filter(c => c.id !== id);
  DB.save();
  renderAdminCustomers();
  refreshAdminDashboard();
}

function openAdminContracts() { renderAdminContracts(); showScreen('admin-contracts-screen'); }
function renderAdminContracts() {
  const box = $('admin-contracts-list');
  const list = [...DB.data.contracts].sort((a, b) => b.createdAt - a.createdAt);
  if (!list.length) { box.innerHTML = `<div class="empty-state"><div class="icon">📄</div><div>لا توجد عقود</div></div>`; return; }
  box.innerHTML = list.map(c => {
    const merchant = DB.data.merchants.find(m => m.id === c.merchantId);
    const customer = DB.data.customersList.find(x => x.id === c.customerId);
    const status = contractStatus(c);
    const sm = { active: ['نشط', 'badge-active'], completed: ['مكتمل', 'badge-completed'], late: ['متأخر', 'badge-late'] };
    const [txt, cls] = sm[status];
    const mp = merchant ? getMerchantProfile(merchant) : null;
    const mName = mp && mp.shopName ? mp.shopName : (merchant ? merchant.name : '—');
    return `
      <div class="card">
        <div class="card-title">
          <span>${escapeHtml(customer ? customer.name : '—')}</span>
          <span class="badge ${cls}">${txt}</span>
        </div>
        <div class="card-row"><span>🏪 المقسط:</span><strong>${escapeHtml(mName)}</strong></div>
        <div class="card-row"><span>💰 الإجمالي:</span><strong>${fmt(c.total)} ${c.currency}</strong></div>
        <div class="card-row"><span>💵 المتبقي:</span><strong>${fmt(contractRemaining(c))} ${c.currency}</strong></div>
      </div>
    `;
  }).join('');
}

/* ============================================================
   تحديث شامل
   ============================================================ */
function refreshAll() {
  const s = DB.data.session;
  if (!s) return;
  if (s.role === 'merchant') refreshMerchantDashboard();
  else if (s.role === 'customer') refreshCustomerDashboard();
  else if (s.role === 'admin') refreshAdminDashboard();
}

/* ============================================================
   النافذة المنبثقة
   ============================================================ */
let modalSaveHandler = null;
function openModal(title, bodyHtml, onSave) {
  $('modal-title').textContent = title;
  $('modal-body').innerHTML = bodyHtml;
  modalSaveHandler = onSave;
  $('modal-save-btn').onclick = () => { if (modalSaveHandler) modalSaveHandler(); };
  $('modal').classList.add('active');
}
function closeModal() {
  $('modal').classList.remove('active');
  modalSaveHandler = null;
}
document.addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });

/* ============================================================
   مراقبة إدخال PIN من حقل الإدخال
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const pinInput = $('pin-login-input');
  if (pinInput) {
    pinInput.addEventListener('input', (e) => {
      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
      pinLoginBuffer = val;
      e.target.value = val;
      if (val.length === 4) {
        setTimeout(verifyPINLogin, 200);
      }
    });
  }
});

