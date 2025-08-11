import requests
import base64
import json
from typing import Optional, Dict, Any
from datetime import datetime
import asyncio
import aiohttp

class WordPressService:
    """WordPress REST API service for publishing articles"""
    
    def __init__(self, site_url: str, username: str, app_password: str):
        self.site_url = site_url.rstrip('/')
        self.username = username
        self.app_password = app_password
        
        # Create basic auth header
        credentials = f"{username}:{app_password}"
        encoded_credentials = base64.b64encode(credentials.encode()).decode()
        
        self.headers = {
            'Authorization': f'Basic {encoded_credentials}',
            'Content-Type': 'application/json',
            'User-Agent': 'Research Gap Pipeline/1.0'
        }
    
    async def test_connection(self) -> bool:
        """Test WordPress connection and authentication"""
        try:
            async with aiohttp.ClientSession() as session:
                # Test with /wp-json/wp/v2/users/me endpoint
                url = f"{self.site_url}/wp-json/wp/v2/users/me"
                
                async with session.get(url, headers=self.headers) as response:
                    if response.status == 200:
                        user_data = await response.json()
                        print(f"✅ WordPress connection successful. User: {user_data.get('name', 'Unknown')}")
                        return True
                    else:
                        print(f"❌ WordPress authentication failed. Status: {response.status}")
                        return False
                        
        except Exception as e:
            print(f"❌ WordPress connection error: {str(e)}")
            return False
    
    def test_connection_sync(self) -> bool:
        """Synchronous version of test_connection for initial setup"""
        try:
            url = f"{self.site_url}/wp-json/wp/v2/users/me"
            response = requests.get(url, headers=self.headers, timeout=10)
            
            if response.status_code == 200:
                user_data = response.json()
                print(f"✅ WordPress connection successful. User: {user_data.get('name', 'Unknown')}")
                return True
            else:
                print(f"❌ WordPress authentication failed. Status: {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ WordPress connection error: {str(e)}")
            return False
    
    async def publish_article(self, article) -> Optional[Dict[str, Any]]:
        """Publish an article to WordPress"""
        try:
            # Prepare post data
            post_data = {
                'title': article.title,
                'content': self._convert_markdown_to_html(article.content),
                'status': 'publish',
                'author': 1,  # Default to admin user
                'date': datetime.now().isoformat(),
                'excerpt': self._generate_excerpt(article.content),
                'meta': {
                    'generated_by': 'Research Gap Pipeline',
                    'word_count': article.word_count or len(article.content.split())
                }
            }
            
            # Set categories if available
            categories = self._extract_categories(article.title, article.content)
            if categories:
                post_data['categories'] = categories
            
            # Set tags if available
            tags = self._extract_tags(article.content)
            if tags:
                post_data['tags'] = tags
            
            async with aiohttp.ClientSession() as session:
                url = f"{self.site_url}/wp-json/wp/v2/posts"
                
                async with session.post(url, headers=self.headers, json=post_data) as response:
                    if response.status == 201:
                        post_result = await response.json()
                        print(f"✅ Article published successfully. Post ID: {post_result['id']}")
                        print(f"📄 URL: {post_result['link']}")
                        return post_result
                    else:
                        error_text = await response.text()
                        print(f"❌ Failed to publish article. Status: {response.status}")
                        print(f"Error: {error_text}")
                        return None
                        
        except Exception as e:
            print(f"❌ Error publishing article: {str(e)}")
            return None
    
    def publish_article_sync(self, article) -> Optional[Dict[str, Any]]:
        """Synchronous version of publish_article"""
        try:
            # Prepare post data
            post_data = {
                'title': article.title,
                'content': self._convert_markdown_to_html(article.content),
                'status': 'publish',
                'author': 1,
                'date': datetime.now().isoformat(),
                'excerpt': self._generate_excerpt(article.content),
                'meta': {
                    'generated_by': 'Research Gap Pipeline',
                    'word_count': article.word_count or len(article.content.split())
                }
            }
            
            # Set categories and tags
            categories = self._extract_categories(article.title, article.content)
            if categories:
                post_data['categories'] = categories
            
            tags = self._extract_tags(article.content)
            if tags:
                post_data['tags'] = tags
            
            url = f"{self.site_url}/wp-json/wp/v2/posts"
            response = requests.post(url, headers=self.headers, json=post_data, timeout=30)
            
            if response.status_code == 201:
                post_result = response.json()
                print(f"✅ Article published successfully. Post ID: {post_result['id']}")
                print(f"📄 URL: {post_result['link']}")
                return post_result
            else:
                print(f"❌ Failed to publish article. Status: {response.status_code}")
                print(f"Error: {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Error publishing article: {str(e)}")
            return None
    
    def _convert_markdown_to_html(self, content: str) -> str:
        """Convert markdown-style content to HTML for WordPress"""
        # Convert **bold** to <strong>
        content = content.replace('**', '<strong>', 1).replace('**', '</strong>', 1)
        
        # Convert *italic* to <em>
        content = content.replace('*', '<em>', 1).replace('*', '</em>', 1)
        
        # Convert bullet points to HTML lists
        lines = content.split('\n')
        html_lines = []
        in_list = False
        
        for line in lines:
            line = line.strip()
            if line.startswith('• ') or line.startswith('- '):
                if not in_list:
                    html_lines.append('<ul>')
                    in_list = True
                html_lines.append(f'<li>{line[2:]}</li>')
            else:
                if in_list:
                    html_lines.append('</ul>')
                    in_list = False
                if line:
                    html_lines.append(f'<p>{line}</p>')
                else:
                    html_lines.append('<br>')
        
        if in_list:
            html_lines.append('</ul>')
        
        return '\n'.join(html_lines)
    
    def _generate_excerpt(self, content: str, max_length: int = 155) -> str:
        """Generate an excerpt from article content"""
        # Remove markdown formatting
        clean_content = content.replace('**', '').replace('*', '').replace('• ', '').replace('- ', '')
        
        # Get first paragraph or first sentence
        first_paragraph = clean_content.split('\n\n')[0]
        
        # Truncate to max_length
        if len(first_paragraph) > max_length:
            excerpt = first_paragraph[:max_length].rsplit(' ', 1)[0] + '...'
        else:
            excerpt = first_paragraph
        
        return excerpt
    
    def _extract_categories(self, title: str, content: str) -> list:
        """Extract categories based on content analysis"""
        categories = []
        
        # Service-based categories
        services = ['paving', 'roofing', 'landscaping', 'flooring', 'plumbing', 'electrical', 'construction']
        for service in services:
            if service in title.lower() or service in content.lower():
                categories.append(service.title())
        
        # Location-based categories could be added here
        # For now, return a default category
        if not categories:
            categories.append('Services')
        
        return categories
    
    def _extract_tags(self, content: str) -> list:
        """Extract tags from content"""
        tags = []
        
        # Common contractor tags
        tag_keywords = [
            'professional', 'quality', 'licensed', 'insured', 'local',
            'installation', 'repair', 'maintenance', 'residential', 'commercial'
        ]
        
        content_lower = content.lower()
        for keyword in tag_keywords:
            if keyword in content_lower:
                tags.append(keyword.title())
        
        return tags[:10]  # Limit to 10 tags
    
    async def get_post_by_id(self, post_id: int) -> Optional[Dict[str, Any]]:
        """Get a WordPress post by ID"""
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.site_url}/wp-json/wp/v2/posts/{post_id}"
                
                async with session.get(url, headers=self.headers) as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        return None
                        
        except Exception as e:
            print(f"Error getting post {post_id}: {str(e)}")
            return None
    
    async def update_post(self, post_id: int, article) -> Optional[Dict[str, Any]]:
        """Update an existing WordPress post"""
        try:
            post_data = {
                'title': article.title,
                'content': self._convert_markdown_to_html(article.content),
                'excerpt': self._generate_excerpt(article.content)
            }
            
            async with aiohttp.ClientSession() as session:
                url = f"{self.site_url}/wp-json/wp/v2/posts/{post_id}"
                
                async with session.post(url, headers=self.headers, json=post_data) as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        return None
                        
        except Exception as e:
            print(f"Error updating post {post_id}: {str(e)}")
            return None
    
    async def delete_post(self, post_id: int) -> bool:
        """Delete a WordPress post"""
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.site_url}/wp-json/wp/v2/posts/{post_id}"
                
                async with session.delete(url, headers=self.headers) as response:
                    return response.status == 200
                    
        except Exception as e:
            print(f"Error deleting post {post_id}: {str(e)}")
            return False
    
    def get_site_info(self) -> Optional[Dict[str, Any]]:
        """Get WordPress site information"""
        try:
            url = f"{self.site_url}/wp-json"
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                return response.json()
            else:
                return None
                
        except Exception as e:
            print(f"Error getting site info: {str(e)}")
            return None