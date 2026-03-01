/* =========================================
   CONFIG
========================================= */
const API_BASE = ""; // vazio = mesma URL do site (Railway). Ex: /api/login

/* =========================================
   HELPERS
========================================= */
function $(id) {
  return document.getElementById(id);
}

function setMsg(texto = "", tipo = "") {
  const el = $("msg");
  if (!el) return;
  el.textContent = texto || "";
  el.className = "msg " + (tipo || "");
}

function saveUser(user) {
  localStorage.setItem("user", JSON.stringify(user));
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function clearUser() {
  localStorage.removeItem("user");
}

/* =========================================
   apiFetch (corrige "apiFetch is not defined")
========================================= */
async function apiFetch(path, options = {}) {
  const url = API_BASE + path;

  const opts = {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    body: options.body
  };

  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data.error || data.message || `Erro HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

/* =========================================
   AUTH
========================================= */
async function entrar() {
  try {
    setMsg("");

    const email = ($("email")?.value || "").trim();
    const senha = ($("senha")?.value || "").trim();

    if (!email || !senha) {
      return setMsg("Preencha email e senha.");
    }

    // server.js mostra rota /api/auth/login no print, então usamos ela:
    const data = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, senha })
    });

    // servidor retorna { token, usuario: {...} } no teu print do server.js
    const usuario = data.usuario || data.user;
    if (!usuario) throw new Error("Resposta inválida do servidor.");

    saveUser(usuario);

    if (usuario.tipo === "admin") window.location.href = "/admin.html";
    else window.location.href = "/portal.html";
  } catch (e) {
    console.error(e);
    setMsg(e.message || "Falha ao entrar.");
  }
}

async function cadastrar() {
  try {
    setMsg("");

    const nome = ($("nome")?.value || "").trim();
    const email = ($("email")?.value || "").trim();
    const cpf = ($("cpf")?.value || "").trim();
    const senha = ($("senha")?.value || "").trim();

    if (!nome || !email || !cpf || !senha) {
      return setMsg("Preencha nome, email, cpf e senha.");
    }

    // Sem escolher tipo: o backend decide aluno por padrão
    const payload = { nome, email, cpf, senha };

    const data = await apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    setMsg(data.mensagem || "Conta criada ✅", "ok");
    setTimeout(() => (window.location.href = "/login.html"), 900);
  } catch (e) {
    console.error(e);
    setMsg(e.message || "Erro ao cadastrar.");
  }
}

/* =========================================
   LOGOUT (Sair)
========================================= */
function sair() {
  clearUser();
  window.location.href = "/login.html";
}

// caso algum HTML chame logout()
function logout() {
  sair();
}

/* =========================================
   AUTOWIRE BOTÃO SAIR
========================================= */
function wireLogoutButtons() {
  const els = [
    $("btnSair"),
    $("sair"),
    $("logout"),
    ...document.querySelectorAll("[data-logout]"),
    ...document.querySelectorAll(".btn-sair")
  ].filter(Boolean);

  els.forEach((el) => {
    el.addEventListener("click", (ev) => {
      ev.preventDefault();
      sair();
    });
  });

  // fallback: se tiver um botão com texto "Sair"
  document.querySelectorAll("button,a").forEach((el) => {
    const t = (el.textContent || "").trim().toLowerCase();
    if (t === "sair") {
      el.addEventListener("click", (ev) => {
        ev.preventDefault();
        sair();
      });
    }
  });
}

/* =========================================
   GUARDAS (impede abrir portal/admin sem login)
========================================= */
function guardAuth() {
  const u = getUser();
  const path = location.pathname;

  const needsLogin = ["/portal.html", "/admin.html"];
  if (needsLogin.includes(path) && !u) {
    window.location.href = "/login.html";
    return;
  }

  if (path === "/admin.html" && u && u.tipo !== "admin") {
    window.location.href = "/portal.html";
    return;
  }
}

/* =========================================
   INIT
========================================= */
document.addEventListener("DOMContentLoaded", () => {
  guardAuth();
  wireLogoutButtons();
});
