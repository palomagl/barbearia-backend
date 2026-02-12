const { Pool } = require('pg');
require('dotenv').config();

// Usamos a connectionString que é o link completo que você copiou
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // OBRIGATÓRIO para bancos na nuvem como o Neon
  }
});

// Mensagem atualizada para o console
pool.on('connect', () => {
  console.log('✅ Conectado ao banco de dados no Neon (Nuvem)!');
});

pool.on('error', (err) => {
  console.error('❌ Erro inesperado no cliente do banco:', err);
});

module.exports = pool;