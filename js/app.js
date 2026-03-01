const API = "";

// 🔹 LOGIN
async function login() {
    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;

    const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha })
    });

    const data = await res.json();

    if (!res.ok) {
        alert(data.error);
        return;
    }

    localStorage.setItem("user", JSON.stringify(data.user));

    if (data.user.tipo === "admin") {
        window.location.href = "admin.html";
    } else {
        window.location.href = "portal.html";
    }
}


// 🔹 REGISTER
async function cadastrar() {
    const nome = document.getElementById("nome").value;
    const email = document.getElementById("email").value;
    const cpf = document.getElementById("cpf").value;
    const senha = document.getElementById("senha").value;

    const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, cpf, senha })
    });

    const data = await res.json();

    if (!res.ok) {
        alert(data.error);
        return;
    }

    alert("Cadastro realizado com sucesso!");
    window.location.href = "login.html";
}


// 🔹 SAIR
function sair() {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "login.html";
}
