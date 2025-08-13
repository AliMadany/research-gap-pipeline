from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional
import sqlite3
import json
from datetime import datetime
import uvicorn
from wordpress_service import WordPressService
from article_generator import generate_article_from_gap
import requests
import re

app = FastAPI(title="Research Gap Pipeline API", version="1.0.0")

# Add CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer(auto_error=False)

# Pydantic models
class Article(BaseModel):
    id: Optional[str] = None
    title: str
    content: str
    status: str = "to_publish"
    created_at: Optional[str] = None
    word_count: Optional[int] = None
    generated: Optional[bool] = False
    scheduled_date: Optional[str] = None

class ResearchGap(BaseModel):
    id: Optional[str] = None
    service: str
    location: str
    combination: str
    found_at: Optional[str] = None

class WordPressConfig(BaseModel):
    site_url: str
    username: str
    app_password: str

class WordPressAuthRequest(BaseModel):
    site_url: str
    username: str
    app_password: str

class GenerateArticleRequest(BaseModel):
    gap_topic: str

class PublishRequest(BaseModel):
    scheduled_date: Optional[str] = None  # ISO format datetime for scheduling

# Global WordPress service instance
wordpress_service: Optional[WordPressService] = None

# Database initialization
def init_db():
    conn = sqlite3.connect('research_gap_pipeline.db')
    cursor = conn.cursor()
    
    # Articles table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS articles (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            status TEXT DEFAULT 'to_publish',
            created_at TEXT,
            word_count INTEGER,
            generated BOOLEAN DEFAULT 0,
            wordpress_post_id INTEGER NULL,
            scheduled_date TEXT NULL
        )
    ''')
    
    # Add scheduled_date column if it doesn't exist (for existing databases)
    try:
        cursor.execute('ALTER TABLE articles ADD COLUMN scheduled_date TEXT NULL')
    except:
        pass  # Column already exists
    
    # Research gaps table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS research_gaps (
            id TEXT PRIMARY KEY,
            service TEXT NOT NULL,
            location TEXT NOT NULL,
            combination TEXT NOT NULL,
            found_at TEXT
        )
    ''')
    
    # WordPress config table (encrypted in production)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS wordpress_config (
            id INTEGER PRIMARY KEY,
            site_url TEXT,
            username TEXT,
            app_password TEXT,
            created_at TEXT
        )
    ''')
    
    conn.commit()
    conn.close()

# Utility functions
def normalize_url(url: str) -> str:
    """Normalize URL for matching"""
    if url.endswith('/'):
        url = url[:-1]
    
    parts = url.split('/')
    slug = parts[-1] if parts[-1] else parts[-2] if len(parts) > 1 else url
    
    normalized = re.sub(r'[_-]', ' ', slug)
    normalized = re.sub(r'[^\w\s]', '', normalized)
    return normalized.lower().strip()

def exact_phrase_match(service: str, location: str, url_slug: str) -> bool:
    """Check if service + location phrase exists in URL"""
    search_phrase = f"{service} in {location}".lower()
    return search_phrase in url_slug.lower()

def comprehensive_match(service: str, location: str, url: str) -> dict:
    """Comprehensive URL matching with multiple methods"""
    url_slug = normalize_url(url)
    
    # Method 1: Exact phrase match
    if exact_phrase_match(service, location, url_slug):
        return {"is_match": True, "method": "exact_phrase"}
    
    # Method 2: Token-based match
    tokens = url_slug.split()
    if service.lower() in tokens and location.lower() in tokens:
        return {"is_match": True, "method": "token_based"}
    
    # Method 3: Contains both terms
    if service.lower() in url_slug and location.lower() in url_slug:
        return {"is_match": True, "method": "contains_both"}
    
    return {"is_match": False, "method": "no_match"}

async def load_sitemap_urls(limit: int = 10) -> List[str]:
    """Load URLs from sitemap_urls.json"""
    try:
        with open('sitemap_urls.json', 'r', encoding='utf-8') as f:
            urls = json.load(f)
            return urls[:limit]
    except Exception as e:
        print(f"Error loading sitemap URLs: {e}")
        return []

# API Endpoints
@app.on_event("startup")
async def startup_event():
    init_db()

@app.get("/")
async def root():
    return {"message": "Research Gap Pipeline API", "version": "1.0.0"}

# WordPress Authentication
@app.post("/auth/wordpress")
async def authenticate_wordpress(auth_request: WordPressAuthRequest):
    """Authenticate with WordPress and store credentials"""
    global wordpress_service
    
    try:
        # Test WordPress connection
        wp_service = WordPressService(
            auth_request.site_url,
            auth_request.username,
            auth_request.app_password
        )
        
        # Test connection by getting user info
        if wp_service.test_connection_sync():
            wordpress_service = wp_service
            
            # Store credentials in database (encrypt in production)
            conn = sqlite3.connect('research_gap_pipeline.db')
            cursor = conn.cursor()
            cursor.execute('''
                INSERT OR REPLACE INTO wordpress_config 
                (id, site_url, username, app_password, created_at)
                VALUES (1, ?, ?, ?, ?)
            ''', (auth_request.site_url, auth_request.username, 
                  auth_request.app_password, datetime.now().isoformat()))
            conn.commit()
            conn.close()
            
            return {"success": True, "message": "WordPress authentication successful"}
        else:
            raise HTTPException(status_code=401, detail="WordPress authentication failed")
            
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Authentication error: {str(e)}")

@app.get("/auth/wordpress/status")
async def wordpress_auth_status():
    """Check if WordPress is authenticated"""
    return {"authenticated": wordpress_service is not None}

@app.delete("/auth/wordpress")
async def logout_wordpress():
    """Logout from WordPress"""
    global wordpress_service
    wordpress_service = None
    
    # Clear stored credentials
    conn = sqlite3.connect('research_gap_pipeline.db')
    cursor = conn.cursor()
    cursor.execute('DELETE FROM wordpress_config WHERE id = 1')
    conn.commit()
    conn.close()
    
    return {"success": True, "message": "WordPress logout successful"}

# Articles endpoints
@app.get("/articles", response_model=List[Article])
async def get_articles():
    """Get all articles"""
    conn = sqlite3.connect('research_gap_pipeline.db')
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM articles ORDER BY created_at DESC')
    rows = cursor.fetchall()
    conn.close()
    
    articles = []
    for row in rows:
        articles.append(Article(
            id=row[0],
            title=row[1],
            content=row[2],
            status=row[3],
            created_at=row[4],
            word_count=row[5],
            generated=bool(row[6]),
            scheduled_date=row[8] if len(row) > 8 else None
        ))
    
    return articles

@app.post("/articles", response_model=Article)
async def create_article(article: Article):
    """Create a new article"""
    article.id = f"article-{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    article.created_at = datetime.now().isoformat()
    article.word_count = len(article.content.split()) if article.content else 0
    
    conn = sqlite3.connect('research_gap_pipeline.db')
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO articles (id, title, content, status, created_at, word_count, generated)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (article.id, article.title, article.content, article.status,
          article.created_at, article.word_count, article.generated))
    conn.commit()
    conn.close()
    
    return article

@app.put("/articles/{article_id}", response_model=Article)
async def update_article(article_id: str, article: Article):
    """Update an existing article"""
    article.word_count = len(article.content.split()) if article.content else 0
    
    conn = sqlite3.connect('research_gap_pipeline.db')
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE articles 
        SET title = ?, content = ?, status = ?, word_count = ?
        WHERE id = ?
    ''', (article.title, article.content, article.status, article.word_count, article_id))
    conn.commit()
    conn.close()
    
    article.id = article_id
    return article

