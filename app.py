import streamlit as st
import json
import os
from datetime import datetime
import pandas as pd
import time
import sys
sys.path.append('src')
from article_generator import generate_article_from_gap
import requests
import re

st.set_page_config(
    page_title="Research Gap Pipeline",
    page_icon="📈",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for modern styling
st.markdown("""
<style>
    .main > div {
        padding-top: 2rem;
    }
    
    .stSidebar > div > div > div {
        padding-top: 2rem;
    }
    
    .article-card {
        background: white;
        border: 1px solid #e1e5e9;
        border-radius: 8px;
        padding: 1rem;
        margin-bottom: 0.5rem;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    
    .article-card:hover {
        border-color: #ff6b6b;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .article-card.selected {
        border-color: #ff6b6b;
        background: #fff5f5;
    }
    
    .publish-button {
        background: linear-gradient(90deg, #ff6b6b 0%, #ee5a52 100%);
        color: white;
        border: none;
        padding: 0.75rem 2rem;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    
    .publish-button:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(255,107,107,0.3);
    }
    
    .filter-button {
        width: 100%;
        margin-bottom: 0.5rem;
    }
    
    .gap-badge {
        background: #fff3cd;
        color: #856404;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.8rem;
        font-weight: 500;
    }
    
    .published-badge {
        background: #d1edff;
        color: #0c5460;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.8rem;
        font-weight: 500;
    }
    
    .tag-container {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin: 0.5rem 0;
    }
    
    .tag {
        background: #e3f2fd;
        color: #1565c0;
        padding: 0.25rem 0.5rem;
        border-radius: 20px;
        font-size: 0.8rem;
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
    }
    
    .tag-remove {
        background: #ff4444;
        color: white;
        border: none;
        border-radius: 50%;
        width: 16px;
        height: 16px;
        font-size: 10px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }
</style>
""", unsafe_allow_html=True)

# Initialize session state
if 'articles' not in st.session_state:
    st.session_state.articles = []
if 'selected_article' not in st.session_state:
    st.session_state.selected_article = None
if 'filter_mode' not in st.session_state:
    st.session_state.filter_mode = "to_publish"
if 'research_gaps' not in st.session_state:
    st.session_state.research_gaps = []
if 'services_tags' not in st.session_state:
    st.session_state.services_tags = []
if 'locations_tags' not in st.session_state:
    st.session_state.locations_tags = []
if 'generated_gaps' not in st.session_state:
    st.session_state.generated_gaps = set()

def load_sample_articles():
    """Load some sample articles for demonstration"""
    if not st.session_state.articles:
        st.session_state.articles = []
    
    if not st.session_state.research_gaps:
        st.session_state.research_gaps = []

def filter_articles():
    """Filter articles based on current filter mode"""
    return [article for article in st.session_state.articles 
            if article['status'] == st.session_state.filter_mode]

def render_tags(tag_list, tag_type):
    """Render tags with remove buttons"""
    if tag_list:
        tags_html = "<div class='tag-container'>"
        for i, tag in enumerate(tag_list):
            tags_html += f"""
                <div class='tag'>
                    {tag}
                    <button class='tag-remove' onclick='removeTag("{tag_type}", {i})'>×</button>
                </div>
            """
        tags_html += "</div>"
        st.markdown(tags_html, unsafe_allow_html=True)

def add_tag(tag_type, value):
    """Add a tag to the specified list"""
    if tag_type == "services" and value not in st.session_state.services_tags:
        st.session_state.services_tags.append(value)
    elif tag_type == "locations" and value not in st.session_state.locations_tags:
        st.session_state.locations_tags.append(value)

def remove_tag(tag_type, index):
    """Remove a tag from the specified list"""
    if tag_type == "services" and 0 <= index < len(st.session_state.services_tags):
        st.session_state.services_tags.pop(index)
    elif tag_type == "locations" and 0 <= index < len(st.session_state.locations_tags):
        st.session_state.locations_tags.pop(index)

def main():
    load_sample_articles()
    
    # Sidebar
    with st.sidebar:
        st.title("Research Gap Pipeline")
        
        # Filter buttons
        col1, col2 = st.columns(2)
        with col1:
            if st.button("To Publish", key="filter_to_publish", 
                        type="primary" if st.session_state.filter_mode == "to_publish" else "secondary"):
                st.session_state.filter_mode = "to_publish"
                st.rerun()
        
        with col2:
            if st.button("Published", key="filter_published",
                        type="primary" if st.session_state.filter_mode == "published" else "secondary"):
                st.session_state.filter_mode = "published"
                st.rerun()
        
        st.divider()
        
        # Article list
        filtered_articles = filter_articles()
        st.subheader(f"{st.session_state.filter_mode.replace('_', ' ').title()} Articles ({len(filtered_articles)})")
        
        for article in filtered_articles:
            with st.container():
                if st.button(
                    f"**{article['title']}**\n{article['topic']}", 
                    key=f"article_{article['id']}",
                    help=f"Created: {article['created_at']} | {article['word_count']} words"
                ):
                    st.session_state.selected_article = article
                    st.rerun()
        
        st.divider()
        
        # Add sitemap section
        st.subheader("Add Sitemap")
        sitemap_url = st.text_input("Sitemap URL", placeholder="https://example.com/sitemap.xml")
        
        if st.button("Analyze Sitemap", type="primary"):
            if sitemap_url:
                analyze_sitemap(sitemap_url)
            else:
                st.error("Please enter a sitemap URL")

    # Main content area
    if st.session_state.selected_article:
        show_article_detail()
    else:
        show_dashboard()

def query_ollama(prompt):
    """Query the Ollama API with deepseek model"""
    try:
        response = requests.post('http://localhost:11434/api/generate',
            json={
                'model': 'deepseek-r1:1.5b',
                'prompt': prompt,
                'stream': False,
                'options': {
                    'temperature': 0.1
                }
            }
        )
        if response.status_code != 200:
            return None
            
        json_response = response.json()
        if 'response' not in json_response:
            return None
            
        return json_response['response']
    except Exception as e:
        return None

def load_sitemap_urls(limit=10):
    """Load URLs from sitemap_urls.json file"""
    try:
        with open('sitemap_urls.json', 'r', encoding='utf-8') as f:
            urls = json.load(f)
            return urls[:limit]
    except Exception as e:
        st.error(f"Error loading sitemap URLs: {e}")
        return []

def normalize_text(text):
    """Normalize text for comparison"""
    text = text.split('/')[-2] if text.endswith('/') else text.split('/')[-1]
    text = re.sub(r'[_-]', ' ', text)
    text = re.sub(r'[^\w\s]', '', text)
    text = text.lower()
    return text.strip()

def check_match(service, location, url):
    """Check if service and location combination matches the URL"""
    slug = normalize_text(url)
    combo = f"{service} in {location}".lower()
    
    if combo in slug:
        return True

    prompt = f"""
    You are a strict URL-slug matcher.

    Here is the normalized slug (lowercase, underscores/hyphens → spaces):

    {slug}

    Question: Does this slug contain the exact phrase "{combo}"?
    Answer ONLY "yes" or "no" (no extra text).
    """
    response = query_ollama(prompt)
    if not response:
        return False
    answer = response.strip().splitlines()[-1].lower()
    return answer == "yes"

def find_research_gaps_from_tags():
    """Find research gaps using tags from session state"""
    services = st.session_state.services_tags
    locations = st.session_state.locations_tags
    find_research_gaps_logic(services, locations)

def find_research_gaps(services_input, locations_input):
    """Find research gaps based on multiple services and locations"""
    # Parse comma-separated inputs
    services = [s.strip() for s in services_input.split(',') if s.strip()]
    locations = [l.strip() for l in locations_input.split(',') if l.strip()]
    find_research_gaps_logic(services, locations)

def find_research_gaps_logic(services, locations):
    """Core logic for finding research gaps"""
    with st.spinner("Analyzing URLs for research gaps..."):
        # Load URLs from sitemap
        sitemap_urls = load_sitemap_urls(10)
        
        if not sitemap_urls:
            st.error("No URLs found in sitemap_urls.json")
            return
        
        gaps = []
        matches = {}
        
        st.write(f"Checking {len(services)} services against {len(locations)} locations...")
        
        # Check every combination of service + location
        for svc in services:
            for loc in locations:
                combo = f"{svc} in {loc}"
                found_match = False
                
                # Check if this combination exists in any URL
                for url in sitemap_urls:
                    if check_match(svc, loc, url):
                        found_match = True
                        matches[combo] = {"url": url}
                        st.write(f"✅ Found: {combo} -> {url}")
                        break
                
                # If no match found, it's a research gap
                if not found_match:
                    gaps.append(combo)
                    st.write(f"❌ Gap: {combo}")
        
        # Clear old gaps and add new ones
        st.session_state.research_gaps = gaps
        
        st.write(f"\n**Results:**")
        st.write(f"- Total combinations checked: {len(services) * len(locations)}")
        st.write(f"- Matches found: {len(matches)}")
        st.write(f"- Research gaps: {len(gaps)}")
        
        if gaps:
            st.success(f"Found {len(gaps)} research gaps!")
        else:
            st.info("No research gaps found - all service+location combinations are covered!")

def analyze_sitemap(sitemap_url):
    """Analyze sitemap URL (placeholder for future implementation)"""
    st.warning("Sitemap analysis feature coming soon. Use the Research Gap Analysis above instead.")

def show_dashboard():
    """Show the main dashboard"""
    st.title("Research Gap Pipeline Dashboard")
    
    # Stats cards
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        total_articles = len(st.session_state.articles)
        st.metric("Total Articles", total_articles)
    
    with col2:
        to_publish = len([a for a in st.session_state.articles if a['status'] == 'to_publish'])
        st.metric("To Publish", to_publish)
    
    with col3:
        published = len([a for a in st.session_state.articles if a['status'] == 'published'])
        st.metric("Published", published)
    
    with col4:
        research_gaps = len(st.session_state.research_gaps)
        st.metric("Research Gaps", research_gaps)
    
    # Research Gap Analysis Section
    st.subheader("Research Gap Analysis")
    
    # Services section
    st.write("**Services:**")
    with st.form("service_form", clear_on_submit=True):
        col1, col2 = st.columns([3, 1])
        with col1:
            service_input = st.text_input("Add Service", placeholder="e.g., paving", key="service_input_form")
        with col2:
            service_submitted = st.form_submit_button("Add")
        
        if service_submitted and service_input:
            add_tag("services", service_input.strip())
            st.rerun()
    
    # Display service tags in modern format with inline remove buttons
    if st.session_state.services_tags:
        # Display tags in a flex container with close spacing
        for i in range(0, len(st.session_state.services_tags), 4):
            cols = st.columns(4)
            for j, col in enumerate(cols):
                if i + j < len(st.session_state.services_tags):
                    tag = st.session_state.services_tags[i + j]
                    with col:
                        # Create tag with inline X button using custom HTML and CSS
                        tag_with_button = f"""
                        <div style='
                            background: #e3f2fd; 
                            color: #1565c0; 
                            padding: 0.25rem 0.5rem; 
                            border-radius: 20px; 
                            font-size: 0.8rem; 
                            display: inline-flex; 
                            align-items: center; 
                            gap: 0.5rem;
                            width: fit-content;
                            margin-bottom: 0.25rem;
                            justify-content: space-between;
                        '>
                            <span>{tag}</span>
                            <span style='
                                background: #ff4444;
                                color: white;
                                border-radius: 50%;
                                width: 16px;
                                height: 16px;
                                font-size: 10px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                cursor: pointer;
                                margin-left: 0.25rem;
                            '>×</span>
                        </div>
                        """
                        st.markdown(tag_with_button, unsafe_allow_html=True)
                        
                        # Invisible button for removal functionality
                        if st.button("×", key=f"remove_service_{i+j}", help=f"Remove {tag}"):
                            st.session_state.services_tags.pop(i + j)
                            st.rerun()
    
    st.write("**Locations:**")
    with st.form("location_form", clear_on_submit=True):
        col1, col2 = st.columns([3, 1])
        with col1:
            location_input = st.text_input("Add Location", placeholder="e.g., Manchester", key="location_input_form")
        with col2:
            location_submitted = st.form_submit_button("Add")
        
        if location_submitted and location_input:
            add_tag("locations", location_input.strip())
            st.rerun()
    
    # Display location tags in modern format with inline remove buttons
    if st.session_state.locations_tags:
        # Display tags in a flex container with close spacing
        for i in range(0, len(st.session_state.locations_tags), 4):
            cols = st.columns(4)
            for j, col in enumerate(cols):
                if i + j < len(st.session_state.locations_tags):
                    tag = st.session_state.locations_tags[i + j]
                    with col:
                        # Create tag with inline X button using custom HTML and CSS
                        tag_with_button = f"""
                        <div style='
                            background: #e3f2fd; 
                            color: #1565c0; 
                            padding: 0.25rem 0.5rem; 
                            border-radius: 20px; 
                            font-size: 0.8rem; 
                            display: inline-flex; 
                            align-items: center; 
                            gap: 0.5rem;
                            width: fit-content;
                            margin-bottom: 0.25rem;
                            justify-content: space-between;
                        '>
                            <span>{tag}</span>
                            <span style='
                                background: #ff4444;
                                color: white;
                                border-radius: 50%;
                                width: 16px;
                                height: 16px;
                                font-size: 10px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                cursor: pointer;
                                margin-left: 0.25rem;
                            '>×</span>
                        </div>
                        """
                        st.markdown(tag_with_button, unsafe_allow_html=True)
                        
                        # Invisible button for removal functionality
                        if st.button("×", key=f"remove_location_{i+j}", help=f"Remove {tag}"):
                            st.session_state.locations_tags.pop(i + j)
                            st.rerun()
    
    # Find gaps button
    if st.button("Find Research Gaps", type="primary", key="find_gaps"):
        if st.session_state.services_tags and st.session_state.locations_tags:
            find_research_gaps_from_tags()
        else:
            st.error("Please add at least one service and one location")

    st.divider()

    # Research gaps section
    if st.session_state.research_gaps:
        st.subheader("Latest Research Gaps Found")
        
        for i, gap in enumerate(st.session_state.research_gaps[:10]):
            col1, col2 = st.columns([3, 1])
            with col1:
                st.markdown(f"**{gap}**")
            with col2:
                if gap in st.session_state.generated_gaps:
                    st.success("Generated ✓")
                else:
                    if st.button("Generate Article", key=f"generate_{i}"):
                        generate_article_from_gap_ui(gap)
    
    # Recent activity
    st.subheader("Recent Articles")
    if st.session_state.articles:
        df = pd.DataFrame(st.session_state.articles)
        df = df.sort_values('created_at', ascending=False)
        st.dataframe(
            df[['title', 'topic', 'status', 'created_at', 'word_count']], 
            use_container_width=True,
            hide_index=True
        )
    else:
        st.info("No articles yet. Analyze a sitemap to get started!")

def show_article_detail():
    """Show detailed view of selected article"""
    article = st.session_state.selected_article
    
    # Header
    col1, col2 = st.columns([3, 1])
    with col1:
        st.title(article['title'])
        st.markdown(f"**Topic:** {article['topic']}")
        st.markdown(f"**Status:** {article['status'].replace('_', ' ').title()}")
        st.markdown(f"**Created:** {article['created_at']} | **Words:** {article['word_count']}")
    
    with col2:
        if article['status'] == 'to_publish':
            if st.button("Publish to WordPress", type="primary", key="publish_btn"):
                publish_article(article)
        elif article['status'] == 'published':
            st.markdown('<span class="published-badge">Published</span>', unsafe_allow_html=True)
    
    st.divider()
    
    # Content
    st.subheader("Article Content")
    
    # Editable content
    new_content = st.text_area(
        "Content", 
        value=article['content'],
        height=400,
        key="article_content"
    )
    
    col1, col2, col3, col4 = st.columns([1, 1, 1, 1])
    with col1:
        if st.button("Save Changes"):
            article['content'] = new_content
            st.success("Article saved!")
            st.rerun()
    
    with col2:
        if st.button("Edit Title"):
            st.session_state.editing_title = True
            st.rerun()
    
    with col3:
        if st.button("Back to Dashboard"):
            st.session_state.selected_article = None
            st.rerun()
    
    # Edit title functionality
    if st.session_state.get('editing_title', False):
        st.divider()
        st.subheader("Edit Article Details")
        new_title = st.text_input("Title", value=article['title'], key="edit_title")
        new_topic = st.text_input("Topic", value=article['topic'], key="edit_topic")
        
        col1, col2 = st.columns(2)
        with col1:
            if st.button("Save Title & Topic"):
                article['title'] = new_title
                article['topic'] = new_topic
                st.session_state.editing_title = False
                st.success("Title and topic updated!")
                st.rerun()
        with col2:
            if st.button("Cancel Edit"):
                st.session_state.editing_title = False
                st.rerun()

def generate_article_from_gap_ui(gap):
    """Generate article from research gap using AI"""
    with st.spinner("Generating article with AI..."):
        try:
            article = generate_article_from_gap(gap)
            
            if article:
                # Add to articles list and mark gap as generated
                st.session_state.articles.append(article)
                st.session_state.selected_article = article
                st.session_state.generated_gaps.add(gap)
                st.success("Article generated successfully!")
                st.rerun()
            else:
                st.error("Failed to generate article. Please check your Ollama connection.")
                
        except Exception as e:
            st.error(f"Error generating article: {str(e)}")

def publish_article(article):
    """Mock publish article function for UI demonstration"""
    with st.spinner("Publishing to WordPress..."):
        # Simulate publishing time
        time.sleep(2)
        # Update status
        article['status'] = 'published'
        st.success("Article published successfully to WordPress!")
        time.sleep(1)  # Brief pause to show success message
        st.rerun()

if __name__ == "__main__":
    main()