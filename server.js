// server.js
// Node + Express + MySQL (Railway) + Auth (JWT)
// Usa DATABASE_URL do Railway e cria tabela automaticamente.

const express = require("express");
const path = require("path");
const cors = require("cors");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

// ========= Config =========
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const DATABASE_URL = process.env.DATABASE_URL;

// Se você quer 1 admin fixo, defina essas vars no Railway:
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const ADMIN_NAME = process.env.ADMIN_NAME || "Administrador";
const ADMIN_CPF = process.env.ADMIN_CPF || "00000000000";

// ========= Middlewares =========
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, "public")));

// ========= DB Pool =========
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL não definida. Configure no Railway -> Variables.");
}

const db = mysql.createPool({
  uri: DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// ========= Helpers =========
function signToken(user) {
  // payload enxuto
  return jwt.sign(
    { id: user.id, email: user.email, tipo: user.tipo, nome: user.nome },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function authRequired(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Sem token" });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: "Token inválido" });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.tipo !== "admin") {
    return res.status(403).json({ error: "Acesso negado" });
  }
  next();
}

// ========= Bootstrap DB =========
async function initDatabase() {
  // Cria tabela
  await db.execute(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nome VARCHAR(120) NOT NULL,
      email VARCHAR(120) NOT NULL UNIQUE,
      cpf VARCHAR(20) NOT NULL UNIQUE,
      senha VARCHAR(255) NOT NULL,
      tipo ENUM('admin','aluno') NOT NULL DEFAULT 'aluno',
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      contrato_arquivo VARCHAR(255) NULL,
      assinatura_arquivo VARCHAR(255) NULL,
      assinado_em DATETIME NULL
    )
  `);

  console.log("✅ Tabela 'usuarios' OK");

  // Cria admin automático (se você setou ADMIN_EMAIL e ADMIN_PASSWORD no Railway)
  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    const [rows] = await db.execute(
      "SELECT id, email FROM usuarios WHERE email = ? LIMIT 1",
      [ADMIN_EMAIL]
    );

    if (rows.length === 0) {
      const hash = await bcrypt.hash(String(ADMIN_PASSWORD), 10);
      await db.execute(
        "INSERT INTO usuarios (nome, email, cpf, senha, tipo) VALUES (?, ?, ?, ?, 'admin')",
        [ADMIN_NAME, ADMIN_EMAIL, ADMIN_CPF, hash]
      );
      console.log("✅ Admin criado automaticamente:", ADMIN_EMAIL);
    } else {
      console.log("ℹ️ Admin já existe:", ADMIN_EMAIL);
    }
  } else {
    console.log(
      "ℹ️ ADMIN_EMAIL/ADMIN_PASSWORD não definidos. (Opcional) Defina no Railway para criar 1 admin automático."
    );
  }
}

// ========= Rotas =========
app.get("/health", async (req, res) => {
  try {
    await db.execute("SELECT 1");
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: "DB offline" });
  }
});

// ----- AUTH -----

// Criar conta (sempre ALUNO)
app.post("/api/auth/register", async (req, res) => {
  try {
    const { nome, email, cpf, senha } = req.body;

    if (!nome || !email || !cpf || !senha) {
      return res.status(400).json({ error: "Preencha nome, email, cpf e senha" });
    }

    const hash = await bcrypt.hash(String(senha), 10);

    await db.execute(
      "INSERT INTO usuarios (nome, email, cpf, senha, tipo) VALUES (?, ?, ?, ?, 'aluno')",
      [String(nome).trim(), String(email).trim().toLowerCase(), String(cpf).trim(), hash]
    );

    return res.json({ message: "Conta criada ✅" });
  } catch (e) {
    const msg = String(e?.message || "");
    // erro comum: duplicado
    if (msg.includes("Duplicate") || msg.includes("ER_DUP_ENTRY")) {
      return res.status(400).json({ error: "Email ou CPF já cadastrado" });
    }
    console.error("REGISTER ERROR:", e);
    return res.status(500).json({ error: "Erro ao cadastrar" });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: "Informe email e senha" });
    }

    const [rows] = await db.execute(
      "SELECT * FROM usuarios WHERE email = ? LIMIT 1",
      [String(email).trim().toLowerCase()]
    );

    const user = rows[0];
    if (!user) return res.status(400).json({ error: "Credenciais inválidas" });

    const ok = await bcrypt.compare(String(senha), String(user.senha));
    if (!ok) return res.status(400).json({ error: "Credenciais inválidas" });

    const token = signToken(user);

    return res.json({
      token,
      usuario: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        cpf: user.cpf,
        tipo: user.tipo,
      },
    });
  } catch (e) {
    console.error("LOGIN ERROR:", e);
    return res.status(500).json({ error: "Erro ao logar" });
  }
});

// ----- ADMIN (exemplo): listar usuários -----
app.get("/api/admin/usuarios", authRequired, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT id, nome, email, cpf, tipo, criado_em FROM usuarios ORDER BY id DESC"
    );
    res.json(rows);
  } catch (e) {
    console.error("ADMIN LIST ERROR:", e);
    res.status(500).json({ error: "Erro ao listar" });
  }
});

// ========= Fallback páginas (se você acessa /login.html etc) =========
// Se quiser, dá pra manter só estático. Aqui é só pra não quebrar URL.
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ========= Start =========
(async () => {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
    });
  } catch (e) {
    console.error("❌ Falha ao iniciar:", e);
    process.exit(1);
  }
})();