@app.delete("/articles/{article_id}")
async def delete_article(article_id: str):
    """Delete an article from local database and WordPress (if published)"""
    conn = sqlite3.connect('research_gap_pipeline.db')
    cursor = conn.cursor()
    
    # Get article details first
    cursor.execute('SELECT * FROM articles WHERE id = ?', (article_id,))
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Article not found")
    
    # Check if article was published to WordPress (has wordpress_post_id)
    wordpress_post_id = row[7] if len(row) > 7 else None  # wordpress_post_id column
    article_status = row[3]  # status column
    
    wordpress_deleted = False
    wordpress_error = None
    
    # If article was published and we have WordPress connection, delete from WordPress too
    if article_status == 'published' and wordpress_post_id and wordpress_service:
        try:
            import requests
            wp_delete_url = f"{wordpress_service.site_url}/wp-json/wp/v2/posts/{wordpress_post_id}"
            wp_response = requests.delete(wp_delete_url, headers=wordpress_service.headers)
            
            if wp_response.status_code == 200:
                wordpress_deleted = True
            else:
                wordpress_error = f"Failed to delete from WordPress: {wp_response.status_code}"
                
        except Exception as e:
            wordpress_error = f"Error deleting from WordPress: {str(e)}"
    
    # Delete from local database regardless of WordPress result
    cursor.execute('DELETE FROM articles WHERE id = ?', (article_id,))
    conn.commit()
    conn.close()
    
    # Prepare response message
    if article_status == 'published' and wordpress_post_id:
        if wordpress_deleted:
            message = "Article deleted from both local database and WordPress"
        elif wordpress_error:
            message = f"Article deleted from local database. WordPress deletion failed: {wordpress_error}"
        else:
            message = "Article deleted from local database. WordPress not connected."
    else:
        message = "Article deleted from local database"
    
    return {
        "success": True, 
        "message": message,
        "wordpress_deleted": wordpress_deleted,
        "wordpress_error": wordpress_error
    }

