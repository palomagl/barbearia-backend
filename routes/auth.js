const jwt = require('jsonwebtoken');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../db');

// Rota de Cadastro
router.post('/register', async (req, res) => {
    try {
        const { nome, email, senha, telefone } = req.body;

        if (!nome || !email || !senha) {
            return res.status(400).json({ error: "Preencha todos os campos!" });
        }

        const saltRounds = 10;
        const senhaCriptografada = await bcrypt.hash(senha, saltRounds);

        // Adicionei o 'user' aqui para garantir que ele caia na Dashboard de Cliente
        const novoUsuario = await pool.query(
            "INSERT INTO usuarios (nome, email, senha, cargo, telefone) VALUES ($1, $2, $3, 'user', $4) RETURNING *",
            [nome, email, senhaCriptografada, telefone] // <-- Adicionamos o telefone aqui no final
        );

        res.status(201).json({ 
            mensagem: "Usuário criado com sucesso!",
            usuario: { 
                id: novoUsuario.rows[0].id, 
                nome: novoUsuario.rows[0].nome, 
                email: novoUsuario.rows[0].email 
            } 
        });

    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ error: "Este email já está cadastrado!" });
        }
        console.error(err);
        res.status(500).json({ error: "Erro no servidor" });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, senha } = req.body;

        // 1. Buscar usuário pelo email
        const usuario = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email]);

        if (usuario.rows.length === 0) {
            return res.status(401).json({ error: "Email ou senha incorretos!" });
        }

        // 2. Verificar se a senha bate (usando bcrypt)
        const senhaValida = await bcrypt.compare(senha, usuario.rows[0].senha);

        if (!senhaValida) {
            return res.status(401).json({ error: "Email ou senha incorretos!" });
        }

        // 3. Gerar o Token JWT
        const token = jwt.sign(
            { id: usuario.rows[0].id, cargo: usuario.rows[0].cargo },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ 
            mensagem: "Login realizado!", 
            token,
            usuario: {
                id: usuario.rows[0].id,
                nome: usuario.rows[0].nome,
                cargo: usuario.rows[0].cargo
            }
        });

    } catch (err) {
        res.status(500).json({ error: "Erro no servidor" });
    }
});

module.exports = router;