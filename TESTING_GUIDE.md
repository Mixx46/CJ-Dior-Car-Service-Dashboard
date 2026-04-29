# GPS Tracking System - Complete Testing Guide

## Prerequisites

1. ✅ System running: `npm start`
2. ✅ Google Maps API key configured in `.env` and `client/.env`
3. ✅ Browser DevTools open (F12 or Cmd+Option+I)
4. ✅ Two browser tabs/windows ready (one for admin, one for customer)

---

## Test 1: Verify Dependencies Installed

### Quick Check
```bash
cd cj-dior-car-service

# Check server has socket.io
npm list socket.io
# Should show: socket.io@4.7.2

# Check client has dependencies
npm --prefix client list socket.io-client react-router-dom @googlemaps/js-api-loader
```

### Expected Output
```
socket.io-client@4.7.2
react-router-dom@6.20.1
@googlemaps/js-api-loader@1.16.2
```

---

## Test 2: Verify Database Tables Created

### Run this SQL

```bash
# Connect to SQLite database
sqlite3 data/cjdior.db

# Check new tables exist
.tables
# Should include: driver_locations, tracking_sessions

# Verify columns
.schema driver_locations
.schema tracking_sessions

# Exit
.exit
```

### Expected Output
```sql
CREATE TABLE driver_locations (
  id INTEGER PRIMARY KEY,
  driver_id INTEGER NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  accuracy REAL,
  bearing REAL,
  speed REAL,
  timestamp TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (driver_id) REFERENCES drivers(id)
);

CREATE TABLE tracking_sessions (
  id INTEGER PRIMARY KEY,
  reservation_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  FOREIGN KEY (reservation_id) REFERENCES reservations(id)
);
```

---

## Test 3: Test Driver Location Sharing

### Step 1: Login as Driver

1. Go to `http://localhost:5173`
2. Click **"Driver Portal"** button
3. Login with:
   - Username: `driver1`
   - Password: `driver`

### Step 2: Enable Location Sharing

1. Click **"Location"** tab
2. Click **"Start Sharing Location"** button
3. Browser asks permission → Click **"Allow"**
4. Should see:
   - ✅ "Sharing active" status
   - ✅ Accuracy indicator (±XX meters)
   - ✅ "Stop Sharing Location" button appears

### Step 3: Verify Location Sent to Server

**Method A: Check Network Requests**
1. Open DevTools → **Network** tab
2. Filter: type "fetch"
3. Should see POST requests to `/api/tracking/location`
4. Click one → **Payload** tab
5. Should see:
```json
{
  "latitude": 25.7617,
  "longitude": -80.1918,
  "accuracy": 12.5,
  "bearing": 45.0,
  "speed": null
}
```

**Method B: Check Server Console**
1. Server console should print location updates (if logging enabled)
2. Or check SQLite:
```sql
sqlite3 data/cjdior.db
SELECT * FROM driver_locations ORDER BY timestamp DESC LIMIT 1;
```

### Expected Result
```
id | driver_id | latitude | longitude | accuracy | bearing | speed | timestamp
1  | 1         | 25.7617  | -80.1918  | 12.5     | 45.0    | NULL  | 2025-04-29 14:28:45
```

---

## Test 4: Test Customer Tracking Page

### Step 1: Create a Reservation for Testing

1. **Open new browser tab** → Login as admin
   - Username: `admin`
   - Password: `admin`

2. Click **"Today's Runs"**

3. Click **"+ New Reservation"** button (or edit existing)

4. Fill in:
   - Client Name: `Test Customer`
   - Pickup Address: `Four Seasons Miami, 1435 Brickell Ave, Miami, FL`
   - Dropoff Address: `Miami International Airport, Miami, FL`
   - Driver: Select any driver
   - Click **"Create"**

### Step 2: Generate Tracking Link

1. Find the reservation you just created
2. Change Status dropdown from "Pending" → **"En Route"**
3. System auto-generates tracking token

### Step 3: Get the Tracking Token

**Option A: Via SQLite**
```bash
sqlite3 data/cjdior.db
SELECT id, token FROM tracking_sessions 
ORDER BY created_at DESC LIMIT 1;
```

**Option B: Check Network Tab**
1. When you changed status to "En Route", API was called
2. DevTools → Network → search "reservations"
3. Find the PATCH request → Response
4. Should show tracking session info

### Step 4: Access Tracking Page

1. **Open new tab** (anonymous/incognito to simulate customer)
2. Paste URL: `http://localhost:5173/track/[TOKEN]`
   - Replace `[TOKEN]` with actual token from Step 3

