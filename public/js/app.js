function setMsg(texto, tipo = "erro") {
  const el = document.getElementById("msg");
  if (!el) return;
  el.textContent = texto || "";
  el.className = "msg " + (tipo || "");
}

// LOGIN (botão chama entrar())
async function entrar() {
  try {
    setMsg("");

    const email = (document.getElementById("email")?.value || "").trim();
    const senha = (document.getElementById("senha")?.value || "").trim();

    if (!email || !senha) {
      setMsg("Preencha email e senha.");
      return;
    }

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setMsg(data.error || "Erro no login.");
      return;
    }

    localStorage.setItem("user", JSON.stringify(data.user));

    if (data.user.tipo === "admin") {
      window.location.href = "/admin.html";
    } else {
      window.location.href = "/portal.html";
    }
  } catch (e) {
    console.error(e);
    setMsg("Falha ao conectar no servidor.");
  }
}

// REGISTER
async function cadastrar() {
  try {
    setMsg("");

    const nome = (document.getElementById("nome")?.value || "").trim();
    const email = (document.getElementById("email")?.value || "").trim();
    const cpf = (document.getElementById("cpf")?.value || "").trim();
    const senha = (document.getElementById("senha")?.value || "").trim();

    if (!nome || !email || !cpf || !senha) {
      setMsg("Preencha nome, email, cpf e senha.");
      return;
    }

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, email, cpf, senha })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setMsg(data.error || "Erro ao cadastrar.");
      return;
    }

    setMsg("Cadastro realizado! Vá para o login.", "ok");
    setTimeout(() => (window.location.href = "/login.html"), 800);
  } catch (e) {
    console.error(e);
    setMsg("Falha ao conectar no servidor.");
  }
}

// SAIR
function sair() {
  localStorage.removeItem("user");
  window.location.href = "/login.html";
}
