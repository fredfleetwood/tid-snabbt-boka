# 🚗 Booking Automation System

## 🎯 Overview

A comprehensive driving test booking automation system that monitors Swedish Transport Administration (Trafikverket) for available driving test slots and automatically books them using browser automation. The system features real-time QR code generation for BankID authentication and multi-service architecture.

## 🏗️ System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐    ┌──────────────┐
│   Frontend      │    │   Supabase       │    │   VPS Server    │    │ Trafikverket │
│   (React/TS)    │◄──►│  Edge Functions  │◄──►│   (FastAPI)     │◄──►│   Website    │
│                 │    │                  │    │                 │    │              │
│ • Real-time UI  │    │ • Database       │    │ • Browser Auto  │    │ • Booking    │
│ • QR Display    │    │ • Auth           │    │ • QR Generation │    │ • BankID     │
│ • WebSocket     │    │ • Webhooks       │    │ • Redis Cache   │    │ • Validation │
└─────────────────┘    └──────────────────┘    └─────────────────┘    └──────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- Redis Server
- Supabase Account
- VPS Server (Ubuntu recommended)

### 1. Clone Repository
```bash
git clone <repository-url>
cd booking-automation-system
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Start services
uvicorn app.main_production:app --host 0.0.0.0 --port 8000
```

### 3. Frontend Setup  
```bash
cd frontend
npm install
npm run dev
```

### 4. Supabase Setup
```bash
cd frontend
npx supabase login
npx supabase functions deploy
```

## 📊 System Components

### 🖥️ Frontend (React/TypeScript)
- **Location**: `frontend/`
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **Key Features**:
  - Real-time booking status updates
  - QR code display with fallback mechanisms
  - WebSocket integration for live updates
  - Responsive UI with dark mode

**Key Files**:
- `src/services/vpsPollingService.ts` - QR polling and status updates
- `src/components/booking/` - Booking interface components
- `src/integrations/supabase/` - Supabase client integration

### ☁️ Supabase (Backend-as-a-Service)
- **Location**: `frontend/supabase/functions/`
- **Purpose**: Edge Functions, Database, Authentication, Real-time updates
- **Key Functions**:
  - `start-booking` - Initiates booking process
  - `qr-storage` - **CRITICAL**: QR code storage with VPS fallback
  - `vps-webhook` - Handles VPS status updates
  - `vps-proxy` - Proxy for VPS communication

**Critical Component - QR Storage**:
```typescript
// qr-storage with VPS Redis fallback
if (!databaseSession) {
  // Falls back to VPS endpoint: /api/v1/booking/{job_id}/qr
  const vpsResponse = await fetch(`http://87.106.247.92:8000/api/v1/booking/${job_id}/qr`)
}
```

### 🖱️ VPS Server (FastAPI + Browser Automation)
- **Location**: `backend/`
- **Framework**: FastAPI with Playwright
- **Purpose**: Browser automation, QR detection, Redis caching
- **Key Endpoints**:
  - `GET /health` - Health check
  - `POST /api/v1/booking/start` - Start booking automation
  - `GET /api/v1/booking/{job_id}/qr` - **CRITICAL**: QR code retrieval
  - `GET /api/v1/booking/status/{job_id}` - Job status

**Critical Component - QR Generation**:
```python
# Browser automation detects QR codes in real-time
# Stores in Redis: job:{job_id} 
# Returns: {"image_data": "data:image/png;base64,..."} 
```

### 🗄️ Database Schema (Supabase PostgreSQL)
- `booking_sessions` - Active booking sessions
- `booking_configs` - User booking configurations  
- `user_subscriptions` - Subscription management
- Real-time subscriptions for live updates

## 🔑 Critical QR System

> ⚠️ **WARNING**: The QR system is the most critical component. See [QR_SYSTEM_RULES.md](QR_SYSTEM_RULES.md) for detailed protection rules.

### QR Flow Architecture:
```
VPS Browser → QR Detection → Redis Storage → qr-storage Function → Frontend Display
     ↓              ↓             ↓              ↓                    ↓
  Playwright    DOM Watching   Cache Layer   VPS Fallback      qr_data Display
