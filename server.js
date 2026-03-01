require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 8080;

// 🔹 Conexão com Railway
const pool = mysql.createPool(process.env.MYSQL_URL || process.env.DATABASE_URL);

// 🔹 Criar tabela automaticamente
async function initDatabase() {
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nome VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            cpf VARCHAR(20),
            senha_hash VARCHAR(255) NOT NULL,
            tipo VARCHAR(10) NOT NULL DEFAULT 'aluno'
        )
    `);

    console.log("Tabela 'usuarios' OK");

    // 🔥 Criar admin fixo se não existir
    const [admin] = await pool.execute(
        "SELECT * FROM usuarios WHERE email = ?",
        ['admin01@escola.com']
    );

    if (admin.length === 0) {
        const hash = await bcrypt.hash('123456', 10);

        await pool.execute(
            "INSERT INTO usuarios (nome, email, cpf, senha_hash, tipo) VALUES (?, ?, ?, ?, ?)",
            ['Admin Escola', 'admin01@escola.com', '00000000000', hash, 'admin']
        );

        console.log("Admin criado: admin01@escola.com / senha: 123456");
    }
}

initDatabase();


// 🔹 REGISTER
app.post('/api/register', async (req, res) => {
    try {
        const { nome, email, cpf, senha } = req.body;

        const hash = await bcrypt.hash(senha, 10);

        await pool.execute(
            "INSERT INTO usuarios (nome, email, cpf, senha_hash, tipo) VALUES (?, ?, ?, ?, 'aluno')",
            [nome, email, cpf, hash]
        );

        res.json({ success: true });

    } catch (error) {
        console.error("REGISTER ERROR:", error);
        res.status(500).json({ error: 'Erro ao cadastrar' });
    }
});


// 🔹 LOGIN
app.post('/api/login', async (req, res) => {
    try {
        const { email, senha } = req.body;

        const [rows] = await pool.execute(
            "SELECT * FROM usuarios WHERE email = ?",
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const user = rows[0];

        const senhaValida = await bcrypt.compare(senha, user.senha_hash);

        if (!senhaValida) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                nome: user.nome,
                email: user.email,
                tipo: user.tipo
            }
        });

    } catch (error) {
        console.error("LOGIN ERROR:", error);
        res.status(500).json({ error: 'Erro no login' });
    }
});


// 🔹 Servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
