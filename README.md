# Research Gap Pipeline

An AI-powered system that analyzes website sitemaps to identify content gaps and automatically generates SEO-optimized articles to fill those gaps.

## Overview

This system helps businesses identify missing content opportunities by:
1. Analyzing WordPress site sitemaps
2. Comparing services/locations against existing content
3. Identifying research gaps (missing service + location combinations)
4. Generating professional contractor articles using AI
5. Providing a dashboard to manage and publish content

## Project Structure

```
research-gap-pipeline/
├── src/                          # Core Python backend
│   ├── api.py                   # FastAPI REST API endpoints
│   ├── article_generator.py     # AI article generation
│   ├── wordpress_service.py     # WordPress integration
│   └── research_gap_pipeline.db # SQLite database
├── dashboard/                    # React frontend dashboard
├── electron/                     # Desktop application wrapper
├── start-backend.py             # Backend startup script
├── requirements.txt             # Python dependencies
└── README.md                    # This file
```

## Prerequisites

- **Python 3.8+**
- **Node.js 16+** 
- **Ollama** (AI model runtime)
- **WordPress site** with XML sitemap

## Installation Guide

### Step 1: Install Ollama

**Windows:**
1. Download Ollama from: https://ollama.com/download
2. Run the installer and follow the setup wizard
3. Verify installation by opening Command Prompt and running:
   ```cmd
   ollama --version
   ```

**macOS:**
```bash
# Using Homebrew
brew install ollama

# Or download from https://ollama.com/download
```



### Step 2: Install AI Models

Download the required AI model for article generation:

```cmd
ollama pull llama3.1:8b
```

This will download ~5GB. Wait for completion before proceeding.

### Step 3: Start Ollama Server

```cmd
ollama serve
```

Keep this terminal window open. The server runs on `http://localhost:11434`

### Step 4: Install Python Dependencies

```cmd
# Navigate to project directory
cd research-gap-pipeline

# Install Python packages
pip install -r requirements.txt
```

### Step 5: Install Dashboard Dependencies 

If using the web dashboard:

```cmd
cd dashboard
npm install
```



### Method 1: Full Application with Dashboard

1. **Start Ollama server:**
   ```cmd
   ollama serve
   ```

2. **Start backend (Terminal 1):**
   ```cmd
   python start-backend.py
   ```

3. **Start frontend dashboard (Terminal 2):**
   ```cmd
   cd dashboard
   npm start
   ```

4. **Access the application:**
   - Dashboard: `http://localhost:3000`
   - Backend API: `http://localhost:8000`



## API Endpoints

### Core Endpoints

- `POST /analyze-sitemap` - Analyze WordPress sitemap for gaps
- `POST /generate-article` - Generate AI article for a research gap
- `GET /research-gaps` - List all identified research gaps
- `GET /articles` - List all generated articles
- `POST /publish-article` - Publish article to WordPress

### Example Usage

**Analyze sitemap:**
```bash
curl -X POST "http://localhost:8000/analyze-sitemap" \
  -H "Content-Type: application/json" \
  -d '{"sitemap_url": "https://example.com/sitemap.xml"}'
```

**Generate article:**
```bash
curl -X POST "http://localhost:8000/generate-article" \
  -H "Content-Type: application/json" \
  -d '{"topic": "driveway paving in Miami"}'
```

## Configuration

### WordPress Settings

Update `src/wordpress_service.py` with your WordPress credentials:

```python
WORDPRESS_URL = "https://your-site.com"
WORDPRESS_USERNAME = "your-username"
WORDPRESS_PASSWORD = "your-app-password"
```

### AI Model Settings

Modify `src/article_generator.py` to adjust article generation:

```python
'options': {
    'temperature': 0.3,        # Creativity (0.0-1.0)
    'num_predict': 15000,      # Max tokens to generate
    'top_p': 0.9,             # Word selection diversity
    'repeat_penalty': 1.1      # Avoid repetition
}
```

## Troubleshooting

### Ollama Issues

**Error: "ollama server not responding"**
- Ensure Ollama is installed correctly
- Run `ollama serve` to start the server
- Check if port 11434 is available

**Error: "model not found"**
- Download the model: `ollama pull llama3.1:8b`
- Verify with: `ollama list`

### Python Issues

**Error: "Module not found"**
- Install requirements: `pip install -r requirements.txt`
- Use virtual environment if needed

**Error: "Port already in use"**
- Change port in `start-backend.py`
- Or kill existing process on port 8000

### Article Generation Issues

**Articles too short or missing sections:**
- Increase `num_predict` in `article_generator.py`
- Lower `temperature` for better instruction following

**Weird characters in articles:**
- Check Unicode handling in `clean_llm_response()`
- Ensure proper encoding in database

## Development

### Adding New Features

1. **Backend changes:** Modify files in `src/`
2. **Frontend changes:** Modify files in `dashboard/src/`
3. **Desktop app changes:** Modify files in `electron/`

### Database

SQLite database located at `research_gap_pipeline.db`

**Tables:**
- `research_gaps` - Identified content gaps
- `articles` - Generated articles
- `sitemaps` - Analyzed sitemap data

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Verify all prerequisites are installed
3. Ensure Ollama server is running
4. Check API documentation at `http://localhost:8000/docs`

## License

This project is proprietary software developed for specific client use.
