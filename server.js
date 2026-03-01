// server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'troque_essa_chave';

app.use(cors());
app.use(express.json({ limit: '20mb' })); // para assinatura base64
app.use(express.urlencoded({ extended: true }));

// -------------------------
// Pastas estáticas
// -------------------------
const publicDir = path.join(__dirname, 'public');
const uploadsDir = path.join(__dirname, 'uploads');
const contratosDir = path.join(uploadsDir, 'contratos');
const assinaturasDir = path.join(uploadsDir, 'assinaturas');

for (const dir of [uploadsDir, contratosDir, assinaturasDir]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

app.use(express.static(publicDir));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// -------------------------
// MySQL
// -------------------------
let db;

async function connectDB() {
  db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'escola',
  });

  console.log('MySQL conectado ✅');
  await ensureSchema();
  console.log('Schema OK ✅');
}

// cria tabela e colunas necessárias
async function ensureSchema() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nome VARCHAR(120) NOT NULL,
      email VARCHAR(120) NOT NULL UNIQUE,
      cpf VARCHAR(20) NOT NULL UNIQUE,
      senha VARCHAR(255) NOT NULL,
      tipo ENUM('admin','aluno') NOT NULL DEFAULT 'aluno',
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // adiciona colunas se não existirem (compatível com MySQL antigo)
  const cols = await db.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios'
  `);

  const existing = new Set(cols[0].map(r => r.COLUMN_NAME));

  async function addCol(sql, colName) {
    if (!existing.has(colName)) {
      await db.execute(sql);
      existing.add(colName);
    }
  }

  await addCol(`ALTER TABLE usuarios ADD COLUMN contrato_arquivo VARCHAR(255) NULL`, 'contrato_arquivo');
  await addCol(`ALTER TABLE usuarios ADD COLUMN assinatura_arquivo VARCHAR(255) NULL`, 'assinatura_arquivo');
  await addCol(`ALTER TABLE usuarios ADD COLUMN assinado_em DATETIME NULL`, 'assinado_em');
}

// -------------------------
// Auth helpers
// -------------------------
function signToken(user) {
  return jwt.sign(
    { id: user.id, tipo: user.tipo, email: user.email, nome: user.nome },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function authRequired(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ erro: 'Sem token' });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ erro: 'Token inválido' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.tipo !== 'admin') return res.status(403).json({ erro: 'Acesso negado' });
  next();
}

function requireAluno(req, res, next) {
  if (req.user?.tipo !== 'aluno') return res.status(403).json({ erro: 'Acesso negado' });
  next();
}

// -------------------------
// Multer (upload contrato PDF)
// -------------------------
const contratoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, contratosDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '.pdf').toLowerCase() || '.pdf';
    cb(null, `contrato_${req.params.id}_${Date.now()}${ext}`);
  }
});
const uploadContrato = multer({
  storage: contratoStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') return cb(new Error('Apenas PDF'));
    cb(null, true);
  }
});

// -------------------------
// ROTAS AUTH
// -------------------------
app.post('/api/auth/register', async (req, res) => {
  try {
    const { nome, email, cpf, senha, tipo } = req.body;

    if (!nome || !email || !cpf || !senha) {
      return res.status(400).json({ erro: 'Preencha nome, email, cpf e senha' });
    }

    const hash = await bcrypt.hash(String(senha), 10);

    await db.execute(
      `INSERT INTO usuarios (nome, email, cpf, senha, tipo) VALUES (?, ?, ?, ?, ?)`,
      [nome, email, cpf, hash, (tipo === 'admin' ? 'admin' : 'aluno')]
    );

    return res.json({ mensagem: 'Conta criada ✅' });
  } catch (e) {
    // duplicado
    if (String(e?.message || '').includes('Duplicate')) {
      return res.status(400).json({ erro: 'Email ou CPF já cadastrado' });
    }
    console.error(e);
    return res.status(500).json({ erro: 'Erro ao cadastrar' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ erro: 'Informe email e senha' });

    const [rows] = await db.execute(`SELECT * FROM usuarios WHERE email = ? LIMIT 1`, [email]);
    const user = rows[0];
    if (!user) return res.status(400).json({ erro: 'Credenciais inválidas' });

    const ok = await bcrypt.compare(String(senha), String(user.senha));
    if (!ok) return res.status(400).json({ erro: 'Credenciais inválidas' });

    const token = signToken(user);
    return res.json({
      token,
      usuario: { id: user.id, nome: user.nome, email: user.email, cpf: user.cpf, tipo: user.tipo }
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: 'Erro ao logar' });
  }
});

// -------------------------
// ADMIN: listar usuários
// (já manda URLs prontas)
// -------------------------
app.get('/api/admin/alunos', authRequired, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT id, nome, email, cpf, tipo, criado_em,
             contrato_arquivo, assinatura_arquivo, assinado_em
      FROM usuarios
      ORDER BY id DESC
    `);

    const mapped = rows.map(u => ({
      ...u,
      contratoUrl: u.contrato_arquivo ? `/uploads/contratos/${u.contrato_arquivo}` : null,
      assinaturaUrl: u.assinatura_arquivo ? `/uploads/assinaturas/${u.assinatura_arquivo}` : null
    }));

    res.json(mapped);
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao listar usuários' });
  }
});

