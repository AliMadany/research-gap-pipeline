# Research Gap Pipeline - Technical Documentation

## How the System Works

### Architecture Overview

The Research Gap Pipeline is a multi-component system that uses AI to identify and fill content gaps on websites:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   WordPress     │    │   Python API     │    │   Ollama AI     │
│   Sitemap       │───▶│   (FastAPI)      │───▶│   (Llama 3.1)   │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React         │    │   SQLite         │    │   WordPress     │
│   Dashboard     │◀───│   Database       │    │   Publishing    │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Core Workflow

1. **Sitemap Analysis**
   - Fetches XML sitemap from target WordPress site
   - Parses all existing URLs and extracts service/location patterns
   - Stores found combinations in database

2. **Gap Identification** 
   - Takes user input for services and locations to check
   - Compares against existing sitemap content
   - Identifies missing service + location combinations
   - Flags these as "research gaps"

3. **Article Generation**
   - Uses AI (Llama 3.1:8b via Ollama) to generate content
   - Creates contractor-style articles with specific structure
   - Includes local SEO optimization and specific examples
   - Saves generated articles to database

4. **Content Management**
   - Provides dashboard to review generated articles
   - Allows editing and approval workflow
   - Enables direct publishing to WordPress

## Technical Components

### Backend API (`src/api.py`)

**FastAPI-based REST API with endpoints:**

- `POST /analyze-sitemap`
  - Accepts: `{"sitemap_url": "https://example.com/sitemap.xml"}`
  - Returns: Analysis results with found pages and patterns

- `POST /generate-article`  
  - Accepts: `{"topic": "service in location"}`
  - Returns: Generated article with metadata

- `GET /research-gaps`
  - Returns: List of identified content gaps

- `POST /publish-article/{id}`
  - Publishes approved article to WordPress

### Article Generator (`src/article_generator.py`)

**AI-powered content creation engine:**

```python
def generate_article_from_gap(gap_topic):
    # Parses topic (e.g., "driveway paving in Miami")
    service, city = parse_topic(gap_topic)
    
    # Creates detailed prompt for AI model
    prompt = create_contractor_prompt(service, city)
    
    # Calls Ollama API with Llama 3.1:8b model
    content = query_ollama(prompt)
    
    # Cleans and formats the response
    cleaned_content = clean_llm_response(content)
    
    # Returns structured article object
    return create_article_object(cleaned_content)
```

**Article Structure Generated:**
1. Attention-Grabbing Headline
2. Project Story Opening  
3. The Project Story (detailed case study)
4. Why [City] Properties Need Professional [Service]
5. Our [Service] Process
6. Benefits for [City] Property Owners
7. Maintenance for [City] Conditions
8. Why Choose Local [City] Contractors
9. Getting Started (call-to-action)

### WordPress Integration (`src/wordpress_service.py`)

**WordPress REST API integration:**

```python
def publish_article(article_data, wp_credentials):
    # Formats article for WordPress
    wp_post = {
        'title': article_data['title'],
        'content': article_data['content'], 
        'status': 'draft',  # or 'publish'
        'categories': determine_categories(article_data)
    }
    
    # Posts via WordPress REST API
    response = requests.post(
        f"{wp_url}/wp-json/wp/v2/posts",
        json=wp_post,
        auth=(username, app_password)
    )
    
    return response.json()
```

### Database Schema (`research_gap_pipeline.db`)

**SQLite database with key tables:**

```sql
-- Identified content gaps
CREATE TABLE research_gaps (
    id INTEGER PRIMARY KEY,
    topic TEXT NOT NULL,
    service TEXT,
    location TEXT,
    competition_level TEXT,
    search_volume INTEGER,
    created_at TIMESTAMP,
    status TEXT DEFAULT 'pending'
);

-- Generated articles  
CREATE TABLE articles (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    topic TEXT,
    word_count INTEGER,
    status TEXT DEFAULT 'draft',
    generated BOOLEAN DEFAULT 1,
    created_at TIMESTAMP,
    published_at TIMESTAMP
);

-- Sitemap analysis results
CREATE TABLE sitemap_pages (
    id INTEGER PRIMARY KEY,
    url TEXT NOT NULL,
    service_detected TEXT,
    location_detected TEXT,
    last_analyzed TIMESTAMP
);
```