@app.post("/articles/{article_id}/publish")
async def publish_article(article_id: str, publish_request: PublishRequest = PublishRequest()):
    """Publish article to WordPress"""
    if not wordpress_service:
        raise HTTPException(status_code=401, detail="WordPress not authenticated")
    
    # Get article from database
    conn = sqlite3.connect('research_gap_pipeline.db')
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM articles WHERE id = ?', (article_id,))
    row = cursor.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="Article not found")
    
    article = Article(
        id=row[0],
        title=row[1],
        content=row[2],
        status=row[3],
        created_at=row[4],
        word_count=row[5],
        generated=bool(row[6])
    )
    
    try:
        # Publish to WordPress (with optional scheduling)
        wordpress_post = wordpress_service.publish_article_sync(article, publish_request.scheduled_date)
        
        if wordpress_post:
            # Update article status and WordPress post ID
            if publish_request.scheduled_date:
                # Set status to 'scheduled' for local tracking
                cursor.execute('''
                    UPDATE articles 
                    SET status = 'scheduled', wordpress_post_id = ?, scheduled_date = ?
                    WHERE id = ?
                ''', (wordpress_post.get('id'), publish_request.scheduled_date, article_id))
            else:
                # Set status to 'published' for immediate publishing
                cursor.execute('''
                    UPDATE articles 
                    SET status = 'published', wordpress_post_id = ?
                    WHERE id = ?
                ''', (wordpress_post.get('id'), article_id))
                
            conn.commit()
            conn.close()
            
            message = "Article scheduled for WordPress" if publish_request.scheduled_date else "Article published to WordPress"
            
            return {
                "success": True,
                "message": message,
                "wordpress_post_id": wordpress_post.get('id'),
                "wordpress_url": wordpress_post.get('link'),
                "scheduled": bool(publish_request.scheduled_date),
                "scheduled_date": publish_request.scheduled_date
            }
        else:
            conn.close()
            raise HTTPException(status_code=500, detail="Failed to publish to WordPress")
            
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=f"Publishing error: {str(e)}")

