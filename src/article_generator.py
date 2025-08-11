import requests
import json
from datetime import datetime

def query_ollama(prompt):
    """Query the Ollama API with deepseek model"""
    try:
        response = requests.post('http://localhost:11434/api/generate',
            json={
                'model': 'deepseek-r1:1.5b',
                'prompt': prompt,
                'stream': False,
                'options': {
                    'temperature': 0.7,
                    'max_tokens': 2000
                }
            }
        )
        if response.status_code != 200:
            print(f"Error: Ollama API returned status code {response.status_code}")
            print(f"Response content: {response.text}")
            return None
            
        json_response = response.json()
        if 'response' not in json_response:
            print(f"Error: Unexpected API response format: {json_response}")
            return None
            
        # Clean the response by removing thinking process
        raw_response = json_response['response']
        cleaned_response = clean_llm_response(raw_response)
        return cleaned_response
    except Exception as e:
        print(f"Error querying Ollama: {str(e)}")
        return None

def clean_llm_response(response):
    """Remove thinking process and template artifacts, return only clean article content"""
    import re
    
    # Remove everything between <think> and </think> tags
    cleaned = re.sub(r'<think>.*?</think>', '', response, flags=re.DOTALL)
    
    # Remove any remaining thinking artifacts
    cleaned = re.sub(r'</?think>', '', cleaned)
    
    # Remove section headers with word counts (e.g., "**Project Story Opening (75-100 words)**")
    cleaned = re.sub(r'\*\*[^*]+\(\d+-\d+\s+words?\)\*\*:?\s*\n?', '', cleaned)
    
    # Remove standalone section headers (e.g., "**The Project Story**", "**Our Process**")
    cleaned = re.sub(r'\*\*[A-Z][^*]*\*\*:?\s*\n?', '', cleaned)
    
    # Remove word count indicators in parentheses
    cleaned = re.sub(r'\(\d+-\d+\s+words?\):?\s*', '', cleaned)
    
    # Remove template instruction lines
    cleaned = re.sub(r'Structure to follow.*?\n', '', cleaned)
    cleaned = re.sub(r'CRITICAL REQUIREMENTS.*?\n', '', cleaned)
    cleaned = re.sub(r'DO NOT include.*?\n', '', cleaned)
    
    # Remove any remaining template artifacts
    cleaned = re.sub(r'\[.*?\]', '', cleaned)  # Remove any remaining bracketed placeholders
    
    # Clean up excessive whitespace
    cleaned = re.sub(r'\n\s*\n\s*\n', '\n\n', cleaned)
    cleaned = re.sub(r'^\s+|\s+$', '', cleaned, flags=re.MULTILINE)
    cleaned = cleaned.strip()
    
    return cleaned

