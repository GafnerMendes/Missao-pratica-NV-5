const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(bodyParser.json());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  next();
});

const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "abacate";

let users = [];
let contracts = [];

try {
  const usersPath = path.join(__dirname, "database", "users.json");
  const contractsPath = path.join(__dirname, "database", "contracts.json");

  const usersData = fs.readFileSync(usersPath, "utf8");
  users = JSON.parse(usersData);

  const contractsData = fs.readFileSync(contractsPath, "utf8");
  contracts = JSON.parse(contractsData);
} catch (err) {}

function doLogin(credentials) {
  return users.find(
    (user) =>
      user.username === credentials.username &&
      user.password === credentials.password
  );
}

function generateToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    perfil: user.perfil,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
}

function getContracts(empresa, inicio) {
  const filterEmpresa = String(empresa || "")
    .trim()
    .toLowerCase();
  const filterInicio = String(inicio || "").trim();

  let results = contracts;
  if (filterEmpresa) {
    results = results.filter((contract) =>
      contract.empresa.toLowerCase().includes(filterEmpresa)
    );
  }
  if (filterInicio) {
    results = results.filter((contract) => contract.inicio === filterInicio);
  }
  return results;
}

const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    if (!token) {
      return res
        .status(401)
        .json({ message: "O token de acesso está faltando ou está errado." });
    }
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        if (err.name === "TokenExpiredError") {
          return res.status(401).json({ message: "Token expirado" });
        }
        return res.status(403).json({ message: "Proibido: Token inválido" });
      }
      req.user = user;
      next();
    });
  } else {
    res
      .status(401)
      .json({ message: "Não autorizado: Cabeçalho de autorização ausente" });
  }
};

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (
      !req.user ||
      !req.user.perfil ||
      !allowedRoles.includes(req.user.perfil)
    ) {
      return res
        .status(403)
        .json({ message: "Proibido: Permissões insuficientes" });
    }
    next();
  };
};

app.post("/api/auth/login", (req, res) => {
  const credentials = req.body;
  const userData = doLogin(credentials);

  if (userData) {
    const token = generateToken(userData);
    res.json({
      token: token,
      user: {
        id: userData.id,
        username: userData.username,
        perfil: userData.perfil,
      },
    });
  } else {
    res.status(401).json({ message: "Usuário ou senha inválidos" });
  }
});

app.get("/api/auth/me", authenticateJWT, (req, res) => {
  const loggedInUser = users.find((u) => u.id === req.user.id);
  if (loggedInUser) {
    res.json({
      id: loggedInUser.id,
      username: loggedInUser.username,
      email: loggedInUser.email,
      perfil: loggedInUser.perfil,
    });
  } else {
    res.status(404).json({ message: "Usuário não encontrado" });
  }
});

app.get("/api/users", authenticateJWT, authorizeRoles("admin"), (req, res) => {
  const allUsersSanitized = users.map((u) => ({
    id: u.id,
    username: u.username,
    email: u.email,
    perfil: u.perfil,
  }));
  res.status(200).json({ data: allUsersSanitized });
});

app.get("/api/contracts", authenticateJWT, (req, res) => {
  const { empresa, inicio } = req.query;
  const result = getContracts(empresa, inicio);

  if (result && result.length > 0) {
    res.status(200).json({ data: result });
  } else {
    res.status(404).json({
      data: [],
      message: "Nenhum contrato encontrado que corresponda aos seus critérios.",
    });
  }
});

app.listen(port, () => {
  console.log(`Server está aberto na porta: ${port}`);
});
