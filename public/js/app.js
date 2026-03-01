// =======================
// Helpers
// =======================
function setMsg(texto, tipo = "erro") {
  const el = document.getElementById("msg");
  if (!el) return;
  el.textContent = texto || "";
  el.className = "msg " + (tipo || "");
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

// apiFetch usado pelo portal/aluno/admin (corrige "apiFetch is not defined")
async function apiFetch(url, options = {}) {
  const opts = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  };

  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error || data.message || `Erro HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

// =======================
// Auth actions
// =======================
async function entrar() {
  try {
    setMsg("");

    const email = (document.getElementById("email")?.value || "").trim();
    const senha = (document.getElementById("senha")?.value || "").trim();

    if (!email || !senha) return setMsg("Preencha email e senha.");

    const data = await apiFetch("/api/login", {
      method: "POST",
      body: JSON.stringify({ email, senha })
    });

    localStorage.setItem("user", JSON.stringify(data.user));

    if (data.user.tipo === "admin") window.location.href = "/admin.html";
    else window.location.href = "/portal.html";
  } catch (e) {
    console.error(e);
    setMsg(e.message || "Falha ao conectar no servidor.");
  }
}

async function cadastrar() {
  try {
    setMsg("");

    const nome = (document.getElementById("nome")?.value || "").trim();
    const email = (document.getElementById("email")?.value || "").trim();
    const cpf = (document.getElementById("cpf")?.value || "").trim();
    const senha = (document.getElementById("senha")?.value || "").trim();

    if (!nome || !email || !cpf || !senha) {
      return setMsg("Preencha nome, email, cpf e senha.");
    }

    await apiFetch("/api/register", {
      method: "POST",
      body: JSON.stringify({ nome, email, cpf, senha })
    });

    setMsg("Cadastro realizado! Indo para o login...", "ok");
    setTimeout(() => (window.location.href = "/login.html"), 800);
  } catch (e) {
    console.error(e);
    setMsg(e.message || "Erro ao cadastrar.");
  }
}

// Sair (admin e aluno)
function sair() {
  localStorage.removeItem("user");
  window.location.href = "/login.html";
}

// Alias caso seu HTML esteja chamando logout()
function logout() {
  sair();
}

// =======================
// Auto-wire botão Sair
// =======================
function wireLogoutButtons() {
  // tenta achar qualquer botão/elemento com id ou classe de sair
  const candidates = [
    document.getElementById("btnSair"),
    document.getElementById("sair"),
    document.getElementById("logout"),
    ...document.querySelectorAll("[data-logout]"),
    ...document.querySelectorAll(".btn-sair"),
    ...document.querySelectorAll("button")
  ].filter(Boolean);

  candidates.forEach((el) => {
    const txt = (el.textContent || "").toLowerCase();
    if (el.id === "btnSair" || el.id === "sair" || el.id === "logout" || el.hasAttribute("data-logout") || txt.includes("sair")) {
      el.addEventListener("click", (ev) => {
        ev.preventDefault();
        sair();
      });
    }
  });
}

// =======================
// Guards (opcional)
// =======================
function guardAuth() {
  const u = getUser();
  const path = location.pathname;

  // páginas que precisam login
  const needsLogin = ["/portal.html", "/admin.html", "/buscar-contrato.html"];
  if (needsLogin.includes(path) && !u) {
    window.location.href = "/login.html";
    return;
  }

  // impede aluno de abrir admin.html
  if (path === "/admin.html" && u && u.tipo !== "admin") {
    window.location.href = "/portal.html";
    return;
  }
}

// roda sempre
document.addEventListener("DOMContentLoaded", () => {
  guardAuth();
  wireLogoutButtons();
});
