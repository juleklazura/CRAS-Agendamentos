# 🔒 Guia de Segurança de Cookies e JWT Tokens

## 📋 Visão Geral

Este documento descreve as configurações de segurança implementadas para cookies e JWT tokens no sistema CRAS-Agendamentos.

---

## 🍪 Configuração de Cookies Seguros

### **Flags de Segurança Implementadas**

#### **1. httpOnly** ✅
- **O que é:** Impede acesso ao cookie via JavaScript
- **Protege contra:** Cross-Site Scripting (XSS)
- **Como funciona:** Cookie só é enviado em requisições HTTP, não é acessível via `document.cookie`
- **Status:** ✅ **IMPLEMENTADO**

```javascript
httpOnly: true  // Cookie invisível para JavaScript malicioso
```

#### **2. secure** ✅
- **O que é:** Cookie só é enviado via HTTPS
- **Protege contra:** Man-in-the-Middle (MITM) attacks
- **Como funciona:** Em produção, cookie só trafega em conexões criptografadas
- **Status:** ✅ **IMPLEMENTADO**

```javascript
secure: process.env.NODE_ENV === 'production'  // HTTPS apenas em produção
```

#### **3. sameSite** ✅
- **O que é:** Controla quando cookie é enviado em requisições cross-site
- **Protege contra:** Cross-Site Request Forgery (CSRF)
- **Valores possíveis:**
  - `strict`: Cookie nunca enviado em navegação cross-site (MAIS SEGURO)
  - `lax`: Cookie enviado em navegação GET top-level
  - `none`: Cookie sempre enviado (MENOS SEGURO - requer `secure: true`)
- **Status:** ✅ **IMPLEMENTADO** (strict)

```javascript
sameSite: 'strict'  // Proteção máxima contra CSRF
```

#### **4. maxAge** ✅
- **O que é:** Tempo de vida do cookie em milissegundos
- **Protege contra:** Tokens com vida útil indefinida
- **Como funciona:** Cookie expira automaticamente após o tempo definido
- **Status:** ✅ **IMPLEMENTADO**

```javascript
maxAge: 8 * 60 * 60 * 1000  // 8 horas para access token
maxAge: 7 * 24 * 60 * 60 * 1000  // 7 dias para refresh token
```

#### **5. path** ✅
- **O que é:** Limita onde o cookie é enviado
- **Protege contra:** Vazamento de tokens para endpoints não autorizados
- **Como funciona:** Cookie só é enviado para URLs que começam com o path definido
- **Status:** ✅ **IMPLEMENTADO**

```javascript
path: '/'  // Access token disponível em toda aplicação
path: '/api/auth/refresh'  // Refresh token APENAS no endpoint de refresh (mais seguro)
```

#### **6. domain** ✅
- **O que é:** Define domínio válido para o cookie
- **Protege contra:** Cookies sendo enviados para subdomínios não autorizados
- **Como funciona:** Cookie só é enviado para o domínio especificado
- **Status:** ✅ **IMPLEMENTADO** (configurável via .env)

```javascript
domain: process.env.COOKIE_DOMAIN || undefined  // Configurável por ambiente
```

---

## 🔐 Sistema de Tokens Dual (Access + Refresh)

### **Arquitetura Implementada**

```
┌─────────────────────────────────────────────────────────────┐
│                         LOGIN                                │
└─────────────────────────────────────────────────────────────┘
                              ↓
              ┌───────────────────────────────┐
              │  Credenciais Validadas        │
              └───────────────────────────────┘
                              ↓
         ┌────────────────────────────────────────┐
         │         Gerar 2 Tokens                 │
         └────────────────────────────────────────┘
                              ↓
              ┌───────────────┴────────────────┐
              │                                │
      ┌───────▼────────┐           ┌──────────▼─────────┐
      │ ACCESS TOKEN   │           │  REFRESH TOKEN     │
      │                │           │                    │
      │ • 8 horas      │           │ • 7 dias           │
      │ • Dados user   │           │ • Apenas ID        │
      │ • Path: /      │           │ • Path: /refresh   │
      │ • Cookie 1     │           │ • Cookie 2         │
      └────────────────┘           └────────────────────┘
```

### **1. Access Token (Token de Acesso)**

**Características:**
- ✅ **Vida curta:** 8 horas
- ✅ **Contém dados:** ID, role, CRAS, agenda
- ✅ **Cookie:** `token`
- ✅ **Path:** `/` (toda aplicação)
- ✅ **Uso:** Autenticação de requisições normais