def generate_article_from_gap(gap_topic):
    """Generate a comprehensive article based on the research gap topic using the specific template format"""
    
    # Parse the gap topic to extract service and city
    parts = gap_topic.lower().split(' in ')
    if len(parts) >= 2:
        service = parts[0].strip()
        city = parts[1].strip()
    else:
        service = gap_topic.strip()
        city = "your area"
    
    prompt = f"""
    Write a professional contractor article about "{gap_topic}" following this structure, but DO NOT include any section headers, word count indicators, or template instructions in your output. Write it as a natural, flowing article that sounds like a human contractor wrote it.

    Structure to follow (but don't include these labels):

    1. Start with a compelling hook (75-100 words) using one of these styles:
    - Problem/Solution Hook: "When [Client] called us last month, their [surface] was a safety hazard costing them [consequence]. Three weeks later? Completely transformed and $[amount] in added property value."
    - Dramatic Transformation: "You wouldn't recognize the [property] on [Street] in [City]. What was once [problem] is now [positive outcome]. Here's how we did it in [timeframe]."
    - Results Teaser: "Last month's [Area] project proves the right [service] can transform more than pavement—it transforms your entire property."

    2. Tell the project story (150-200 words) covering:
    - The Problem: Brief description of client's specific issue
    - Our Solution: Concise explanation of approach taken  
    - The Results: Specific outcomes and benefits achieved
    - Why It Worked: Brief explanation of why professional service made the difference

    3. Explain why {city.title()} properties need professional {service} (100-150 words):
    "{city.title()}'s climate challenges create unique problems for surfaces. Common issues include: [3 specific problems]. Professional {service} solves these problems with proper materials, installation techniques, and local expertise that DIY approaches can't match."

    4. Describe the {service} process (75-100 words):
    Assessment, Preparation, Installation, Protection - each designed for {city}'s conditions.

    5. List benefits for {city.title()} property owners (100-125 words):
    Durability, Safety, Value, Cost-Effectiveness

    6. Cover maintenance for {city.title()} conditions (75-100 words):
    Seasonal care throughout the year

    7. Explain why to choose local {city.title()} contractors (75-100 words):
    Local expertise and community investment

    8. End with getting started section (50-75 words):
    Call-to-action with services offered

    CRITICAL REQUIREMENTS:
    - DO NOT include any section headers like "**Project Story Opening**" or "**The Project Story**"
    - DO NOT include word count indicators like "(75-100 words)"
    - DO NOT include any template instructions or backend notes
    - Write as one flowing article that reads naturally
    - Replace ALL bracketed placeholders with realistic, specific details
    - Use concrete examples and numbers (dollar amounts, timeframes, measurable results)
    - Sound like a real contractor wrote it, not an AI
    - Total word count: 500-750 words
    - Focus on local conditions for {city}

    Topic: {gap_topic}
    Service: {service}
    City: {city}

    Write the complete article now:
    """
    
    print(f"Generating article for: {gap_topic}")
    content = query_ollama(prompt)
    
    if not content:
        return None
    
    # Clean up the content
    content = content.strip()
    
    # Generate a compelling headline for the title
    headline_prompt = f"""
    Create a compelling, attention-grabbing headline for a contractor article about "{gap_topic}".
    
    Examples of good headlines:
    - "How We Saved This York Business $15,000 in Liability Claims"
    - "From Cracked Mess to Neighborhood Envy: A Main Street Success"  
    - "The Driveway That Increased Home Value by $8,000"
    - "Why This Restaurant Owner Calls Our Work 'Business-Changing'"
    
    Create a similar headline for {service} in {city}. Include specific dollar amounts, dramatic transformations, or compelling results.
    Return ONLY the headline, no quotes or extra text.
    """
    
    headline = query_ollama(headline_prompt)
    if not headline:
        headline = f"Professional {service.title()} Transforms {city.title()} Property"
    else:
        headline = headline.strip().strip('"').strip("'")
    
    # Create article object
    article = {
        "id": f"gen_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        "title": headline,
        "topic": gap_topic,
        "content": content,
        "status": "to_publish",
        "created_at": datetime.now().strftime("%Y-%m-%d"),
        "word_count": len(content.split()),
        "generated": True
    }
    
    return article

def generate_title_suggestions(gap_topic):
    """Generate alternative title suggestions for the article"""
    
    prompt = f"""
    Generate 5 compelling, SEO-friendly title suggestions for an article about "{gap_topic}".
    
    Requirements:
    - Include the exact phrase "{gap_topic}"
    - Professional and authoritative tone
    - Between 50-60 characters
    - Designed to attract clicks and convey expertise
    
    Return only the 5 titles, one per line, numbered 1-5.
    """
    
    response = query_ollama(prompt)
    if response:
        titles = [line.strip() for line in response.strip().split('\n') if line.strip()]
        return titles[:5]
    
    return []

def enhance_article_content(article_content, gap_topic):
    """Enhance existing article content with additional sections"""
    
    prompt = f"""
    Take this article about "{gap_topic}" and enhance it by adding:
    1. A "Frequently Asked Questions" section with 3-4 relevant FAQs
    2. A "Why Choose Professional Services" section
    3. Improve the conclusion with stronger call-to-action
    
    Original article:
    {article_content}
    
    Return the enhanced version:
    """
    
    enhanced_content = query_ollama(prompt)
    return enhanced_content if enhanced_content else article_content

if __name__ == "__main__":
    # Test the article generator
    test_gap = "residential paving in Lancaster"
    article = generate_article_from_gap(test_gap)
    
    if article:
        print("Article generated successfully!")
        print(f"Title: {article['title']}")
        print(f"Word count: {article['word_count']}")
        print(f"Content preview: {article['content'][:200]}...")
    else:
        print("Failed to generate article")