const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/authMiddleware');

// 1. Rota para CLIENTE criar agendamento (usando /novo que você colocou no Front)
router.post('/novo', auth, async (req, res) => {
    try {
        const { descricao, data_hora } = req.body;
        const usuario_id = req.usuario.id;

        const dataAgendamento = new Date(data_hora);
        const agora = new Date();

        // Validação de horário
        if (dataAgendamento.getTime() <= agora.getTime()) {
            return res.status(400).json({ 
                error: "Horário inválido. Escolha um horário futuro!" 
            });
        }

        // Insere com status 'pendente' por padrão
        const novoAgendamento = await pool.query(
            "INSERT INTO agendamentos (usuario_id, data_hora, descricao, status) VALUES ($1, $2, $3, 'pendente') RETURNING *",
            [usuario_id, data_hora, descricao]
        );

        res.json(novoAgendamento.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Erro ao criar agendamento" });
    }
});

// 2. Rota para CLIENTE listar apenas os seus agendamentos
router.get('/listar', auth, async (req, res) => {
    try {
        const usuario_id = req.usuario.id;
        const result = await pool.query(
            "SELECT * FROM agendamentos WHERE usuario_id = $1 ORDER BY data_hora DESC",
            [usuario_id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Erro ao buscar seus agendamentos" });
    }
});

// 3. Rota para ADMIN ver a agenda de todos
router.get('/admin/todos', auth, async (req, res) => {
    try {
        if (req.usuario.cargo !== 'admin') {
            return res.status(403).json({ error: "Acesso negado." });
        }

        const result = await pool.query(
            `SELECT a.*, u.nome as cliente_nome 
             FROM agendamentos a 
             JOIN usuarios u ON a.usuario_id = u.id 
             ORDER BY a.data_hora ASC`
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Erro ao buscar agenda completa" });
    }
});

// 4. Rota para ADMIN marcar como concluído
router.patch('/concluir/:id', auth, async (req, res) => {
    try {
        if (req.usuario.cargo !== 'admin') {
            return res.status(403).json({ error: "Acesso negado!" });
        }

        const { id } = req.params;
        await pool.query(
            "UPDATE agendamentos SET status = 'concluido' WHERE id = $1",
            [id]
        );

        res.json({ mensagem: "Agendamento finalizado com sucesso!" });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Erro ao finalizar agendamento" });
    }
});

module.exports = router;