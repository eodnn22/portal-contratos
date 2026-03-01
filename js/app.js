// app.js (cole igual em: js/app.js e public/js/app.js)
(function () {
  // No Railway, deixa vazio pra usar a mesma origem (https://seusite...)
  const API = "";

  function getEl(id) {
    return document.getElementById(id);
  }

  // Mensagens na tela (não quebra se tipo vier vazio/undefined)
  function setMsg(texto = "", tipo = "") {
    const el = getEl("msg");
    if (!el) return;

    el.className = "msg"; // reseta classes

    const t = String(texto ?? "").trim();
    el.textContent = t;

    if (!t) {
      el.style.display = "none";
      return;
    }

    el.style.display = "block";

    // só adiciona classe se existir
    if (tipo && String(tipo).trim()) {
      el.classList.add(String(tipo).trim());
    }
  }

  // Fetch que já trata JSON e erros
  async function apiFetch(path, options = {}) {
    const res = await fetch(API + path, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      body: options.body,
    });

    // tenta ler resposta
    const raw = await res.text();
    let data = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { message: raw };
    }

    if (!res.ok) {
      const msg =
        data?.erro ||
        data?.error ||
        data?.message ||
        `Erro HTTP ${res.status}`;
      throw new Error(msg);
    }

    return data;
  }

  // =========================
  // LOGIN
  // =========================
  async function entrar() {
    setMsg("");

    const email = getEl("email")?.value?.trim();
    const senha = getEl("senha")?.value?.trim();

    if (!email || !senha) {
      setMsg("Informe email e senha", "erro");
      return;
    }

    try {
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, senha }),
      });

      if (data?.token) localStorage.setItem("token", data.token);

      setMsg("Login OK ✅", "ok");

      // Redireciona conforme tipo
      setTimeout(() => {
        const tipo = data?.usuario?.tipo;
        if (tipo === "admin") window.location.href = "/admin.html";
        else window.location.href = "/portal.html";
      }, 300);
    } catch (e) {
      setMsg(e.message, "erro");
    }
  }

  // =========================
  // CADASTRO
  // =========================
  async function cadastrar() {
    setMsg("");

    const nome = getEl("nome")?.value?.trim();
    const email = getEl("email")?.value?.trim();
    const cpf = getEl("cpf")?.value?.trim();
    const senha = getEl("senha")?.value?.trim();

    // Se não existir <select id="tipo">, manda aluno por padrão
    const tipoEl = getEl("tipo");
    const tipo = tipoEl?.value?.trim() ? tipoEl.value.trim() : "aluno";

    if (!nome || !email || !cpf || !senha) {
      setMsg("Preencha nome, email, cpf e senha", "erro");
      return;
    }

    try {
      await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ nome, email, cpf, senha, tipo }),
      });

      setMsg("Conta criada ✅", "ok");
      setTimeout(() => {
        window.location.href = "/login.html";
      }, 600);
    } catch (e) {
      setMsg(e.message, "erro");
    }
  }

  // deixa global pro onclick do HTML funcionar
  window.entrar = entrar;
  window.cadastrar = cadastrar;

  console.log("app.js carregado ✅");
})();
