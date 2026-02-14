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

        // Validação de horário futuro
        if (dataAgendamento.getTime() <= agora.getTime()) {
            return res.status(400).json({ 
                error: "Horário inválido. Escolha um horário futuro!" 
            });
        }

        // --- INÍCIO DA TRAVA DE SEGURANÇA ---
        // Verifica se já existe um agendamento para o mesmo horário que não esteja cancelado
        const conflito = await pool.query(
            "SELECT id FROM agendamentos WHERE data_hora = $1 AND status != 'cancelado'",
            [data_hora]
        );

        if (conflito.rows.length > 0) {
            return res.status(400).json({ 
                error: "Poxa, esse horário acabou de ser preenchido! Escolha outro. ✂️" 
            });
        }
        // --- FIM DA TRAVA DE SEGURANÇA ---

        // Insere com status 'pendente' por padrão
        const novoAgendamento = await pool.query(
            "INSERT INTO agendamentos (usuario_id, data_hora, descricao, status) VALUES ($1, $2, $3, 'pendente') RETURNING *",
            [usuario_id, data_hora, descricao]
        );

        res.json(novoAgendamento.rows[0]);
    } catch (err) {
        console.error("Erro no backend:", err.message);
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
            `SELECT a.*, u.nome as cliente_nome, u.telefone as cliente_telefone 
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

// Rota para cancelar agendamento
router.delete('/cancelar/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const usuario_id = req.usuario.id; // Pega o ID do cliente logado

        // Busca o agendamento para verificar se pertence ao usuário e o horário
        const agendamento = await pool.query(
            "SELECT data_hora FROM agendamentos WHERE id = $1 AND usuario_id = $2",
            [id, usuario_id]
        );

        if (agendamento.rows.length === 0) {
            return res.status(404).json({ error: "Agendamento não encontrado." });
        }

        // Regra das 2 horas
        const agora = new Date();
        const horarioAgendado = new Date(agendamento.rows[0].data_hora);
        const diffEmHoras = (horarioAgendado - agora) / (1000 * 60 * 60);

        if (diffEmHoras < 2) {
            return res.status(400).json({ error: "Cancelamento permitido apenas com 2h de antecedência." });
        }

        await pool.query("DELETE FROM agendamentos WHERE id = $1", [id]);
        res.json({ mensagem: "Cancelado com sucesso!" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao cancelar agendamento." });
    }
});
module.exports = router;