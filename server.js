const express = require("express");
const path = require("path");

const app = express();

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "Asset Manager.html"));
});

// O Passenger (Hostinger) injeta a porta via process.env.PORT. Em local,
// cai no 3000. Sem isso, a app não sobe no servidor de produção.
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});