### Expected Result
```
✅ Shows: "CJ Dior Premium Transportation"
✅ Shows: Google Map (centered on pickup location)
✅ Shows: Driver name, vehicle, rating
✅ Shows: Pickup & dropoff addresses
✅ Shows: ETA countdown (if driver is sharing location)
✅ No login screen (publicly accessible)
✅ Responsive on mobile (resize browser to 375px width)
```

---

## Test 5: Test Dispatcher Map Dashboard

### Step 1: Prepare Active Trip

1. **Admin tab** → "Today's Runs"
2. Make sure at least one reservation has status **"En Route"**

### Step 2: Access Map

1. Click **"Live Map"** in sidebar
2. Should show:
   - ✅ Full-screen Google Map
   - ✅ Active drivers list on right panel
   - ✅ Driver markers on map (if sharing location)

### Step 3: Test Real-Time Updates

1. **Driver tab** (still sharing location)
2. Verify you see location updates flowing in
3. **Admin tab** → "Live Map" should update in real-time
4. No page refresh needed

### Step 4: Click Driver to View Details

1. In right panel, click any driver in the list
2. Should show:
   - ✅ Driver name, vehicle, rating
   - ✅ Pickup & dropoff addresses
   - ✅ Passenger count
   - ✅ Last location update time
   - ✅ GPS accuracy

### Expected Result
```
✅ Map loads without errors
✅ Drivers appear as colored markers
✅ Sidebar shows active trips
✅ Click driver highlights trip on map
✅ All data updates in real-time
```

---

## Test 6: Test WebSocket Connection

### Check Real-Time Communication

1. Open DevTools → **Console** tab
2. Paste this code:

```javascript
// Check if socket.io is connected
const socket = window.socket; // Set in TrackingPage/DispatcherMap
if (socket) {
  console.log('Socket ID:', socket.id);
  console.log('Connected:', socket.connected);
  socket.on('location-update', (data) => {
    console.log('📍 Location update received:', data);
  });
} else {
  console.log('Socket not initialized on this page');
}
```

### Expected Output
```
Socket ID: ABC123XYZ
Connected: true
📍 Location update received: {driver_id: 1, latitude: 25.7642, longitude: -80.1921, ...}
```

### Check WebSocket Tab

1. DevTools → **Network** tab
2. Filter: type "WS" (WebSocket)
3. Should see connection to `ws://localhost:3001/socket.io/...`
4. Status: **101 Switching Protocols** (connected)

---

## Test 7: Test ETA Calculation

### Verify Distance Matrix API

1. **Tracking page** (customer view)
2. Open DevTools → **Network** tab
3. Filter: "distance" or "integrations"
4. Should see POST requests to `/api/integrations/distance-matrix`
5. Click request → **Response**
6. Should show:

```json
{
  "distance_meters": 15000,
  "distance_km": 15.0,
  "distance_text": "15.0 km",
  "duration_seconds": 900,
  "duration_minutes": 15,
  "duration_text": "15 mins"
}
```

### Check ETA Display

1. Customer tracking page should show:
   - ✅ "ETA: 2:45 PM" (or similar)
   - ✅ "15 km away"
   - ✅ ETA updates every 30 seconds

### Verify Calculation Accuracy

Open console on customer tracking page:
```javascript
// Check current ETA
const etaElement = document.querySelector('[title*="Arriving"]');
console.log(etaElement?.textContent);
// Should show: "Arriving at 2:45 PM" or similar
```

---

## Test 8: Test Tracking Link Security

### Test 1: Valid Token
- Access: `http://localhost:5173/track/[VALID_TOKEN]`
- Result: ✅ Shows tracking page

### Test 2: Invalid Token
- Access: `http://localhost:5173/track/fakefakefakefakefakefakefakefake`
- Result: ✅ Shows error: "Invalid tracking link"

### Test 3: Expired Token
1. Create a reservation, change to "En Route"
2. Get tracking token
3. Edit database to expire it:
```bash
sqlite3 data/cjdior.db
UPDATE tracking_sessions 
SET expires_at = datetime('now', '-1 hour')
WHERE id = 1;
```
4. Access tracking page
5. Result: ✅ Shows error: "Tracking link expired"

---

## Test 9: Test Mobile Responsiveness

### Test on Mobile-Sized Viewport

1. Open tracking page
2. DevTools → **Device Toolbar** (toggle device mode)
3. Select: **iPhone 12**
4. Verify:
   - ✅ Map is full-width
   - ✅ Info card below map (not beside)
   - ✅ Text readable (no tiny fonts)
   - ✅ Buttons tap-able (large enough)

### Test on Tablet

1. Toggle device: **iPad Pro**
2. Verify:
   - ✅ Map is 2/3 width
   - ✅ Info card is 1/3 (right sidebar)
   - ✅ All elements visible without scroll

