# Research Gap Pipeline - WordPress Integration Setup

## Architecture Overview

Your project now has a **full-stack architecture**:

- **Backend**: FastAPI server with WordPress REST API integration
- **Frontend**: React dashboard with modern UI
- **Database**: SQLite for article persistence
- **WordPress Integration**: Secure authentication and publishing

## Quick Start

### 1. Install Dependencies

```bash
# Install Python dependencies
pip install -r requirements.txt

# Install React dependencies
cd dashboard
npm install
cd ..
```

### 2. Start the Backend

```bash
# Option 1: Using the startup script
python start-backend.py

# Option 2: Manual start
cd src
uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at:
- **API**: http://localhost:8000
- **Documentation**: http://localhost:8000/docs

### 3. Start the React Frontend

```bash
cd dashboard
npm run dev
```

The dashboard will be available at: http://localhost:5173

## WordPress Connection

### Setup WordPress Application Password

1. **Login to your WordPress Admin**
2. **Go to**: Users → Profile (or Users → Your Profile)
3. **Scroll down** to "Application Passwords" section
4. **Create new password**:
   - Application Name: `Research Gap Pipeline`
   - Click "Add New Application Password"
5. **Copy the generated password** (format: `xxxx xxxx xxxx xxxx xxxx xxxx`)

### Connect in Dashboard

1. **Open the React dashboard** (http://localhost:5173)
2. **Go to Settings tab**
3. **Click "Connect" on WordPress Connection**
4. **Enter**:
   - **Site URL**: Your WordPress site (e.g., `yoursite.com` or `yoursite.wordpress.com`)
   - **Username**: Your WordPress username
   - **Application Password**: The password you just generated

## Features

### ✅ What's Working

- **Article Generation**: AI-powered article creation from research gaps
- **WordPress Publishing**: Direct publishing to your WordPress site
- **Research Gap Analysis**: Automated gap detection from sitemaps
- **Modern Dashboard**: React-based UI with real-time updates
- **Persistent Storage**: SQLite database for articles and settings
- **Secure Authentication**: WordPress Application Passwords

### 🔄 Workflow

1. **Add Services & Locations** in Research Analysis tab
2. **Find Research Gaps** - analyzes your sitemap
3. **Generate Articles** from discovered gaps
4. **Review & Edit** articles in the Articles tab
5. **Connect WordPress** in Settings
6. **Publish** articles directly to WordPress

## API Endpoints

### WordPress Authentication
- `POST /auth/wordpress` - Connect to WordPress
- `GET /auth/wordpress/status` - Check connection status
- `DELETE /auth/wordpress` - Disconnect

### Articles
- `GET /articles` - Get all articles
- `POST /articles` - Create article
- `PUT /articles/{id}` - Update article
- `DELETE /articles/{id}` - Delete article
- `POST /articles/{id}/publish` - Publish to WordPress

### Research Gap Analysis
- `POST /research-gaps/analyze` - Analyze gaps
- `GET /research-gaps` - Get discovered gaps
- `POST /articles/generate` - Generate article from gap

### Statistics
- `GET /stats` - Get application statistics

## File Structure

```
research-gap-pipeline/
├── src/
│   ├── api.py                 # FastAPI backend
│   ├── wordpress_service.py   # WordPress integration
│   └── article_generator.py   # AI article generation
├── dashboard/
│   ├── src/
│   │   ├── App.tsx           # Main React app
│   │   ├── services/api.ts   # API client
│   │   └── components/       # React components
│   └── package.json
├── requirements.txt           # Python dependencies
├── start-backend.py          # Backend startup script
└── research_gap_pipeline.db  # SQLite database (auto-created)
```

## Troubleshooting

### Backend Issues

**Port 8000 already in use:**
```bash
# Kill process on port 8000
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

**Database issues:**
```bash
# Delete database to reset
rm research_gap_pipeline.db
```

### WordPress Connection Issues

**Authentication failed:**
- Verify your site URL (try with/without `https://`)
- Check username spelling
- Regenerate Application Password
- Ensure WordPress REST API is enabled

**Publishing failed:**
- Check WordPress connection in Settings
- Verify user permissions (should be Admin/Editor)
- Check WordPress site is accessible

### React Frontend Issues

**API connection failed:**
- Ensure backend is running on port 8000
- Check browser console for CORS errors
- Verify API base URL in `dashboard/src/services/api.ts`

## Production Deployment

For production deployment, consider:

1. **Environment Variables** for WordPress credentials
2. **Database Migration** from SQLite to PostgreSQL/MySQL
3. **Reverse Proxy** with Nginx
4. **SSL Certificates** for HTTPS
5. **Docker Containerization**

## Support

If you encounter issues:

1. Check the backend logs (terminal where you started the API)
2. Check browser console (F12 → Console)
3. Verify WordPress Application Password setup
4. Ensure all dependencies are installed

The system is now ready for local development and WordPress publishing!