// public/js/app.js
// Front do Portal Contratos (login + cadastro)
// Sem "export" e com tratamento de erro robusto

(function () {
  const API = ""; // mesmo domínio (Railway). Se precisar apontar pra outro, coloque a URL aqui.

  function $(id) {
    return document.getElementById(id);
  }

  function setMsg(texto, tipo) {
    const el = $("msg");
    if (!el) return;

    // limpa classes anteriores comuns
    el.classList.remove("ok", "erro", "warn", "success", "danger");

    // garante string
    const t = String(texto ?? "").trim();
    el.textContent = t;

    // se não tiver texto, some com a mensagem
    if (!t) {
      el.style.display = "none";
      return;
    }

    el.style.display = "block";

    // tipo opcional (não pode ser vazio)
    const cls = String(tipo ?? "").trim();
    if (cls) el.classList.add(cls);
  }

  async function apiFetch(path, options = {}) {
    const url = API + path;

    const opts = {
      method: options.method || "GET",
      headers: {
        ...(options.headers || {}),
      },
      body: options.body,
    };

    // se body for objeto, envia JSON automaticamente
    if (opts.body && typeof opts.body === "object" && !(opts.body instanceof FormData)) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(opts.body);
    }

    let res;
    try {
      res = await fetch(url, opts);
    } catch (e) {
      // Falha de rede / CORS / servidor fora
      throw new Error("Falha de rede (Failed to fetch). Verifique se o servidor está online.");
    }

    // tenta ler JSON, mas se não vier JSON não quebra
    let data = null;
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      data = await res.json().catch(() => null);
    } else {
      const txt = await res.text().catch(() => "");
      data = txt ? { message: txt } : null;
    }

    if (!res.ok) {
      const msg =
        (data && (data.erro || data.error || data.message)) ||
        `Erro HTTP ${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  // ===== LOGIN =====
  async function entrar() {
    setMsg("");

    const email = ($("email")?.value || "").trim();
    const senha = ($("senha")?.value || "").trim();

    if (!email || !senha) {
      setMsg("Preencha email e senha.", "erro");
      return;
    }

    try {
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: { email, senha },
      });

      // salva token se vier
      if (data?.token) localStorage.setItem("token", data.token);
      if (data?.usuario) localStorage.setItem("usuario", JSON.stringify(data.usuario));

      setMsg("Login OK ✅", "ok");

      // redireciona conforme tipo (se existir)
      const tipo = data?.usuario?.tipo;
      setTimeout(() => {
        if (tipo === "admin") window.location.href = "/admin.html";
        else window.location.href = "/portal.html";
      }, 300);
    } catch (e) {
      // 400 costuma ser credenciais inválidas
      setMsg(e.message || "Erro ao logar.", "erro");
    }
  }

  // ===== CADASTRO =====
  async function cadastrar() {
    setMsg("");

    const nome = ($("nome")?.value || "").trim();
    const email = ($("email")?.value || "").trim();
    const cpfRaw = ($("cpf")?.value || "").trim();
    const senha = ($("senha")?.value || "").trim();

    // "tipo" pode existir como input/select; se não existir, assume aluno
    let tipo = ($("tipo")?.value || "").trim();
    if (!tipo) tipo = "aluno";

    const cpf = cpfRaw.replace(/\D/g, ""); // só números

    if (!nome || !email || !cpf || !senha) {
      setMsg("Preencha nome, email, CPF e senha.", "erro");
      return;
    }
    if (cpf.length < 11) {
      setMsg("CPF inválido (precisa ter 11 números).", "erro");
      return;
    }

    try {
      await apiFetch("/api/auth/register", {
        method: "POST",
        body: { nome, email, cpf, senha, tipo },
      });

      setMsg("Conta criada ✅ Agora faça login.", "ok");

      setTimeout(() => {
        window.location.href = "/login.html";
      }, 500);
    } catch (e) {
      setMsg(e.message || "Erro ao cadastrar.", "erro");
    }
  }

  // deixa as funções no escopo global (para onclick do HTML)
  window.entrar = entrar;
  window.cadastrar = cadastrar;

  // se quiser, ao carregar a página, limpa msg
  document.addEventListener("DOMContentLoaded", () => setMsg(""));
})();
