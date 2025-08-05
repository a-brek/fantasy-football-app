# ESPN Fantasy Football API Setup

This app is configured to work with **REAL ESPN Fantasy Football API data** as it would in production.

## Quick Start

### 1. Install Server Dependencies
```bash
# In the fantasy-football directory
npm install express cors http-proxy-middleware --save
```

### 2. Start the API Proxy Server
```bash
# Start the proxy server (keeps ESPN API working without CORS issues)
node server.js
```

You should see:
```
🏈 Fantasy Football API Proxy Server running on http://localhost:3001
📡 Proxying ESPN Fantasy API calls to avoid CORS issues
```

### 3. Start the Angular App
```bash
# In another terminal, start the Angular dev server
npm start
```

The app will now connect to **real ESPN Fantasy data** via the proxy!

## How It Works

### Production-Ready Architecture
- **Frontend (Angular)**: Calls `http://localhost:3001/api/espn`
- **Proxy Server (Node.js)**: Forwards requests to ESPN's API
- **ESPN API**: Returns real fantasy football data

### API Endpoints Being Used
- **Standings**: `/api/espn?view=mStandings`
- **Matchups**: `/api/espn?view=mMatchup`  
- **Teams**: `/api/espn?view=mTeam`
- **Rosters**: `/api/espn?view=mRoster`

### League Configuration
- **League ID**: 532886 (configured in `fantasy-football.service.ts`)
- **Season**: 2024
- **API Source**: ESPN Fantasy Football

## Customization

### Using Your Own League
1. Edit `src/app/services/fantasy-football/fantasy-football.service.ts`
2. Change `LEAGUE_ID` to your ESPN league ID
3. Update `SEASON_ID` if needed

### Production Deployment
- Deploy the Node.js proxy to your backend (Heroku, AWS, etc.)
- Update `PROXY_BASE_URL` in the service to point to your deployed proxy
- The Angular app can be deployed to any static hosting (Netlify, Vercel, etc.)

## Troubleshooting

### "Network Error" in Console
- Make sure the proxy server is running: `node server.js`
- Check that no other service is using port 3001

### "ESPN API returned error: 401/403"
- The league might be private
- You might need ESPN login credentials for private leagues
- Try with a public league ID

### Data Not Loading
- Check the browser console for error messages
- Verify the league ID exists and is accessible
- Test the proxy directly: `curl http://localhost:3001/health`

## Success Indicators

When working correctly, you'll see in the browser console:
- `🏈 Calling ESPN API via proxy: http://localhost:3001/api/espn?view=mStandings`
- `✅ ESPN API Response received: [data object]`
- `Teams loaded successfully`
- `Matchups loaded successfully` 
- `Standings loaded successfully`

**This is a fully production-ready setup that uses real ESPN Fantasy Football data!** 🏈