## AI Model Configuration

### Ollama Setup

**Model Used:** `llama3.1:8b`
- **Size:** ~5GB download
- **Context Length:** 128k tokens  
- **Strengths:** Excellent instruction following, consistent output format

**Generation Parameters:**
```python
'options': {
    'temperature': 0.3,        # Low creativity for consistent format
    'num_predict': 15000,      # Max tokens for long articles
    'top_p': 0.9,             # Word selection diversity  
    'repeat_penalty': 1.1      # Avoid repetitive content
}
```

### Content Processing Pipeline

1. **Raw AI Output** - Model generates article with potential formatting issues
2. **Unicode Normalization** - Fixes special characters and encoding  
3. **Header Detection** - Identifies section headers from plain text
4. **HTML Conversion** - Converts headers to proper `<h2>` tags
5. **Bullet Point Cleanup** - Converts lists to flowing paragraphs
6. **Placeholder Replacement** - Fills in realistic examples and details

## Frontend Dashboard

**React-based web interface:**

- **Article Review** - Grid view of generated articles
- **Gap Management** - List and prioritize research gaps  
- **Publishing Queue** - Approve articles for WordPress
- **Settings** - Configure WordPress credentials and AI parameters

**Key Components:**
```jsx
// Main dashboard
<Dashboard />
  ├── <GapsList />          // Shows identified gaps
  ├── <ArticlesGrid />      // Generated articles preview  
  ├── <PublishQueue />      // Publishing management
  └── <Settings />          // Configuration panel
```

## Desktop Application

**Electron wrapper for offline use:**

- Packages the web dashboard as a desktop app
- Includes embedded Node.js runtime
- Auto-starts backend API on launch
- Provides native OS integration

## Development Workflow

### Adding New Article Templates

1. Modify prompt in `src/article_generator.py`
2. Update section header patterns in `clean_llm_response()`
3. Test with various service/location combinations
4. Adjust AI parameters if needed

### Extending API Functionality

1. Add new endpoints to `src/api.py`
2. Update database schema if needed
3. Add corresponding frontend components
4. Update API documentation

### Customizing AI Output

**Temperature Adjustment:**
- Lower (0.1-0.3) = More consistent, follows format strictly
- Higher (0.5-0.8) = More creative, may deviate from format

**Token Limit Tuning:**
- Increase `num_predict` for longer articles
- Decrease for faster generation

**Prompt Engineering:**
- More specific instructions = better compliance
- Include examples = more consistent output style
- Clear structure requirements = reliable formatting

## Performance Considerations

### Generation Speed
- Llama 3.1:8b: ~30-60 seconds per article
- GPU acceleration recommended for faster generation
- Batch processing possible for multiple articles

### Resource Usage
- **RAM:** 8GB minimum (model loading)
- **Storage:** 5GB for AI model + generated content
- **CPU/GPU:** Higher specs = faster generation

### Scaling Options
- Multiple Ollama instances for parallel generation
- Queue system for bulk article creation
- API rate limiting for production deployment

## Security Considerations

### WordPress Credentials
- Use Application Passwords (not main password)
- Store credentials securely (environment variables)
- Rotate passwords regularly

### API Security
- Add authentication to production API
- Validate all user inputs
- Implement rate limiting

### Data Privacy  
- Generated content stored locally by default
- No external API calls (fully offline AI)
- Client controls all data and processing

## Monitoring and Maintenance

### Health Checks
- Monitor Ollama server status
- Check API response times
- Verify WordPress connectivity

### Content Quality
- Review generated articles regularly
- Adjust AI parameters based on output quality
- Update prompts for better results

### Database Maintenance
- Regular backups of SQLite database
- Archive old articles and gaps
- Monitor database size growth

This system provides a complete solution for automated content gap analysis and article generation, designed to help businesses maintain competitive SEO content strategies.