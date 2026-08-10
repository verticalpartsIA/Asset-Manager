const express = require("express");
const path = require("path");

const app = express();

app.use(express.static("public"));

// Apenas para desenvolvimento local (`node server.js`). Em produção o app é
// servido como site ESTÁTICO na hospedagem compartilhada Hostinger (sem Node),
// direto do public_html — ver .github/workflows/deploy-hostinger.yml.
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// O Passenger (Hostinger) injeta a porta via process.env.PORT. Em local,
// cai no 3000. Sem isso, a app não sobe no servidor de produção.
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});