**Payload:**
```json
{
  "id": "user_id",
  "role": "entrevistador",
  "cras": "cras_id",
  "agenda": "agenda_id",
  "type": "access",
  "iat": 1234567890,
  "exp": 1234596690
}
```

### **2. Refresh Token (Token de Renovação)**

**Características:**
- ✅ **Vida longa:** 7 dias
- ✅ **Contém apenas:** ID do usuário
- ✅ **Cookie:** `refreshToken`
- ✅ **Path:** `/api/auth/refresh` (RESTRITO!)
- ✅ **Uso:** Renovar access token expirado

**Payload:**
```json
{
  "id": "user_id",
  "type": "refresh",
  "iat": 1234567890,
  "exp": 1235172690
}
```

**Por que path restrito?**
- Refresh token é mais sensível (vida longa)
- Limitar path reduz superfície de ataque
- Mesmo se houver XSS, atacante não acessa refresh token em outras páginas

---

## 🔄 Fluxo de Autenticação

### **1. Login Inicial**

```
Cliente                     Servidor
   │                           │
   │──── POST /api/auth/login ─────→
   │     { matricula, senha }     │
   │                           │
   │                        ┌──┴──┐
   │                        │Validar│
   │                        │Creds│
   │                        └──┬──┘
   │                           │
   │                        ┌──▼───────┐
   │                        │Gerar     │
   │                        │2 Tokens  │
   │                        └──┬───────┘
   │                           │
   │←─── Set-Cookie: token ────┤
   │←─── Set-Cookie: refreshToken ──┤
   │←─── { user: {...} } ──────┤
   │                           │
```

### **2. Requisições Normais**

```
Cliente                     Servidor
   │                           │
   │──── GET /api/cras ────────→
   │     Cookie: token         │
   │                           │
   │                        ┌──┴──┐
   │                        │Validar│
   │                        │Token │
   │                        └──┬──┘
   │                           │
   │←─── { data: [...] } ──────┤
   │                           │
```

### **3. Renovação de Token**

```
Cliente                     Servidor
   │                           │
   │──── GET /api/dados ───────→
   │     Cookie: token (EXPIRADO)│
   │                           │
   │←─── 401 Unauthorized ─────┤
   │                           │
   │                           │
   │──── POST /api/auth/refresh ───→
   │     Cookie: refreshToken  │
   │                           │
   │                        ┌──┴────┐
   │                        │Validar │
   │                        │Refresh│
   │                        └──┬────┘
   │                           │
   │                        ┌──▼────┐
   │                        │Gerar  │
   │                        │Novo   │
   │                        │Access │
   │                        └──┬────┘
   │                           │
   │←─── Set-Cookie: token ────┤
   │←─── { user: {...} } ──────┤
   │                           │
   │                           │
   │──── GET /api/dados ───────→
   │     Cookie: token (NOVO)  │
   │                           │
   │←─── { data: [...] } ──────┤
   │                           │
```

---

## 🔑 Gerenciamento de Secrets

### **Requisitos de Segurança**

#### **Comprimento Mínimo**
- ✅ Desenvolvimento: **32 caracteres**
- ✅ Produção: **64 caracteres** (128 hex = 512 bits)

#### **Entropia**
- ✅ Gerado com `crypto.randomBytes(64)` (Node.js)
- ✅ Mínimo 16 caracteres únicos
- ✅ Distribuição aleatória uniforme

#### **Separação**
- ✅ `JWT_SECRET` ≠ `JWT_REFRESH_SECRET`
- ✅ Secrets diferentes para dev/staging/prod

### **Como Gerar Secrets Seguros**

#### **Método 1: Script Automático (Recomendado)**
```bash
node backend/scripts/generateSecrets.js
```

#### **Método 2: Node.js CLI**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### **Método 3: OpenSSL**
```bash
openssl rand -hex 64
```

### **Validação Automática**

O servidor valida os secrets na inicialização:

```
🔒 ========================================
   VALIDAÇÃO DE SEGURANÇA - JWT SECRETS
========================================

✅ Todos os secrets estão configurados corretamente!

========================================
```

Se houver problemas:

```
❌ ERROS CRÍTICOS ENCONTRADOS:

   ❌ JWT_SECRET muito curto (32 caracteres). Mínimo recomendado: 64 caracteres
   ❌ JWT_REFRESH_SECRET deve ser DIFERENTE do JWT_SECRET!

💡 COMO GERAR SECRETS SEGUROS:

   Node.js:
   $ node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

========================================

[SERVIDOR NÃO INICIARÁ ATÉ CORRIGIR]
```

