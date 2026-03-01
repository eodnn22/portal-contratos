// app.js FINAL CORRIGIDO
(function () {

  const API = ""; // Railway usa mesma origem

  function getEl(id) {
    return document.getElementById(id);
  }

  function setMsg(texto = "", tipo = "") {
    const el = getEl("msg");
    if (!el) return;

    el.className = "msg";

    const t = String(texto ?? "").trim();
    el.textContent = t;

    if (!t) {
      el.style.display = "none";
      return;
    }

    el.style.display = "block";

    if (tipo && String(tipo).trim() !== "") {
      el.classList.add(String(tipo).trim());
    }
  }

  async function apiFetch(path, options = {}) {
    const res = await fetch(API + path, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      },
      body: options.body
    });

    const raw = await res.text();
    let data = {};

    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { message: raw };
    }

    if (!res.ok) {
      throw new Error(
        data?.erro ||
        data?.error ||
        data?.message ||
        `Erro HTTP ${res.status}`
      );
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
        body: JSON.stringify({ email, senha })
      });

      if (data?.token) {
        localStorage.setItem("token", data.token);
      }

      setMsg("Login realizado ✅", "ok");

      setTimeout(() => {
        if (data?.usuario?.tipo === "admin") {
          window.location.href = "/admin.html";
        } else {
          window.location.href = "/portal.html";
        }
      }, 400);

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

    if (!nome || !email || !cpf || !senha) {
      setMsg("Preencha todos os campos", "erro");
      return;
    }

    try {
      await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          nome,
          email,
          cpf,
          senha,
          tipo: "aluno" // 👈 FORÇADO
        })
      });

      setMsg("Conta criada com sucesso ✅", "ok");

      setTimeout(() => {
        window.location.href = "/login.html";
      }, 600);

    } catch (e) {
      setMsg(e.message, "erro");
    }
  }

  window.entrar = entrar;
  window.cadastrar = cadastrar;

  console.log("app.js carregado com sucesso 🚀");

})();