### Test on Desktop

1. Resize: 1280px wide
2. Verify:
   - ✅ Map is 2/3 width
   - ✅ Info card is 1/3
   - ✅ Sidebar shows active trips

---

## Test 10: Test API Endpoints with cURL

### Test 1: Driver Location Update

```bash
# Get a valid driver token first
# Login as driver1 → Developer Tools → Application → Local Storage → cj_token

curl -X POST http://localhost:3001/api/tracking/location \
  -H "Authorization: Bearer YOUR_DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 25.7617,
    "longitude": -80.1918,
    "accuracy": 10.5,
    "bearing": 45.0,
    "speed": 12.5
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "timestamp": "2025-04-29T14:28:45.123Z"
}
```

### Test 2: Get Tracking Info (Public)

```bash
# Get tracking token from database or during test

curl http://localhost:3001/api/tracking/YOUR_TRACKING_TOKEN
```

**Expected Response:**
```json
{
  "reservation": {
    "id": 1,
    "booking_id": "CJ-2025-001",
    "client_name": "John Doe",
    "pickup_datetime": "2025-04-29T14:30:00",
    "pickup_address": "Four Seasons Miami",
    "dropoff_address": "Miami International Airport",
    "status": "En Route",
    "passenger_count": 1,
    "vehicle_assigned": "Mercedes S-Class"
  },
  "driver": {
    "id": 1,
    "name": "Marcus Williams",
    "rating": 4.9,
    "reviews": 45
  },
  "location": {
    "latitude": 25.7642,
    "longitude": -80.1921,
    "accuracy": 8.0,
    "bearing": 90.0,
    "speed": 12.5,
    "timestamp": "2025-04-29T14:28:45Z"
  }
}
```

### Test 3: Get Active Drivers (Admin)

```bash
# Get admin token from login

curl http://localhost:3001/api/tracking/admin/active-drivers \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Expected Response:**
```json
[
  {
    "trip_id": 1,
    "booking_id": "CJ-2025-001",
    "driver_id": 1,
    "driver_name": "Marcus Williams",
    "status": "En Route",
    "vehicle": "Mercedes S-Class",
    "rating": 4.9,
    "pickup_address": "Four Seasons Miami",
    "dropoff_address": "Miami International Airport",
    "passenger_count": 1,
    "location": {
      "latitude": 25.7642,
      "longitude": -80.1921,
      "accuracy": 8.0,
      "bearing": 90.0,
      "speed": 12.5
    },
    "location_timestamp": "2025-04-29T14:28:45Z"
  }
]
```

### Test 4: Calculate Distance

```bash
curl -X POST http://localhost:3001/api/integrations/distance-matrix \
  -H "Content-Type: application/json" \
  -d '{
    "origin": {
      "lat": 25.7617,
      "lng": -80.1918
    },
    "destination": "Miami International Airport"
  }'
```

**Expected Response:**
```json
{
  "distance_meters": 15000,
  "distance_km": 15.0,
  "distance_text": "15.0 km",
  "duration_seconds": 900,
  "duration_minutes": 15,
  "duration_text": "15 mins"
}
```

---

## Test 11: Simulate Driver Movement

### Simulate Multiple Location Updates

1. **Driver tab** → Location → Already sharing location
2. **Console** (on driver portal page):

```javascript
// Simulate driver moving closer to pickup location
async function simulateMovement() {
  const baseLocation = {
    latitude: 25.7617,
    longitude: -80.1918
  };
  
  for (let i = 0; i < 5; i++) {
    const location = {
      latitude: baseLocation.latitude + (i * 0.002),
      longitude: baseLocation.longitude + (i * 0.002),
      accuracy: 8 + Math.random() * 2,
      bearing: Math.random() * 360,
      speed: 12 + Math.random() * 5
    };
    
    const token = localStorage.getItem('cj_token');
    const response = await fetch('/api/tracking/location', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(location)
    });
    
    console.log(`📍 Update ${i + 1}:`, location, response.ok ? '✅' : '❌');
    await new Promise(r => setTimeout(r, 2000)); // 2 second delay
  }
}

simulateMovement();
```

### Watch Real-Time Updates

1. **Admin tab** → "Live Map"
2. Should see driver marker moving
3. Check active trips list → ETA should decrease

---

## Test 12: Test Error Scenarios

### Missing Google Maps API Key

1. Edit `client/.env`:
   ```
   VITE_GOOGLE_MAPS_API_KEY=invalid_key
   ```
2. Reload tracking page
3. Should show error: "Google Maps API key not configured"

### Invalid Reservation ID

1. Try accessing: `http://localhost:5173/track/doesnotexist`
2. Should show error: "Invalid tracking link"

