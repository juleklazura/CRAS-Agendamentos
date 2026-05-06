/**
 * Aplica timeout de 30s em requisições e respostas.
 * Previne que requisições presas (ex: query Neon em cold start) ocupem slots indefinidamente.
 * Retorna 408 se a resposta não foi enviada dentro do prazo.
 */

import logger, { pseudonymizeIp } from '../utils/logger.js';

const TIMEOUT_MS = 30000;

export const timeoutMiddleware = (req, res, next) => {
  req.setTimeout(TIMEOUT_MS, () => {
    logger.warn(`Timeout de requisição: ${req.method} ${req.path} — IP: ${pseudonymizeIp(req.ip)}`);
  });
  
  res.setTimeout(TIMEOUT_MS, () => {
    if (!res.headersSent) {
      logger.error(`Timeout de resposta: ${req.method} ${req.path} — IP: ${pseudonymizeIp(req.ip)}`);
      res.status(408).json({ error: 'Tempo de requisição excedido' });
    }
  });
  
  next();
};
