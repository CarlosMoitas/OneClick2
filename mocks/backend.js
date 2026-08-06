const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

// CORS liberado para uso local sem restricao de origem.
app.use(function (req, res, next) {
  const origin = req.header('origin');
  const requestedHeaders = req.header('access-control-request-headers');

  if (origin) {
    // Com withCredentials=true, o origin nao pode ser '*'.
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
  }

  res.header('Access-Control-Allow-Credentials', 'true');
  res.header(
    'Access-Control-Allow-Headers',
    requestedHeaders ||
    'Origin, X-Requested-With, Content-Type, Accept, x-brad-soversion, x-brad-technology, x-brad-appversion, x-brad-geolocalizacao, x-brad-devicetype, x-csrf-token',
  );
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200); // Preflight request
  }

  next();
});

app.use(function (req, res, next) {
  console.log(req.method + ' ' + req.url);
  next();
});

function hasSessionCookie(cookieHeader) {
  if (!cookieHeader) {
    return false;
  }

  // Aceita cookies no formato PREFIX-SESSIONID=<valor>, com prefixo obrigatorio.
  return /(?:^|;\s*)[A-Za-z0-9]+-SESSIONID=/.test(cookieHeader);
}

app.use('/bff-canais', function (req, res, next) {
  const csrfToken = req.header('x-csrf-token');
  const cookieHeader = req.header('cookie');
  const missing = [];

  if (!csrfToken) {
    missing.push('header x-csrf-token');
  }

  if (!hasSessionCookie(cookieHeader)) {
    missing.push('cookie no formato MOCK-SESSIONID');
  }

  if (missing.length > 0) {
    return res.status(401).json({
      mock: true,
      error: 'unauthorized',
      message: "Requisicao negada pelo mock por falta de credenciais esperadas." +
        "Para teste do mock, rode no console os comandos: " +
        "document.cookie = 'MOCK-SESSIONID=mock-session-id';" +
        "document.cookie = 'MOCK-CSRF-TOKEN=mock-csrf-token';",
      missing,
    });
  }

  next();
});

// Exemplo unico de GET em rota BFF.
// Ajuste ou adicione novas rotas conforme necessidade de teste do mock.
app.get('/bff-canais/:produto/:versao/:canal/*recurso', function (req, res) {
  delay = 1000; // 1 segundo de delay
  setTimeout(() => {
    res.status(200).json([
      {
        id: 1,
        descricao: 'Item A',
        canal: req.params.canal,
        data: new Date().toISOString(),
        valor: 100.67,
      },
      {
        id: 2,
        descricao: 'Item B',
        canal: req.params.canal,
        data: new Date().toISOString(),
        valor: 250,
      },
    ]);
  }, delay);
});

app.listen(port, function () {
  console.log('Mock server is running on port ' + port);
});
