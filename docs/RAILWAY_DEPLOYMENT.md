# Railway Deployment Rehberi - AmbarHub

Bu rehber, AmbarHub projesinin Railway'e deploy edilmesini açıklar.

## Proje Yapısı

```
ambarhub/
├── apps/
│   ├── api/          # NestJS API (Port 3001)
│   └── web/          # Next.js Frontend (Port 3000)
├── packages/         # Shared packages
└── docker-compose.yml
```

---

## 1. Railway Projesi Oluşturma

1. [railway.app](https://railway.app) adresine git
2. **New Project** → **Deploy from GitHub repo** seç
3. `ambar-hub` reposunu bağla

---

## 2. Servis Yapılandırması

Railway'de **3 servis** oluşturman gerekiyor:

### A. PostgreSQL/MySQL Database

1. **+ New** → **Database** → **MySQL** seç
2. Oluşturulan database'in connection string'ini kopyala

### B. API Servisi

1. **+ New** → **GitHub Repo** → **Root directory boş bırak** (proje kökü)
2. **Settings:**
   - **Root Directory:** `/` (boş bırak)
   - **Config Path:** `railway-api.toml`

3. **Variables** (Environment Variables):

```env
# Database
DATABASE_URL=mysql://user:pass@host:port/db
DATABASE_HOST=...
DATABASE_PORT=3306
DATABASE_USER=...
DATABASE_PASSWORD=...
DATABASE_NAME=...

# JWT
JWT_SECRET=your-super-secret-key

# Integrations (isteğe bağlı)
ARAS_USERNAME=...
ARAS_PASSWORD=...
ARAS_CUSTOMER_CODE=...

# Uyumsoft (isteğe bağlı)
UYUMSOFT_URL=...
UYUMSOFT_API_TOKEN=...
```

### C. Web Servisi

1. **+ New** → **GitHub Repo** → **Root directory boş bırak** (proje kökü)
2. **Settings:**
   - **Root Directory:** `/` (boş bırak)
   - **Config Path:** `railway-web.toml`

3. **Variables:**

```env
NEXT_PUBLIC_API_URL=https://api-xxx.up.railway.app
```

---

## 3. Monorepo Yapılandırması (Önemli!)

Mevcut Dockerfile'lar tek başına çalışmak için yapılmış. Railway'de monorepo için daha iyi bir yaklaşım:

### Option A: Nixpacks (Önerilen)

Railway Nixpacks ile otomatik build yapar. Her servis için:

**API için `apps/api/railway.json`:**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run start:prod",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

**Web için `apps/web/railway.json`:**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run start",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

### Option B: Root'dan Dockerfile ile

Root dizinde tek bir Dockerfile kullanıp `--target` ile build edebilirsiniz.

---

## 4. Domain Yapılandırması

1. Her servis için **Settings** → **Networking** → **Generate Domain**
2. Custom domain eklemek için: **Add Custom Domain**

---

## 5. Migration Çalıştırma

Deploy sonrası migration için Railway CLI kullan:

```bash
# Railway CLI kur
npm i -g @railway/cli

# Login
railway login

# Projeye bağlan
railway link

# Migration çalıştır
railway run npm run migration:run --filter=@repo/api
```

---

## Hızlı Checklist

- [ ] Railway hesabı oluştur
- [ ] GitHub repo bağla
- [ ] MySQL database oluştur
- [ ] API servisi oluştur (apps/api)
- [ ] Web servisi oluştur (apps/web)
- [ ] Environment variables ekle
- [ ] Domain oluştur
- [ ] Migration çalıştır
- [ ] Test et

---

## Troubleshooting

| Sorun | Çözüm |
|-------|-------|
| Build hatası | Root directory doğru mu kontrol et |
| DB bağlantı hatası | DATABASE_URL formatını kontrol et |
| API'ye erişilemiyor | Port 3001 expose edilmiş mi? |
| CORS hatası | API'de CORS origin ayarla |