@app.post("/articles/check-scheduled")
async def check_scheduled_articles():
    """Check scheduled articles and update their status if they've been published by WordPress"""
    if not wordpress_service:
        return {"success": True, "message": "WordPress not connected", "updated": 0}
    
    try:
        import requests
        from datetime import datetime
        
        # Get all scheduled articles
        conn = sqlite3.connect('research_gap_pipeline.db')
        cursor = conn.cursor()
        cursor.execute('SELECT id, wordpress_post_id, scheduled_date FROM articles WHERE status = "scheduled" AND wordpress_post_id IS NOT NULL')
        scheduled_articles = cursor.fetchall()
        
        updated_count = 0
        current_time = datetime.utcnow()
        
        for article_id, wp_post_id, scheduled_date in scheduled_articles:
            try:
                # Check the post status in WordPress
                wp_url = f"{wordpress_service.site_url}/wp-json/wp/v2/posts/{wp_post_id}"
                response = requests.get(wp_url, headers=wordpress_service.headers, timeout=10)
                
                if response.status_code == 200:
                    post_data = response.json()
                    wp_status = post_data.get('status')
                    
                    # If WordPress shows it as published, update our local status
                    if wp_status == 'publish':
                        cursor.execute('UPDATE articles SET status = "published" WHERE id = ?', (article_id,))
                        updated_count += 1
                        print(f"✅ Updated article {article_id} from scheduled to published")
                
            except Exception as e:
                print(f"⚠️ Error checking article {article_id}: {e}")
                continue
        
        conn.commit()
        conn.close()
        
        return {
            "success": True,
            "message": f"Checked scheduled articles. Updated {updated_count} to published status.",
            "updated": updated_count
        }
        
    except Exception as e:
        return {"success": False, "message": f"Error checking scheduled articles: {str(e)}", "updated": 0}

# Research Gap Analysis
class AnalyzeRequest(BaseModel):
    services: List[str]
    locations: List[str]

