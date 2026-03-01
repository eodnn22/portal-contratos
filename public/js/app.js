// public/js/app.js

const API = ""; // mesma origem (Railway), não precisa colocar URL

function qs(id) {
  return document.getElementById(id);
}

function setMsg(texto, tipo = "erro") {
  const el = qs("msg");
  if (!el) return;

  el.textContent = texto || "";
  el.classList.remove("erro", "sucesso");

  if (texto) {
    el.classList.add(tipo === "sucesso" ? "sucesso" : "erro");
  }
}

async function apiFetch(url, options = {}) {
  const res = await fetch(API + url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // se não vier json, deixa null
  }

  if (!res.ok) {
    const msg = data?.erro || data?.message || `Erro HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

// ===== LOGIN =====
async function entrar() {
  try {
    setMsg("");

    const email = String(qs("email")?.value || "").trim();
    const senha = String(qs("senha")?.value || "");

    if (!email || !senha) {
      setMsg("Preencha email e senha.");
      return;
    }

    const data = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, senha }),
    });

    localStorage.setItem("token", data.token);
    localStorage.setItem("usuario", JSON.stringify(data.usuario));

    // redireciona
    window.location.href = "/portal.html";
  } catch (e) {
    setMsg(e.message || "Erro ao logar");
  }
}

// ===== CADASTRO =====
async function cadastrar() {
  try {
    setMsg("");

    const nome = String(qs("nome")?.value || "").trim();
    const email = String(qs("email")?.value || "").trim();
    const cpf = String(qs("cpf")?.value || "").trim();
    const senha = String(qs("senha")?.value || "");

    if (!nome || !email || !cpf || !senha) {
      setMsg("Preencha nome, email, cpf e senha.");
      return;
    }

    await apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ nome, email, cpf, senha }),
    });

    setMsg("Conta criada ✅ Agora faça login.", "sucesso");

    // opcional: mandar pro login após 800ms
    setTimeout(() => {
      window.location.href = "/login.html";
    }, 800);
  } catch (e) {
    setMsg(e.message || "Erro ao cadastrar");
  }
}

// deixa as funções disponíveis pro onclick do HTML
window.entrar = entrar;
window.cadastrar = cadastrar;

// só pra confirmar que carregou
console.log("app.js carregado com sucesso ✅");
