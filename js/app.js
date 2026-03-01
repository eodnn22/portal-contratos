// ================================
// CONFIGURAÇÃO DA API
// ================================
const API = 'http://localhost:5000';

// ================================
// UTIL: MENSAGEM NA TELA
// ================================
function setMsg(id, text) {
  const el = document.getElementById(id);
  if (el) el.innerText = text || '';
}

// ================================
// TOKEN / USUÁRIO
// ================================
function getToken() {
  return localStorage.getItem('token');
}
function setToken(token) {
  localStorage.setItem('token', token);
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('usuario') || 'null');
  } catch {
    return null;
  }
}
function setUser(user) {
  localStorage.setItem('usuario', JSON.stringify(user));
}

// ================================
// HEADERS (COM TOKEN)
// ================================
function authHeaders(extra = {}) {
  const t = getToken();
  return {
    ...extra,
    ...(t ? { Authorization: `Bearer ${t}` } : {})
  };
}

// ================================
// LOGOUT
// ================================
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  window.location.href = '/login.html';
}

// ================================
// PROTEÇÃO DE PÁGINAS
// ================================
function requireLogin() {
  const token = getToken();
  const user = getUser();
  if (!token || !user) {
    window.location.href = '/login.html';
    return false;
  }
  return true;
}

function requireAdmin() {
  if (!requireLogin()) return false;
  const user = getUser();
  if (!user || user.tipo !== 'admin') {
    window.location.href = '/portal.html';
    return false;
  }
  return true;
}

function requireAluno() {
  if (!requireLogin()) return false;
  const user = getUser();
  if (!user || user.tipo !== 'aluno') {
    window.location.href = '/admin.html';
    return false;
  }
  return true;
}

// ================================
// FETCH HELPER
// ================================
async function apiFetch(url, options = {}) {
  const finalOptions = {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...authHeaders()
    }
  };

  const res = await fetch(url, finalOptions);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data.erro || data.message || `Erro HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

// ================================
// LOGIN / CADASTRO (se quiser usar)
// ================================
async function login(email, senha) {
  const data = await apiFetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha })
  });

  if (data.token) setToken(data.token);
  if (data.usuario) setUser(data.usuario);

  return data;
}

async function cadastrar(nome, email, cpf, senha) {
  return apiFetch(`${API}/api/auth/cadastro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome, email, cpf, senha })
  });
}

// ================================
// EXPORTAR PARA O WINDOW (IMPORTANTÍSSIMO)
// ================================
window.API = API;
window.setMsg = setMsg;
window.getToken = getToken;
window.setToken = setToken;
window.getUser = getUser;
window.setUser = setUser;
window.authHeaders = authHeaders;
window.logout = logout;
window.requireLogin = requireLogin;
window.requireAdmin = requireAdmin;
window.requireAluno = requireAluno;
window.apiFetch = apiFetch;
window.login = login;
window.cadastrar = cadastrar;

console.log('app.js carregado ✅', { API });