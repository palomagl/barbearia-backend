const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const token = req.header('Authorization');

    if (!token) return res.status(401).json({ error: "Acesso negado!" });

    try {
        const tokenLimpo = token.replace('Bearer ', '');
        const verificado = jwt.verify(tokenLimpo, process.env.JWT_SECRET);
        req.usuario = verificado; // Aqui o ID do usuário fica salvo na requisição
        next();
    } catch (err) {
        res.status(400).json({ error: "Token inválido!" });
    }
};