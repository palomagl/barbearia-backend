const express = require('express');
const cors = require('cors');
const pool = require('./db');
const authRoutes = require('./routes/auth');
const agendamentoRoutes = require('./routes/agendamentos');
require('dotenv').config();


const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/agendamentos', agendamentoRoutes);

// Rota de Teste
app.get('/', async (req, res) => {
  try {
    // Faz uma pergunta boba pro banco só pra ver se ele responde
    const result = await pool.query('SELECT NOW()');
    res.json({ 
      mensagem: "API do Full Stack Real rodando!", 
      banco_dados: "Conectado",
      hora_no_banco: result.rows[0].now 
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao conectar no banco", detalhes: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});