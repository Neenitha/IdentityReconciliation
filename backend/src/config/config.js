const {value: envVars, error } = envVarsSchema.prefs({errors: {label: 'key'}}).validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const config = {
  NODE_ENV: envVars.NODE_ENV,
  PORT: envVars.PORT,
  POSTGRES_URL: envVars.POSTGRES_URL,
}

module.exports = config;
