(function () {
  const API = ""; // deixa vazio no Railway (mesma origem)

  function setMsg(texto, tipo) {
    const el = document.getElementById("msg");
    if (!el) return;

    el.className = "msg"; // reseta classes

    const t = (texto ?? "").toString().trim();
    el.textContent = t;

    if (!t) {
      el.style.display = "none";
      return;
    }

    el.style.display = "block";

    // SÓ adiciona classe se existir
    if (tipo && String(tipo).trim()) {
      el.classList.add(tipo);
    }
  }

  async function apiFetch(path, options = {}) {
    const res = await fetch(API + path, {
      method: options.method || "GET",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      body: options.body,
    });

    const raw = await res.text();
    let data;
    try { data = JSON.parse(raw); }
    catch { data = { message: raw }; }

    if (!res.ok) {
      throw new Error(data?.erro || data?.error || data?.message || `Erro HTTP ${res.status}`);
    }

    return data;
  }

  async function entrar() {
    setMsg("");

    const email = document.getElementById("email")?.value?.trim();
    const senha = document.getElementById("senha")?.value?.trim();

    if (!email || !senha) {
      setMsg("Informe email e senha", "erro");
      return;
    }

    try {
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, senha }),
      });

      localStorage.setItem("token", data.token);
      setMsg("Login OK ✅", "ok");

      setTimeout(() => {
        window.location.href = data.usuario?.tipo === "admin" ? "/admin.html" : "/portal.html";
      }, 400);

    } catch (e) {
      setMsg(e.message, "erro");
    }
  }

  async function cadastrar() {
    setMsg("");

    const nome = document.getElementById("nome")?.value?.trim();
    const email = document.getElementById("email")?.value?.trim();
    const cpf = document.getElementById("cpf")?.value?.trim();
    const senha = document.getElementById("senha")?.value?.trim();

    // se não existir select tipo, manda "aluno"
    const tipoEl = document.getElementById("tipo");
    const tipo = (tipoEl && tipoEl.value) ? tipoEl.value : "aluno";

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
      setTimeout(() => (window.location.href = "/login.html"), 700);

    } catch (e) {
      setMsg(e.message, "erro");
    }
  }

  // deixa global pro onclick funcionar
  window.entrar = entrar;
  window.cadastrar = cadastrar;
})();