---

## 📊 Comparação: Antes vs Depois

### **ANTES (Inseguro)** ❌

```javascript
// ❌ Cookie sem flags de segurança
res.cookie('token', token);
```

**Vulnerabilidades:**
- ❌ Acessível via JavaScript → XSS pode roubar token
- ❌ Enviado em HTTP não criptografado → MITM
- ❌ Enviado em requisições cross-site → CSRF
- ❌ Sem expiração → Token vive indefinidamente
- ❌ Disponível em toda aplicação → Superfície de ataque grande

### **DEPOIS (Seguro)** ✅

```javascript
// ✅ Cookie com todas as flags de segurança
res.cookie('token', accessToken, {
  httpOnly: true,                                // Protege contra XSS
  secure: process.env.NODE_ENV === 'production', // Protege contra MITM
  sameSite: 'strict',                            // Protege contra CSRF
  maxAge: 8 * 60 * 60 * 1000,                   // Expira em 8 horas
  path: '/',                                     // Escopo controlado
  domain: process.env.COOKIE_DOMAIN || undefined // Domain configurável
});

// ✅ Refresh token separado com path restrito
res.cookie('refreshToken', refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,              // 7 dias
  path: '/api/auth/refresh',                     // APENAS endpoint de refresh
  domain: process.env.COOKIE_DOMAIN || undefined
});
```

**Proteções:**
- ✅ **XSS:** Cookie invisível para JavaScript
- ✅ **MITM:** Apenas HTTPS em produção
- ✅ **CSRF:** sameSite=strict bloqueia cross-site
- ✅ **Token Theft:** Refresh token isolado
- ✅ **Longevidade:** Access token expira rápido (8h)
- ✅ **Persistência:** Refresh token permite renovação (7 dias)

---

## 🧪 Como Testar

### **1. Verificar Flags dos Cookies**

Abra DevTools (F12) → Application → Cookies:

```
Name: token
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Domain: localhost
Path: /
Expires: (8 horas)
Size: 250
HttpOnly: ✓  ← DEVE ESTAR MARCADO
Secure: ✓ (em produção)  ← DEVE ESTAR MARCADO
SameSite: Strict  ← DEVE SER STRICT
```

### **2. Testar Proteção XSS**

No console do navegador:

```javascript
// Tentar acessar cookie
document.cookie  // NÃO deve mostrar o token (httpOnly)
```

**Resultado esperado:**
```
""  // String vazia (cookie não acessível)
```

### **3. Testar Expiração**

```bash
# Fazer login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"matricula":"admin","senha":"senha123"}' \
  -c cookies.txt

# Aguardar 8 horas + 1 minuto

# Tentar acessar recurso protegido
curl -X GET http://localhost:5000/api/cras \
  -b cookies.txt

# Resultado esperado: 401 Unauthorized
```

### **4. Testar Refresh Token**

```bash
# Após access token expirar
curl -X POST http://localhost:5000/api/auth/refresh \
  -b cookies.txt \
  -c cookies_new.txt

# Resultado esperado: Novo access token em cookies_new.txt
```

---

## 🚀 Implementação em Produção

### **Checklist de Deploy**

- [ ] Gerar secrets fortes (64+ caracteres)
- [ ] Configurar `NODE_ENV=production`
- [ ] Configurar `COOKIE_DOMAIN` (se necessário)
- [ ] Habilitar HTTPS no servidor
- [ ] Configurar certificado SSL válido
- [ ] Testar cookies com `secure: true`
- [ ] Verificar CORS para domínio de produção
- [ ] Monitorar logs de autenticação
- [ ] Configurar rotação de secrets (semestral)
- [ ] Documentar secrets em cofre seguro

### **Variáveis de Ambiente Necessárias**

```bash
# backend/.env (PRODUÇÃO)
NODE_ENV=production
JWT_SECRET=<128_caracteres_hex_aleatorios>
JWT_REFRESH_SECRET=<128_caracteres_hex_aleatorios_DIFERENTES>
COOKIE_DOMAIN=seu-dominio.com
FRONTEND_URL=https://seu-dominio.com
```

---

## 📚 Referências

- [OWASP Cookie Security](https://owasp.org/www-community/controls/SecureCookieAttribute)
- [MDN: Using HTTP cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [RFC 6265: HTTP State Management Mechanism](https://datatracker.ietf.org/doc/html/rfc6265)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

**Última atualização:** 21 de novembro de 2025  
**Versão:** 2.0.0