// ADMIN: anexar contrato
app.post('/api/admin/contratos/:id', authRequired, requireAdmin, uploadContrato.single('arquivo'), async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!req.file) return res.status(400).json({ erro: 'Envie um PDF' });

    // pega contrato antigo pra apagar (opcional)
    const [oldRows] = await db.execute(`SELECT contrato_arquivo FROM usuarios WHERE id = ?`, [userId]);
    const old = oldRows[0]?.contrato_arquivo;

    await db.execute(`UPDATE usuarios SET contrato_arquivo = ? WHERE id = ?`, [req.file.filename, userId]);

    if (old) {
      const p = path.join(contratosDir, old);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }

    res.json({ mensagem: 'Contrato anexado ✅', arquivo: req.file.filename });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao anexar contrato' });
  }
});

// ADMIN: liberar nova assinatura (reset)
app.post('/api/admin/assinaturas/:id/reset', authRequired, requireAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.id);

    const [rows] = await db.execute(`SELECT assinatura_arquivo FROM usuarios WHERE id = ?`, [userId]);
    const old = rows[0]?.assinatura_arquivo;

    await db.execute(`UPDATE usuarios SET assinatura_arquivo = NULL, assinado_em = NULL WHERE id = ?`, [userId]);

    if (old) {
      const p = path.join(assinaturasDir, old);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }

    res.json({ mensagem: 'Assinatura liberada ✅' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao resetar assinatura' });
  }
});

// -------------------------
// ALUNO: status do contrato (para portal)
// -------------------------
app.get('/api/me/status-contrato', authRequired, requireAluno, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT id, contrato_arquivo, assinatura_arquivo, assinado_em
      FROM usuarios
      WHERE id = ?
      LIMIT 1
    `, [req.user.id]);

    const u = rows[0];
    if (!u) return res.status(404).json({ erro: 'Usuário não encontrado' });

    const base = `${req.protocol}://${req.get('host')}`;

    const contratoUrl = u.contrato_arquivo ? `${base}/uploads/contratos/${u.contrato_arquivo}` : null;
    const assinaturaUrl = u.assinatura_arquivo ? `${base}/uploads/assinaturas/${u.assinatura_arquivo}` : null;

    res.json({
      contratoUrl,
      assinaturaUrl,
      assinadoEm: u.assinado_em,
      podeAssinar: !!contratoUrl && !assinaturaUrl
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao buscar status do contrato' });
  }
});

// ALUNO: salvar assinatura (base64 do canvas)
app.post('/api/me/assinar', authRequired, requireAluno, async (req, res) => {
  try {
    const { dataUrl } = req.body;
    if (!dataUrl || !String(dataUrl).startsWith('data:image/png;base64,')) {
      return res.status(400).json({ erro: 'Assinatura inválida' });
    }

    // garante que tem contrato e ainda não assinou
    const [rows] = await db.execute(`
      SELECT contrato_arquivo, assinatura_arquivo
      FROM usuarios
      WHERE id = ?
      LIMIT 1
    `, [req.user.id]);

    const u = rows[0];
    if (!u?.contrato_arquivo) return res.status(400).json({ erro: 'Sem contrato anexado' });
    if (u?.assinatura_arquivo) return res.status(400).json({ erro: 'Você já assinou' });

    const base64 = String(dataUrl).split(',')[1];
    const buffer = Buffer.from(base64, 'base64');

    const filename = `assinatura_${req.user.id}_${Date.now()}.png`;
    const filepath = path.join(assinaturasDir, filename);
    fs.writeFileSync(filepath, buffer);

    await db.execute(`
      UPDATE usuarios
      SET assinatura_arquivo = ?, assinado_em = NOW()
      WHERE id = ?
    `, [filename, req.user.id]);

    res.json({
      mensagem: 'Assinatura salva ✅',
      assinaturaUrl: `/uploads/assinaturas/${filename}`
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao assinar' });
  }
});

// health
app.get('/api/health', (req, res) => res.json({ ok: true }));

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor rodando em http://localhost:${PORT} ✅`);
    });
  })
  .catch(err => {
    console.error('Falha ao conectar MySQL:', err);
    process.exit(1);
  });