(function () {

  const API = "";

  function setMsg(texto, tipo) {
    const el = document.getElementById("msg");
    if (!el) return;

    el.className = "msg"; // reseta classes sempre

    const t = (texto || "").toString().trim();
    el.textContent = t;

    if (!t) {
      el.style.display = "none";
      return;
    }

    el.style.display = "block";

    if (tipo && tipo.trim() !== "") {
      el.classList.add(tipo);
    }
  }

  async function apiFetch(url, options) {
    const res = await fetch(API + url, {
      headers: { "Content-Type": "application/json" },
      ...options
    });

    const text = await res.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }

    if (!res.ok) {
      throw new Error(
        data?.erro ||
        data?.error ||
        data?.message ||
        "Erro HTTP " + res.status
      );
    }

    return data;
  }

  async function cadastrar() {
    setMsg("");

    const nome = document.getElementById("nome")?.value?.trim();
    const email = document.getElementById("email")?.value?.trim();
    const cpf = document.getElementById("cpf")?.value?.trim();
    const senha = document.getElementById("senha")?.value?.trim();
    const tipo = document.getElementById("tipo")?.value || "aluno";

    if (!nome || !email || !cpf || !senha) {
      setMsg("Preencha todos os campos", "erro");
      return;
    }

    try {
      await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ nome, email, cpf, senha, tipo })
      });

      setMsg("Conta criada com sucesso ✅", "ok");

      setTimeout(() => {
        window.location.href = "/login.html";
      }, 800);

    } catch (e) {
      setMsg(e.message, "erro");
    }
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
        body: JSON.stringify({ email, senha })
      });

      localStorage.setItem("token", data.token);

      setMsg("Login realizado ✅", "ok");

      setTimeout(() => {
        window.location.href = data.usuario.tipo === "admin"
          ? "/admin.html"
          : "/portal.html";
      }, 500);

    } catch (e) {
      setMsg(e.message, "erro");
    }
  }

  window.cadastrar = cadastrar;
  window.entrar = entrar;

})();
