# 🚨 ULTRA-CRITICAL QR SYSTEM ARCHITECTURE 

## ⚡ NEVER BREAK THIS SYSTEM - IT TOOK HOURS TO FIX!

### Working QR Flow (DO NOT MODIFY WITHOUT EXTREME CAUTION):
```
VPS Browser Automation → Redis QR Storage → qr-storage Edge Function → Frontend Fallback
                      ↓                    ↓                         ↓
                 QR Detection        VPS Redis Fallback      qr_data Display
                 image_data          /api/v1/booking/{job}/qr    Real-time Updates
```

## 🔒 QR SYSTEM PROTECTED COMPONENTS

### 1. VPS QR API Endpoint (CRITICAL - DO NOT CHANGE):
- **URL**: `/api/v1/booking/{job_id}/qr` 
- **Method**: GET
- **Auth**: `Bearer test-secret-token-12345`
- **Response**: `{"job_id": "...", "image_data": "data:image/png;base64,...", "timestamp": "..."}`

### 2. qr-storage Edge Function (CRITICAL - WORKING PERFECTLY):
- **GET Path**: `/functions/v1/qr-storage?job_id={job_id}`
- **VPS Fallback**: Uses correct endpoint `/api/v1/booking/{job_id}/qr`
- **Auth Handling**: Anon key for frontend, API secret for VPS
- **Response Format**: `{"success": true, "qr_data": "...", "storage_method": "vps_redis_fallback"}`

### 3. Frontend QR Fallback (CRITICAL - WORKING):
- **Primary**: `data.qr_url` (Supabase Storage)
- **Fallback**: `data.qr_data` (Direct from VPS via qr-storage)
- **Implementation**: `vpsPollingService.ts` - ALL THREE polling methods have fallback

## 🚨 QR SYSTEM RULES - NEVER VIOLATE:

1. **NEVER change VPS QR endpoint URL or auth token**
2. **NEVER remove qr_data fallback from frontend** 
3. **NEVER modify qr-storage VPS fallback logic**
4. **NEVER change JSON field mappings** (`image_data` vs `qr_image_data`)
5. **ALWAYS test with actual running VPS jobs before deployment**

## 🔥 QR SYSTEM SUCCESS SECRETS (LEARNED THE HARD WAY)

### Authentication Token Management:
- **VPS QR Endpoint**: Requires `Bearer test-secret-token-12345`
- **Frontend to qr-storage**: Uses anon key
- **qr-storage to VPS**: Uses API secret (hardcoded in function)

### JSON Field Mapping:
- **VPS Response**: `image_data` field
- **qr-storage Response**: `qr_data` field  
- **Frontend Check**: Both `qr_url` and `qr_data`

### Cache & Deployment:
- **Frontend changes**: Need `npm run build` + GitHub push + Lovable rebuild
- **Edge functions**: Deploy immediately with `npx supabase functions deploy`
- **VPS changes**: Restart uvicorn server

### Split-Brain Detection:
- **VPS Running**: Check Redis keys and logs
- **Database Missing**: Sessions may not exist in Supabase
- **Solution**: qr-storage VPS fallback bypasses database dependency

## 🧪 QR SYSTEM TESTING PROTOCOL

### Before Making ANY QR-Related Changes:

1. **Test VPS QR Endpoint**:
```bash
curl http://87.106.247.92:8000/api/v1/booking/{active_job_id}/qr \
  -H "Authorization: Bearer test-secret-token-12345"
```

2. **Test qr-storage Edge Function**:
```bash
curl "https://kqemgnbqjrqepzkigfcx.supabase.co/functions/v1/qr-storage?job_id={active_job_id}" \
  -H "Authorization: Bearer {anon_key}"
```

3. **Verify Frontend Fallback**:
   - Check browser console for "QR-FALLBACK" messages
   - Ensure both `qr_url` and `qr_data` paths work

4. **Monitor QR Generation**:
```bash
grep -E "(QR|qr_|📱)" /tmp/booking-monitor/app.log | tail -20
```

## 🚨 EMERGENCY QR SYSTEM RECOVERY

If QR system breaks:

1. **Check VPS server is running**:
```bash
curl http://87.106.247.92:8000/health
```

2. **Verify QR endpoint responds**:
```bash
curl http://87.106.247.92:8000/api/v1/booking/{recent_job_id}/qr \
  -H "Authorization: Bearer test-secret-token-12345"
```

3. **Test qr-storage fallback**:
```bash
curl "https://kqemgnbqjrqepzkigfcx.supabase.co/functions/v1/qr-storage?job_id={recent_job_id}" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxZW1nbmJxanJxZXB6a2lnZmN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMTQ4MDEsImV4cCI6MjA2NDc5MDgwMX0.tnPomyWLMseJX0GlrUeO63Ig9GRZSTh1O1Fi2p9q8mc"
```

4. **Check frontend build cache**:
   - Force rebuild: `npm run build`
   - Push to GitHub
   - Wait for Lovable rebuild

## ⚠️ DANGER ZONES

### DO NOT TOUCH:
- `frontend/supabase/functions/qr-storage/index.ts` VPS fallback logic
- `frontend/src/services/vpsPollingService.ts` qr_data fallback
- VPS QR endpoint `/api/v1/booking/{job_id}/qr`
- Auth token `test-secret-token-12345`

### SAFE TO MODIFY:
- QR display styling in frontend
- QR polling intervals (but test thoroughly)
- QR storage bucket configuration (with fallback intact)

**REMEMBER: The QR system is the most critical user-facing feature. Breaking it means users can't authenticate with BankID!** 