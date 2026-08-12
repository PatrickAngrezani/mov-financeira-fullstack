process.env['NODE_ENV'] = 'test';
process.env['DATABASE_URL'] ??=
  'postgresql://postgres:postgres@localhost:5432/mov_financeira?schema=public';
process.env['JWT_SECRET'] ??= 'segredo-de-teste-e2e-com-mais-de-32-caracteres';
process.env['JWT_EXPIRES_IN'] ??= '1h';
process.env['LOG_LEVEL'] ??= 'error';
process.env['SWAGGER_ENABLED'] ??= 'false';