### Stop Sharing Location Mid-Trip

1. Driver portal → Location → Click "Stop Sharing"
2. Dispatcher map should:
   - ✅ Stop receiving location updates
   - ✅ Still show last known location
   - ✅ Not update markers anymore

### Network Failure Simulation

1. DevTools → Network tab
2. Toggle **Offline** mode
3. Driver location update fails gracefully
4. Should show error in console (not crash)

---

## Test 13: Test Status Transitions

### Manual Status Updates

1. Admin → Today's Runs
2. Create/find reservation
3. Test each status transition:

| From | To | Expected |
|------|----|----|
| Pending | Confirmed | ✅ No tracking yet |
| Confirmed | En Route | ✅ Tracking token generated |
| En Route | Arrived | ✅ Status badge color changes |
| Arrived | Passenger Onboard | ✅ Marker color changes to yellow |
| Passenger Onboard | In Transit | ✅ Still shows location |
| In Transit | Completed | ✅ Trip stops, review link generated |

### Verify in Database

```bash
sqlite3 data/cjdior.db

# Check tracking session was created
SELECT * FROM tracking_sessions WHERE reservation_id = 1;

# Check driver locations stored
SELECT * FROM driver_locations WHERE driver_id = 1 LIMIT 10;
```

---

## Test 14: Performance Testing

### Check Network Bandwidth

1. DevTools → **Network** tab
2. Filter: "location"
3. Each POST request should be < 1 KB
4. Multiple drivers shouldn't overwhelm bandwidth

### Check WebSocket Message Size

1. DevTools → **Network** → **WS**
2. Check message sizes (should be < 500 bytes each)

### Memory Usage

1. Open tracking page for 5 minutes
2. DevTools → **Memory** → Take heap snapshot
3. Should not leak memory (no constant growth)

---

## Quick Test Checklist

Copy & paste this to verify everything works:

```
BACKEND SETUP
☐ npm install (server dependencies installed)
☐ npm --prefix client install (client dependencies installed)
☐ sqlite3 data/cjdior.db works (can connect)
☐ Tables created: driver_locations, tracking_sessions
☐ npm start runs without errors

CONFIGURATION
☐ .env has GOOGLE_MAPS_API_KEY
☐ client/.env has VITE_GOOGLE_MAPS_API_KEY
☐ Both have same API key

DRIVER FEATURES
☐ Driver can login (driver1/driver)
☐ Location tab appears
☐ Can enable location sharing
☐ Geolocation permission works
☐ Location updates sent to /api/tracking/location

CUSTOMER FEATURES
☐ Tracking token generated on "En Route"
☐ Tracking page loads without auth
☐ Map displays
☐ ETA shows and updates
☐ Responsive on mobile (375px)

ADMIN FEATURES
☐ Admin can login (admin/admin)
☐ "Live Map" nav item appears
☐ Can see active drivers
☐ Real-time updates work
☐ Can click driver for details

API ENDPOINTS
☐ POST /api/tracking/location works
☐ GET /api/tracking/:token works (public)
☐ GET /api/tracking/admin/active-drivers works (admin)
☐ POST /api/integrations/distance-matrix works

WEBSOCKETS
☐ WS connection shows in Network tab
☐ Location updates received in real-time
☐ No console errors

SECURITY
☐ Invalid token shows error
☐ Expired token shows error
☐ Unauthenticated requests fail properly
```

---

## Troubleshooting During Tests

### Map Not Loading
```
❌ "Cannot read property of undefined"
✅ Check: VITE_GOOGLE_MAPS_API_KEY in client/.env
✅ Check: APIs enabled in Google Cloud Console
✅ Check: Browser console for CORS errors
```

### Location Updates Not Arriving
```
❌ POST to /api/tracking/location returns 401
✅ Check: Driver is logged in
✅ Check: Token is in localStorage
✅ Run: console.log(localStorage.getItem('cj_token'))
```

### WebSocket Not Connecting
```
❌ WS connection shows 404 or 503
✅ Check: Server running on port 3001
✅ Check: socket.io installed (npm list socket.io)
✅ Check: Browser console for errors
```

### Tracking Page Shows Blank Map
```
❌ Map loads but no locations appear
✅ Check: Driver is actually sharing location
✅ Check: Reservation status is "En Route"
✅ Check: Google Maps API key is valid
```

---

## Next Steps After Testing

✅ All tests passing? 
→ Ready for production deployment!

❌ Some tests failing?
→ Check troubleshooting section above
→ Read GPS_TRACKING_SETUP.md for details
→ Check server logs: `npm start` output
