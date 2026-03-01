// public/js/app.js (COMPLETO)
const API = 'http://localhost:5000';

function setMsg(id, text) {
  const el = document.getElementById(id);
  if (el) el.innerText = text || '';
}

function getToken() {
  return localStorage.getItem('token');
}

function getUser() {
  try { return JSON.parse(localStorage.getItem('usuario') || 'null'); }
  catch { return null; }
}

function authHeaders(extra = {}) {
  const t = getToken();
  return { ...extra, ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  location.href = '/login.html';
}

function requireLogin() {
  const token = getToken();
  const user = getUser();
  if (!token || !user) {
    location.href = '/login.html';
    return false;
  }
  return true;
}

function requireAdmin() {
  if (!requireLogin()) return false;
  const u = getUser();
  if (!u || u.tipo !== 'admin') {
    location.href = '/portal.html';
    return false;
  }
  return true;
}

function requireAluno() {
  if (!requireLogin()) return false;
  const u = getUser();
  if (!u || u.tipo !== 'aluno') {
    location.href = '/admin.html';
    return false;
  }
  return true;
}

async function apiFetch(url, options = {}) {
  const finalOptions = {
    ...options,
    headers: authHeaders({ ...(options.headers || {}) })
  };

  const res = await fetch(url, finalOptions);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data.erro || `Erro HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

// expõe pro HTML
window.API = API;
window.setMsg = setMsg;
window.getToken = getToken;
window.getUser = getUser;
window.authHeaders = authHeaders;
window.logout = logout;
window.requireLogin = requireLogin;
window.requireAdmin = requireAdmin;
window.requireAluno = requireAluno;
window.apiFetch = apiFetch;

console.log('app.js carregado ✅', { API });