# Openband Backend - Docker Microservices

Backend escalável e modular para o Openband, mantendo o frontend **100% offline-first**.

## 🏗️ Arquitetura

```
openband-backend/
├── docker-compose.yml          # Orquestração de todos os serviços
├── .env.example                # Variáveis de ambiente
└── services/
    ├── collaboration/          # WebSocket & CRDT Sync (porta 8001)
    ├── ai-separation/          # FastAPI + Celery (porta 8002)
    └── project-backup/         # Presigned URLs para S3/R2 (porta 8003)
```

## 🚀 Como rodar

```bash
# 1. Copiar variáveis de ambiente
cp .env.example .env

# 2. Subir todos os serviços
docker compose up --build

# 3. Verificar saúde dos serviços
curl http://localhost:8001/health  # Colaboração
curl http://localhost:8002/docs    # AI Stem Separation
curl http://localhost:8003/docs    # Project Backup
```

## 📡 Serviços

### Collaboration Service (`:8001`)
- WebSocket por sala de projeto
- Retransmite alterações de áudio/cifras em tempo real
- Documentação: http://localhost:8001/docs

### AI Separation Service (`:8002`)
- API assíncrona para separação de stems (Demucs)
- Celery worker para processamento em background
- Documentação: http://localhost:8002/docs

### Project Backup Service (`:8003`)
- Geração de presigned URLs para S3/R2/MinIO
- Upload direto do cliente para Object Storage
- Documentação: http://localhost:8003/docs

## 🧹 Limpar

```bash
docker compose down --volumes --rmi local
```