```

### Authentication Tokens:
- **VPS QR Endpoint**: `Bearer test-secret-token-12345`
- **Frontend→qr-storage**: Supabase anon key
- **qr-storage→VPS**: API secret (hardcoded)

## 🛠️ Development Workflow

### 1. Always Start with Monitoring
```bash
# REQUIRED before any development
./monitor.sh all
./monitor.sh test
```

### 2. Service-Specific Development

**Frontend Changes**:
```bash
cd frontend
npm run dev           # Development
npm run build         # Production build
git push origin main  # Trigger Lovable rebuild
```

**Backend Changes**:
```bash
cd backend
source venv/bin/activate
# Make changes
# Restart server:
uvicorn app.main_production:app --host 0.0.0.0 --port 8000
```

**Supabase Functions**:
```bash
cd frontend
npx supabase functions deploy <function-name>
# Deploys immediately - no rebuild needed
```

### 3. Testing Protocol

**Health Checks**:
```bash
curl http://87.106.247.92:8000/health
curl http://87.106.247.92:8082/vnc.html
redis-cli ping
```

**QR System Testing** (CRITICAL):
```bash
# Test VPS QR endpoint
curl http://87.106.247.92:8000/api/v1/booking/{job_id}/qr \
  -H "Authorization: Bearer test-secret-token-12345"

# Test qr-storage fallback
curl "https://kqemgnbqjrqepzkigfcx.supabase.co/functions/v1/qr-storage?job_id={job_id}" \
  -H "Authorization: Bearer {anon_key}"
```

## 🔧 Service Management

### Port Configuration:
- **8000**: VPS FastAPI Server
- **8082**: VNC Web Interface  
- **5999**: VNC Server (RFB)
- **6379**: Redis Server
- **3000/5173**: Frontend Development

### Essential Services:
```bash
# VPS Server
cd backend && source venv/bin/activate
uvicorn app.main_production:app --host 0.0.0.0 --port 8000

# VNC Server (for browser automation display)
Xvnc :99 -geometry 1024x768 -depth 24 -rfbport 5999 -desktop "BookingAutomation" -alwaysshared &

# VNC Web Interface
websockify --web=/usr/share/novnc 8082 127.0.0.1:5999 &

# Window Manager
export DISPLAY=:99 && fluxbox > /dev/null 2>&1 &
```

## 📊 Monitoring & Logging

### Real-time Monitoring:
```bash
./monitor.sh all     # Start all monitors
./monitor.sh test    # System health check
```

### Log Files:
- `/tmp/booking-monitor/app.log` - Application logs
- `/tmp/booking-monitor/browser.log` - Browser automation  
- `/tmp/booking-monitor/errors.log` - Error tracking
- `/tmp/booking-monitor/qr-complete.log` - QR system logs

### Key Monitoring Commands:
```bash
tail -f /tmp/booking-monitor/app.log | grep QR     # QR activity
grep -E "(📱|QR)" /tmp/booking-monitor/app.log     # QR detection
ps aux | grep -E "(uvicorn|Xvnc)" | grep -v grep  # Service status
```

## 🚨 Emergency Procedures

### System Recovery:
```bash
# Full restart
pkill -f uvicorn && pkill -f Xvnc && pkill -f websockify

# Start monitoring
./monitor.sh all

# Start services
cd backend && source venv/bin/activate
./start_all_services.sh  # If available, or run services manually
```

### QR System Recovery:
See [QR_SYSTEM_RULES.md](QR_SYSTEM_RULES.md) for detailed recovery procedures.

## 🔒 Security & Configuration

### Environment Variables:
```bash
# Supabase
SUPABASE_URL=https://kqemgnbqjrqepzkigfcx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# VPS  
VPS_API_SECRET=test-secret-token-12345
VPS_URL=http://87.106.247.92:8000

