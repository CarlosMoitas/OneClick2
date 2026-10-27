curl -X POST http://localhost:3000/jornadas/abertura-contas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_JWT" \
  -d '{"environment":"TU","agency":"3995","username":"m627529"}'