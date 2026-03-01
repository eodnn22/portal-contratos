app.post('/buscar-contrato', (req, res) => {
    const { cpf } = req.body;

    const sqlUsuario = 'SELECT id FROM usuarios WHERE cpf = ?';

    db.query(sqlUsuario, [cpf], (err, usuarios) => {
        if (err) return res.status(500).json({ erro: err });

        if (usuarios.length === 0) {
            return res.json({ erro: 'Usuário não encontrado' });
        }

        const usuarioId = usuarios[0].id;

        const sqlContrato = 'SELECT arquivo FROM contratos WHERE usuario_id = ?';

        db.query(sqlContrato, [usuarioId], (err, contratos) => {
            if (err) return res.status(500).json({ erro: err });

            if (contratos.length === 0) {
                return res.json({ erro: 'Contrato não encontrado' });
            }

            res.json({ arquivo: contratos[0].arquivo });
        });
    });
});