# Redis
REDIS_URL=redis://127.0.0.1:6379
```

### Access Control:
- Supabase RLS policies protect user data
- VPS API requires secret token
- Frontend uses anon key with user context

## 📚 Documentation

- [QR_SYSTEM_RULES.md](QR_SYSTEM_RULES.md) - **CRITICAL QR system protection**
- [.cursorrules](.cursorrules) - Development guidelines
- `backend/README.md` - Backend-specific docs
- `frontend/README.md` - Frontend-specific docs

## 🧪 Testing

### Unit Tests:
```bash
cd backend && python -m pytest
cd frontend && npm test
```

### Integration Tests:
```bash
# Test full booking flow
curl -X POST http://87.106.247.92:8000/api/v1/booking/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-secret-token-12345" \
  -d '{"job_id": "test-'$(date +%s)'", "config": {...}}'
```

### QR System Tests:
Run the test commands in [QR_SYSTEM_RULES.md](QR_SYSTEM_RULES.md) before any QR-related changes.

## 🚀 Deployment

### Frontend (Lovable):
1. Make changes locally
2. `npm run build` 
3. `git push origin main`
4. Wait for automatic Lovable rebuild

### Backend (VPS):
1. SSH to VPS server
2. Pull changes: `git pull origin main`
3. Restart services: `./restart_services.sh`

### Supabase Functions:
```bash
npx supabase functions deploy <function-name>
```

## 🐛 Common Issues & Solutions

### QR Codes Not Showing:
1. Check VPS server is running: `curl http://87.106.247.92:8000/health`
2. Verify QR endpoint: `curl http://87.106.247.92:8000/api/v1/booking/{job_id}/qr`
3. Test qr-storage fallback: See QR_SYSTEM_RULES.md
4. Check frontend console for "QR-FALLBACK" messages

### Browser Automation Issues:
1. Check VNC connection: `http://87.106.247.92:8082/vnc.html`
2. Verify display: `export DISPLAY=:99 && echo $DISPLAY`
3. Check browser processes: `ps aux | grep firefox`
4. Restart VNC: `pkill Xvnc && Xvnc :99 -geometry 1024x768 -depth 24 -rfbport 5999`

### Database Connection Issues:
1. Check Supabase status
2. Verify connection strings
3. Test RLS policies
4. Check user authentication

## 🤝 Contributing

### Before Making Changes:
1. Read [.cursorrules](.cursorrules) completely
2. Read [QR_SYSTEM_RULES.md](QR_SYSTEM_RULES.md) if touching QR system
3. Start monitoring: `./monitor.sh all`
4. Capture baseline: `./monitor.sh test`

### Development Guidelines:
- Always monitor first, code second
- Test individual services before integration
- Preserve QR system integrity
- Include log context in bug reports
- Follow the dependency chain

### Pull Request Checklist:
- [ ] Monitoring logs included
- [ ] QR system tested (if applicable)
- [ ] Integration tests pass
- [ ] Documentation updated
- [ ] No breaking changes to critical paths

## 📞 Support

For issues or questions:
1. Check logs first: `./monitor.sh test`
2. Review error logs: `tail /tmp/booking-monitor/errors.log`
3. Test individual components
4. Include monitoring output in reports

## 🏆 Success Metrics

The system is considered successful when:
- ✅ QR codes display consistently in frontend
- ✅ Browser automation completes bookings
- ✅ Real-time updates work reliably  
- ✅ All services pass health checks
- ✅ Users can authenticate with BankID seamlessly

---

**⚡ REMEMBER: The QR system is critical - see [QR_SYSTEM_RULES.md](QR_SYSTEM_RULES.md) before making ANY QR-related changes!** 