/* public/js/app.js
   Sem "export". Funções globais para usar direto no onclick do HTML.
*/

(function () {
  // -------------------------
  // Helpers
  // -------------------------
  function $(sel) {
    return document.querySelector(sel);
  }

  function setMsg(text, type = "erro") {
    const el = $("#msg");
    if (!el) return;

    el.textContent = text || "";
    el.style.display = text ? "block" : "none";

    // opcional: estilos simples
    el.style.padding = text ? "10px" : "";
    el.style.margin = text ? "10px 0" : "";
    el.style.borderRadius = text ? "8px" : "";
    el.style.fontSize = "14px";

    if (!text) return;

    if (type === "ok") {
      el.style.background = "#e7f7ed";
      el.style.border = "1px solid #b7ebc6";
      el.style.color = "#155724";
    } else {
      el.style.background = "#fdecea";
      el.style.border = "1px solid #f5c6cb";
      el.style.color = "#721c24";
    }
  }

  async function apiFetch(path, { method = "GET", body, auth = true } = {}) {
    const headers = { "Content-Type": "application/json" };

    if (auth) {
      const token = localStorage.getItem("token");
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    // tenta ler JSON, mas se não vier JSON, pega texto
    const contentType = res.headers.get("content-type") || "";
    let data = null;

    if (contentType.includes("application/json")) {
      data = await res.json().catch(() => null);
    } else {
      const txt = await res.text().catch(() => "");
      data = txt ? { error: txt } : null;
    }

    if (!res.ok) {
      const msg =
        (data && (data.error || data.message)) ||
        `Erro HTTP ${res.status} (${res.statusText})`;
      const err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  function redirectTo(url) {
    window.location.href = url;
  }

  // -------------------------
  // AUTH (LOGIN / REGISTER)
  // -------------------------
  window.entrar = async function entrar() {
    setMsg("");

    const emailEl = $("#email");
    const senhaEl = $("#senha");

    const email = (emailEl?.value || "").trim();
    const senha = (senhaEl?.value || "").trim();

    if (!email || !senha) {
      setMsg("Preencha email e senha.");
      return;
    }

    try {
      // Importante: usar rota relativa (mesmo domínio do Railway)
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: { email, senha },
        auth: false,
      });

      // server.js retorna { token, usuario: {...} }
      if (data?.token) localStorage.setItem("token", data.token);
      if (data?.usuario) localStorage.setItem("usuario", JSON.stringify(data.usuario));

      setMsg("Login OK ✅", "ok");

      // se tiver "tipo", manda pro admin ou portal
      const tipo = data?.usuario?.tipo;
      if (tipo === "admin") redirectTo("/admin.html");
      else redirectTo("/portal.html");
    } catch (e) {
      setMsg(e.message || "Falha no login.");
    }
  };

  window.cadastrar = async function cadastrar() {
    setMsg("");

    // ids esperados na sua tela de register (ajuste se seus inputs tiverem outros ids)
    const nome = ($("#nome")?.value || "").trim();
    const email = ($("#email")?.value || "").trim();
    const cpf = ($("#cpf")?.value || "").trim();
    const senha = ($("#senha")?.value || "").trim();

    // tipo pode ser select/radio; se não existir, manda "aluno"
    const tipoEl = $("#tipo");
    const tipo = (tipoEl?.value || "aluno").trim();

    if (!nome || !email || !cpf || !senha) {
      setMsg("Preencha nome, email, CPF e senha.");
      return;
    }

    try {
      const data = await apiFetch("/api/auth/register", {
        method: "POST",
        body: { nome, email, cpf, senha, tipo },
        auth: false,
      });

      setMsg(data?.mensagem || "Conta criada ✅", "ok");

      // após cadastrar, manda pro login
      setTimeout(() => redirectTo("/login.html"), 600);
    } catch (e) {
      setMsg(e.message || "Erro ao cadastrar.");
    }
  };

  window.sair = function sair() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    redirectTo("/login.html");
  };

  // -------------------------
  // (Opcional) Proteção simples de páginas
  // Se você quiser: nas páginas admin/portal, chama requireLogin() no onload.
  // -------------------------
  window.requireLogin = function requireLogin() {
    const token = localStorage.getItem("token");
    if (!token) redirectTo("/login.html");
  };

  // -------------------------
  // Debug: mostra que carregou
  // -------------------------
  console.log("app.js carregado ✅");
})();
