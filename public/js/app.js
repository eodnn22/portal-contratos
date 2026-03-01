/* public/js/app.js */

/**
 * Base da API:
 * - Se o frontend e backend estão no mesmo serviço Railway: deixe vazio ("")
 * - Se estiver em outro domínio: coloque a URL (ex: "https://seu-backend.up.railway.app")
 */
const API = ""; // mesmo domínio

// ===== Helpers de UI =====
function $(id) {
  return document.getElementById(id);
}

function setMsg(text, type = "erro") {
  const el = $("msg");
  if (!el) return;

  el.textContent = text || "";
  el.style.display = text ? "block" : "none";

  // classes opcionais (se você tiver CSS)
  el.classList.remove("ok", "erro", "warn");
  el.classList.add(type);
}

function getValue(id) {
  const el = $(id);
  return el ? (el.value || "").trim() : "";
}

// ===== Auth storage =====
function setToken(token) {
  if (!token) return;
  localStorage.setItem("token", token);
}

function getToken() {
  return localStorage.getItem("token");
}

function clearToken() {
  localStorage.removeItem("token");
}

// ===== Fetch wrapper =====
async function apiFetch(path, options = {}) {
  const url = `${API}${path}`;

  const headers = Object.assign(
    { "Content-Type": "application/json" },
    options.headers || {}
  );

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const config = Object.assign({}, options, { headers });

  let res;
  try {
    res = await fetch(url, config);
  } catch (err) {
    // Erro de rede/CORS/domínio errado
    throw new Error("Falha de conexão com o servidor (Failed to fetch).");
  }

  // tenta ler JSON, se não der lê texto
  const contentType = res.headers.get("content-type") || "";
  let data = null;

  if (contentType.includes("application/json")) {
    data = await res.json().catch(() => null);
  } else {
    const t = await res.text().catch(() => "");
    data = t ? { message: t } : null;
  }

  if (!res.ok) {
    const msg =
      (data && (data.message || data.error)) ||
      `Erro HTTP ${res.status} (${res.statusText})`;
    throw new Error(msg);
  }

  return data;
}

// ===== LOGIN =====
async function entrar() {
  setMsg("");

  const email = getValue("email");
  const senha = getValue("senha");

  if (!email || !senha) {
    setMsg("Preencha email e senha.", "warn");
    return;
  }

  try {
    const data = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, senha })
    });

    // aceita vários formatos:
    // { token: "..." } OU { accessToken: "..." } OU { user:..., token:... }
    const token = (data && (data.token || data.accessToken)) || null;
    if (token) setToken(token);

    setMsg("Login realizado com sucesso!", "ok");

    // Redireciona (ajuste se seu fluxo for outro)
    // - Se existir portal.html, manda pra ele
    // - Se não, tenta index.html
    setTimeout(() => {
      const isInPublicFolder = location.pathname.includes("/public/");
      // normalmente no Railway vai ser /login.html, então:
      window.location.href = "/portal.html";
    }, 300);
  } catch (err) {
    setMsg(err.message || "Erro ao fazer login.", "erro");
  }
}

// ===== REGISTER =====
async function registrar() {
  setMsg("");

  // Campos comuns: nome/email/senha (ajuste conforme seu HTML)
  const nome = getValue("nome");
  const email = getValue("email");
  const senha = getValue("senha");

  if (!email || !senha) {
    setMsg("Preencha pelo menos email e senha.", "warn");
    return;
  }

  try {
    const payload = { email, senha };
    if (nome) payload.nome = nome;

    const data = await apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    setMsg("Conta criada! Agora faça login.", "ok");

    setTimeout(() => {
      window.location.href = "/login.html";
    }, 500);
  } catch (err) {
    setMsg(err.message || "Erro ao criar conta.", "erro");
  }
}

// ===== LOGOUT =====
function sair() {
  clearToken();
  setMsg("Sessão encerrada.", "ok");
  setTimeout(() => {
    window.location.href = "/login.html";
  }, 250);
}

// ===== Opcional: proteger páginas =====
function exigirLogin() {
  const token = getToken();
  if (!token) {
    // se estiver tentando acessar portal/admin sem logar
    window.location.href = "/login.html";
  }
}

// ===== Expor funções no escopo global (IMPORTANTE pro onclick) =====
window.entrar = entrar;
window.registrar = registrar;
window.sair = sair;
window.exigirLogin = exigirLogin;

// ===== Debug útil =====
document.addEventListener("DOMContentLoaded", () => {
  // Só pra confirmar que carregou
  // (se você não quiser, pode remover)
  // console.log("app.js carregado");
});
