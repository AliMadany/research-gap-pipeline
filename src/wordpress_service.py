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
    
    async def publish_article(self, article, featured_image_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
        """Publish an article to WordPress"""
        try:
            # Create as draft first to avoid scheduling issues
            post_data = {
                'title': article.title,
                'content': self._convert_markdown_to_html(article.content),
                'status': 'draft',
                'excerpt': self._generate_excerpt(article.content)
            }
            
            # Set categories if available
            categories = self._extract_categories(article.title, article.content)
            if categories:
                post_data['categories'] = categories
            
            # Set featured image if provided
            if featured_image_id:
                post_data['featured_media'] = featured_image_id
                print(f"🖼️  Setting featured image ID: {featured_image_id}")
            
            async with aiohttp.ClientSession() as session:
                url = f"{self.site_url}/wp-json/wp/v2/posts"
                
                # Step 1: Create as draft
                async with session.post(url, headers=self.headers, json=post_data) as response:
                    if response.status == 201:
                        draft_result = await response.json()
                        post_id = draft_result['id']
                        print(f"📝 Article created as draft. Post ID: {post_id}")
                        
                        # Step 2: Immediately update to published
                        update_url = f"{self.site_url}/wp-json/wp/v2/posts/{post_id}"
                        update_data = {'status': 'publish'}
                        
                        async with session.post(update_url, headers=self.headers, json=update_data) as update_response:
                            if update_response.status == 200:
                                post_result = await update_response.json()
                                print(f"✅ Article published successfully. Post ID: {post_result['id']}")
                                print(f"📄 URL: {post_result['link']}")
                                return post_result
                            else:
                                print(f"⚠️ Failed to publish draft: {update_response.status}")
                                return draft_result  # Return draft if publish fails
                    else:
                        error_text = await response.text()
                        print(f"❌ Failed to publish article. Status: {response.status}")
                        print(f"Error: {error_text}")
                        return None
                        
        except Exception as e:
            print(f"❌ Error publishing article: {str(e)}")
            return None
    
    def publish_article_sync(self, article, scheduled_date: Optional[str] = None, featured_image_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
        """Synchronous version of publish_article"""
        try:
            # Create post with proper status and scheduling
            post_data = {
                'title': article.title,
                'content': self._convert_markdown_to_html(article.content),
                'excerpt': self._generate_excerpt(article.content)
            }
            
            # Set categories
            categories = self._extract_categories(article.title, article.content)
            if categories:
                post_data['categories'] = categories
            
            # Set featured image if provided
            if featured_image_id:
                post_data['featured_media'] = featured_image_id
                print(f"🖼️  Setting featured image ID: {featured_image_id}")
            
            # Handle scheduling
            if scheduled_date:
                post_data['status'] = 'future'
                post_data['date'] = scheduled_date
                print(f"📅 Scheduling article for: {scheduled_date}")
            else:
                post_data['status'] = 'publish'
                print(f"📝 Publishing article immediately")
            
            # Create post with final status
            url = f"{self.site_url}/wp-json/wp/v2/posts"
            response = requests.post(url, headers=self.headers, json=post_data, timeout=30)
            
            if response.status_code == 201:
                post_result = response.json()
                
                if scheduled_date:
                    print(f"📅 Article scheduled successfully. Post ID: {post_result['id']}")
                    print(f"⏰ Will publish at: {scheduled_date}")
                else:
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
        """Extract category IDs - always include Paving blog category (ID: 17)"""
        categories = []
        
        # Always add Paving category (ID: 17) for blog posts
        categories.append(17)
        
        return categories
    
    def _extract_tags(self, content: str) -> list:
        """Extract tags from content"""
        tags = []
        
        # For now, return empty list to avoid tag ID issues
        # Tags would need to be created or mapped to existing tag IDs
        
        return tags
    
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
    
    def get_media_images(self, per_page: int = 50, page: int = 1) -> Optional[Dict[str, Any]]:
        """Get uploaded media images from WordPress"""
        try:
            url = f"{self.site_url}/wp-json/wp/v2/media"
            params = {
                'media_type': 'image',
                'per_page': per_page,
                'page': page,
                'orderby': 'date',
                'order': 'desc'
            }
            
            response = requests.get(url, headers=self.headers, params=params, timeout=15)
            
            if response.status_code == 200:
                media_items = response.json()
                # Get total pages from headers for pagination
                total_pages = int(response.headers.get('X-WP-TotalPages', 1))
                
                # Format the response with image data we need
                formatted_media = []
                for item in media_items:
                    media_info = {
                        'id': item['id'],
                        'title': item['title']['rendered'],
                        'alt_text': item['alt_text'],
                        'caption': item['caption']['rendered'] if item['caption']['rendered'] else '',
                        'url': item['source_url'],
                        'thumbnail': item['media_details'].get('sizes', {}).get('thumbnail', {}).get('source_url', item['source_url']),
                        'medium': item['media_details'].get('sizes', {}).get('medium', {}).get('source_url', item['source_url']),
                        'date': item['date']
                    }
                    formatted_media.append(media_info)
                
                return {
                    'media': formatted_media,
                    'page': page,
                    'total_pages': total_pages,
                    'total_items': len(formatted_media)
                }
            else:
                print(f"❌ Failed to get media. Status: {response.status_code}")
                print(f"Error: {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Error getting media: {str(e)}")
            return None
    
    async def get_media_images_async(self, per_page: int = 50, page: int = 1) -> Optional[Dict[str, Any]]:
        """Async version of get_media_images"""
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.site_url}/wp-json/wp/v2/media"
                params = {
                    'media_type': 'image',
                    'per_page': per_page,
                    'page': page,
                    'orderby': 'date',
                    'order': 'desc'
                }
                
                async with session.get(url, headers=self.headers, params=params) as response:
                    if response.status == 200:
                        media_items = await response.json()
                        total_pages = int(response.headers.get('X-WP-TotalPages', 1))
                        
                        # Format the response
                        formatted_media = []
                        for item in media_items:
                            media_info = {
                                'id': item['id'],
                                'title': item['title']['rendered'],
                                'alt_text': item['alt_text'],
                                'caption': item['caption']['rendered'] if item['caption']['rendered'] else '',
                                'url': item['source_url'],
                                'thumbnail': item['media_details'].get('sizes', {}).get('thumbnail', {}).get('source_url', item['source_url']),
                                'medium': item['media_details'].get('sizes', {}).get('medium', {}).get('source_url', item['source_url']),
                                'date': item['date']
                            }
                            formatted_media.append(media_info)
                        
                        return {
                            'media': formatted_media,
                            'page': page,
                            'total_pages': total_pages,
                            'total_items': len(formatted_media)
                        }
                    else:
                        print(f"❌ Failed to get media. Status: {response.status}")
                        return None
                        
        except Exception as e:
            print(f"❌ Error getting media: {str(e)}")
            return None