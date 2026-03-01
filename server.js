// server.js
const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mysql = require("mysql2/promise");

const app = express();

// ============ CONFIG ============
const PORT = process.env.PORT || 8080;

// Railway (recomendado): crie uma variável DATABASE_URL no serviço do seu app
// com valor: ${{ MySQL.MYSQL_URL }}
const DATABASE_URL = process.env.DATABASE_URL || process.env.MYSQL_URL || "";

// Admin único (opcional, mas recomendado)
// Configure no Railway -> Variables do serviço do APP:
// ADMIN_EMAIL=admin@escola.com
// ADMIN_PASSWORD=uma_senha_forte
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "").trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

// JWT (pode ser qualquer string no Railway)
const JWT_SECRET = process.env.JWT_SECRET || "troque_essa_chave_no_railway";

// ============ MIDDLEWARE ============
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir front (public/)
app.use(express.static(path.join(__dirname, "public")));

// ============ MYSQL ============
let db;

function parseMysqlUrl(url) {
  // mysql://user:pass@host:port/database
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port || 3306),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace("/", ""),
    // Railway pode exigir SSL dependendo do caso; normalmente Private Network não precisa.
    // Se der problema de SSL, a gente ajusta.
  };
}

async function initDatabase() {
  if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL não definido. Configure no Railway -> Variables.");
    throw new Error("DATABASE_URL não definido");
  }

  const cfg = parseMysqlUrl(DATABASE_URL);

  db = await mysql.createPool({
    ...cfg,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  await db.execute("SELECT 1");

  // cria tabela compatível com seu print
  await db.execute(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nome VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      cpf VARCHAR(20) NOT NULL UNIQUE,
      senha_hash VARCHAR(255) NOT NULL
    )
  `);

  console.log("✅ Tabela 'usuarios' OK");

  // cria admin automático (se configurado)
  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    const [rows] = await db.execute(
      "SELECT id FROM usuarios WHERE email = ? LIMIT 1",
      [ADMIN_EMAIL]
    );

    if (rows.length === 0) {
      const hash = await bcrypt.hash(String(ADMIN_PASSWORD), 10);
      await db.execute(
        "INSERT INTO usuarios (nome, email, cpf, senha_hash) VALUES (?, ?, ?, ?)",
        ["Admin Escola", ADMIN_EMAIL, "00000000000", hash]
      );
      console.log("✅ Admin criado automaticamente:", ADMIN_EMAIL);
    } else {
      console.log("ℹ️ Admin já existe:", ADMIN_EMAIL);
    }
  } else {
    console.log("ℹ️ ADMIN_EMAIL/ADMIN_PASSWORD não definidos (opcional).");
  }
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function isAdminEmail(email) {
  return ADMIN_EMAIL && email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

// ============ ROTAS AUTH ============

// Cadastro (sempre cria aluno; admin é só por email configurado)
app.post("/api/auth/register", async (req, res) => {
  try {
    const nome = String(req.body.nome || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const cpf = String(req.body.cpf || "").trim();
    const senha = String(req.body.senha || "");

    if (!nome || !email || !cpf || !senha) {
      return res.status(400).json({ erro: "Preencha nome, email, cpf e senha" });
    }

    // regra: não permitir cadastro do email do admin pelo formulário
    if (isAdminEmail(email)) {
      return res.status(403).json({ erro: "Esse email é reservado ao admin." });
    }

    const hash = await bcrypt.hash(senha, 10);

    await db.execute(
      "INSERT INTO usuarios (nome, email, cpf, senha_hash) VALUES (?, ?, ?, ?)",
      [nome, email, cpf, hash]
    );

    return res.json({ mensagem: "Conta criada ✅" });
  } catch (e) {
    // duplicado
    const msg = String(e?.message || "");
    if (msg.includes("Duplicate") || msg.includes("ER_DUP_ENTRY")) {
      return res.status(400).json({ erro: "Email ou CPF já cadastrado" });
    }
    console.error("REGISTER ERROR:", e);
    return res.status(500).json({ erro: "Erro ao cadastrar" });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const senha = String(req.body.senha || "");

    if (!email || !senha) {
      return res.status(400).json({ erro: "Informe email e senha" });
    }

    const [rows] = await db.execute(
      "SELECT id, nome, email, cpf, senha_hash FROM usuarios WHERE email = ? LIMIT 1",
      [email]
    );

    const user = rows[0];
    if (!user) return res.status(400).json({ erro: "Credenciais inválidas" });

    const ok = await bcrypt.compare(String(senha), String(user.senha_hash));
    if (!ok) return res.status(400).json({ erro: "Credenciais inválidas" });

    const token = signToken(user);

    return res.json({
      token,
      usuario: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        cpf: user.cpf,
        admin: isAdminEmail(user.email),
      },
    });
  } catch (e) {
    console.error("LOGIN ERROR:", e);
    return res.status(500).json({ erro: "Erro ao logar" });
  }
});

// Health
app.get("/api/health", async (req, res) => {
  try {
    await db.execute("SELECT 1");
    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false });
  }
});

// ============ START ============
initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Falha ao iniciar:", err);
    process.exit(1);
  });