@app.post("/research-gaps/analyze")
async def analyze_research_gaps(request: AnalyzeRequest):
    """Analyze research gaps based on services and locations"""
    if not request.services or not request.locations:
        raise HTTPException(status_code=400, detail="Services and locations are required")
    
    # Load sitemap URLs
    sitemap_urls = await load_sitemap_urls(50)
    if not sitemap_urls:
        raise HTTPException(status_code=400, detail="No sitemap URLs found")
    
    gaps = []
    matches = {}
    
    # Check every combination
    for service in request.services:
        for location in request.locations:
            combination = f"{service} in {location}"
            found_match = False
            
            # Check against each URL
            for url in sitemap_urls:
                match_result = comprehensive_match(service, location, url)
                if match_result["is_match"]:
                    found_match = True
                    matches[combination] = {
                        "url": url,
                        "method": match_result["method"]
                    }
                    break
            
            # If no match found, it's a research gap
            if not found_match:
                gap = ResearchGap(
                    id=f"gap-{datetime.now().strftime('%Y%m%d_%H%M%S')}_{len(gaps)}",
                    service=service,
                    location=location,
                    combination=combination,
                    found_at=datetime.now().isoformat()
                )
                gaps.append(gap)
    
    # Store gaps in database
    conn = sqlite3.connect('research_gap_pipeline.db')
    cursor = conn.cursor()
    
    # Clear old gaps
    cursor.execute('DELETE FROM research_gaps')
    
    # Insert new gaps
    for gap in gaps:
        cursor.execute('''
            INSERT INTO research_gaps (id, service, location, combination, found_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (gap.id, gap.service, gap.location, gap.combination, gap.found_at))
    
    conn.commit()
    conn.close()
    
    return {
        "success": True,
        "total_combinations": len(request.services) * len(request.locations),
        "matches_found": len(matches),
        "research_gaps": len(gaps),
        "gaps": gaps,
        "matches": matches
    }

@app.get("/research-gaps", response_model=List[ResearchGap])
async def get_research_gaps():
    """Get all research gaps"""
    conn = sqlite3.connect('research_gap_pipeline.db')
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM research_gaps ORDER BY found_at DESC')
    rows = cursor.fetchall()
    conn.close()
    
    gaps = []
    for row in rows:
        gaps.append(ResearchGap(
            id=row[0],
            service=row[1],
            location=row[2],
            combination=row[3],
            found_at=row[4]
        ))
    
    return gaps

@app.post("/articles/generate")
async def generate_article_from_research_gap(request: GenerateArticleRequest):
    """Generate an article from a research gap using AI"""
    try:
        # Generate article using existing function
        article_data = generate_article_from_gap(request.gap_topic)
        
        if not article_data:
            raise HTTPException(status_code=500, detail="Failed to generate article")
        
        # Create Article object
        article = Article(
            id=article_data['id'],
            title=article_data['title'],
            content=article_data['content'],
            status=article_data['status'],
            created_at=article_data['created_at'],
            word_count=article_data['word_count'],
            generated=article_data.get('generated', True)
        )
        
        # Save to database
        conn = sqlite3.connect('research_gap_pipeline.db')
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO articles (id, title, content, status, created_at, word_count, generated)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (article.id, article.title, article.content, article.status,
              article.created_at, article.word_count, article.generated))
        conn.commit()
        conn.close()
        
        return article
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Article generation error: {str(e)}")

# Statistics
@app.get("/stats")
async def get_statistics():
    """Get application statistics"""
    conn = sqlite3.connect('research_gap_pipeline.db')
    cursor = conn.cursor()
    
    # Count articles by status
    cursor.execute('SELECT status, COUNT(*) FROM articles GROUP BY status')
    status_counts = dict(cursor.fetchall())
    
    # Count total articles
    cursor.execute('SELECT COUNT(*) FROM articles')
    total_articles = cursor.fetchone()[0]
    
    # Count research gaps
    cursor.execute('SELECT COUNT(*) FROM research_gaps')
    total_gaps = cursor.fetchone()[0]
    
    conn.close()
    
    return {
        "total_articles": total_articles,
        "published_articles": status_counts.get("published", 0),
        "to_publish_articles": status_counts.get("to_publish", 0),
        "scheduled_articles": status_counts.get("scheduled", 0),
        "total_research_gaps": total_gaps,
        "wordpress_authenticated": wordpress_service is not None
    }

@app.get("/wordpress/categories")
async def get_wordpress_categories():
      """Get all WordPress categories to find the blog category ID"""
      if not wordpress_service:
          raise HTTPException(status_code=401, detail="WordPress not authenticated")

      try:
          import requests
          url = f"{wordpress_service.site_url}/wp-json/wp/v2/categories"
          response = requests.get(url, headers=wordpress_service.headers)

          if response.status_code == 200:
              categories = response.json()
              # Format for easy reading
              formatted_categories = []
              for cat in categories:
                  formatted_categories.append({
                      "id": cat["id"],
                      "name": cat["name"],
                      "slug": cat["slug"],
                      "count": cat["count"]
                  })
              return {"categories": formatted_categories}
          else:
              raise HTTPException(status_code=response.status_code, detail="Failed to fetch categories")

      except Exception as e:
          raise HTTPException(status_code=500, detail=f"Error fetching categories: {str(e)}")

@app.get("/wordpress/posts/category/{category_id}")
async def get_posts_in_category(category_id: int, per_page: int = 5):
    """Get posts in a specific category to verify it matches the blog section"""
    if not wordpress_service:
        raise HTTPException(status_code=401, detail="WordPress not authenticated")
    
    try:
        import requests
        url = f"{wordpress_service.site_url}/wp-json/wp/v2/posts"
        params = {
            'categories': category_id,
            'per_page': per_page
        }
        
        response = requests.get(url, headers=wordpress_service.headers, params=params)
        
        if response.status_code == 200:
            posts = response.json()
            # Format for easy reading
            formatted_posts = []
            for post in posts:
                formatted_posts.append({
                    "id": post["id"],
                    "title": post["title"]["rendered"],
                    "link": post["link"],
                    "date": post["date"],
                    "excerpt": post["excerpt"]["rendered"][:100] + "..." if post["excerpt"]["rendered"] else ""
                })
            return {
                "category_id": category_id,
                "total_posts": len(formatted_posts),
                "posts": formatted_posts
            }
        else:
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch posts")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching posts: {str(e)}")

@app.get("/wordpress/posts")
async def get_wordpress_posts(per_page: int = 100, page: int = 1, fetch_all: bool = False):
    """Get all WordPress posts with their categories"""
    if not wordpress_service:
        raise HTTPException(status_code=401, detail="WordPress not authenticated")
    
    try:
        import requests
        
        all_posts = []
        
        if fetch_all:
            # Fetch all posts by making multiple requests
            current_page = 1
            while True:
                posts_url = f"{wordpress_service.site_url}/wp-json/wp/v2/posts"
                posts_params = {
                    'per_page': 100,  # WordPress REST API max
                    'page': current_page,
                    'status': 'publish',
                    'orderby': 'date',
                    'order': 'desc'  # Newest first
                }
                
                posts_response = requests.get(posts_url, headers=wordpress_service.headers, params=posts_params)
                
                if posts_response.status_code != 200:
                    break
                
                page_posts = posts_response.json()
                if not page_posts:  # No more posts
                    break
                    
                all_posts.extend(page_posts)
                current_page += 1
                
                # Safety check to avoid infinite loop
                if current_page > 50:  # Max 5000 posts
                    break
        else:
            # Fetch single page
            posts_url = f"{wordpress_service.site_url}/wp-json/wp/v2/posts"
            posts_params = {
                'per_page': per_page,
                'page': page,
                'status': 'publish',
                'orderby': 'date',
                'order': 'desc'  # Newest first
            }
            
            posts_response = requests.get(posts_url, headers=wordpress_service.headers, params=posts_params)
            
            if posts_response.status_code != 200:
                raise HTTPException(status_code=posts_response.status_code, detail="Failed to fetch posts")
            
            all_posts = posts_response.json()
        
        # Get all categories to map IDs to names
        categories_url = f"{wordpress_service.site_url}/wp-json/wp/v2/categories"
        categories_response = requests.get(categories_url, headers=wordpress_service.headers)
        
        categories_map = {}
        if categories_response.status_code == 200:
            categories = categories_response.json()
            categories_map = {cat["id"]: cat["name"] for cat in categories}
        
        # Format posts with category names
        formatted_posts = []
        for post in all_posts:
            # Get category names for this post
            post_categories = []
            if post.get("categories"):
                post_categories = [categories_map.get(cat_id, f"Category {cat_id}") for cat_id in post["categories"]]
            
            formatted_posts.append({
                "id": post["id"],
                "title": post["title"]["rendered"],
                "link": post["link"],
                "date": post["date"],
                "modified": post["modified"],
                "status": post["status"],
                "excerpt": post["excerpt"]["rendered"][:150] + "..." if post["excerpt"]["rendered"] else "",
                "categories": post_categories,
                "category_ids": post.get("categories", []),
                "author": post.get("author", 1),
                "word_count": len(post["content"]["rendered"].split()) if post.get("content", {}).get("rendered") else 0
            })
        
        return {
            "posts": formatted_posts,
            "total_posts": len(formatted_posts),
            "page": page if not fetch_all else 1,
            "per_page": per_page if not fetch_all else len(formatted_posts),
            "fetched_all": fetch_all
        }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching WordPress posts: {str(e)}")




if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)