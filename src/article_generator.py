import requests
import json
from datetime import datetime

def query_ollama(prompt):
    """Query the Ollama API with deepseek model"""
    try:
        response = requests.post('http://localhost:11434/api/generate',
            json={
                'model': 'llama3.1:8b',
                'prompt': prompt,
                'stream': False,
                'options': {
                    'temperature': 0.3,
                    'num_predict': 15000,
                    'top_p': 0.9,
                    'repeat_penalty': 1.1
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
    """Remove thinking process and formatting artifacts while preserving intended structure"""
    import re
    
    # Remove everything between <think> and </think> tags
    cleaned = re.sub(r'<think>.*?</think>', '', response, flags=re.DOTALL)
    
    # Remove any remaining thinking artifacts
    cleaned = re.sub(r'</?think>', '', cleaned)
    
    # Remove markdown heading artifacts (### or #### etc.) but keep our intended **bold** headers
    cleaned = re.sub(r'^#{1,6}\s*', '', cleaned, flags=re.MULTILINE)
    
    # Remove excessive asterisks (*** or more) but keep our intended **bold** formatting
    cleaned = re.sub(r'\*{3,}', '', cleaned)
    
    # Remove random underscores used as separators
    cleaned = re.sub(r'^_{3,}.*$', '', cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r'^-{3,}.*$', '', cleaned, flags=re.MULTILINE)
    
    # Remove "Here's" or "Here is" intro phrases that AI often adds
    cleaned = re.sub(r"^Here['']?s?\s+(the|an?)\s+", '', cleaned, flags=re.MULTILINE | re.IGNORECASE)
    
    # Remove meta comments about the article structure and requirements
    cleaned = re.sub(r'(?i)^(this article|the article|following the template).*$', '', cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r'CRITICAL REQUIREMENTS:.*$', '', cleaned, flags=re.DOTALL)
    cleaned = re.sub(r'Topic:.*$', '', cleaned, flags=re.DOTALL)
    cleaned = re.sub(r'Service:.*$', '', cleaned, flags=re.DOTALL)
    cleaned = re.sub(r'City:.*$', '', cleaned, flags=re.DOTALL)
    
    # Remove any stray HTML tags
    cleaned = re.sub(r'<[^>]+>', '', cleaned)
    
    # Fix bullet point inconsistencies - standardize to •
    cleaned = re.sub(r'^\s*[\-\*\+]\s+', '• ', cleaned, flags=re.MULTILINE)
    
    # Replace any remaining common placeholders with realistic examples
    placeholder_replacements = {
        r'\[Client Name?\]': 'Johnson Construction',
        r'\[client name?\]': 'Johnson Construction', 
        r'\[amount\]': '$15,500',
        r'\[specific amount\]': '$12,000',
        r'\[phone\]': '(555) 123-4567',
        r'\[website\]': 'www.example-paving.com',
        r'\[Street Name\]': 'Main Street',
        r'\[Area\]': 'Downtown',
        r'\[specific consequence\]': 'liability issues and customer complaints',
        r'\[timeframe\]': '3 weeks',
        r'\[specific property\]': 'commercial plaza',
        r'\[specific property name\]': 'Metro Shopping Center',
        r'\[specific problem\]': 'cracked and uneven surface',
        r'\[positive outcome\]': 'smooth, professional-grade surface',
        r'\[local conditions\]': 'harsh winter conditions',
        r'\[local weather challenge\]': 'freeze-thaw cycles',
        r'\[seasonal condition\]': 'winter weather',
    }
    
    for pattern, replacement in placeholder_replacements.items():
        cleaned = re.sub(pattern, replacement, cleaned, flags=re.IGNORECASE)
    
    # Remove any remaining brackets that might contain placeholders, but preserve section structure
    # Only replace brackets that appear to be placeholders (not part of section headers)
    cleaned = re.sub(r'\[(?!.*\*\*)[^\]]*\]', 'specific details', cleaned)
    
    # Convert section headers to HTML for proper display
    # First add line breaks before concatenated headers
    header_patterns = [
        r'([.!?])\s*(Project Story Opening)',
        r'([.!?])\s*(The Project Story)',
        r'([.!?])\s*(Why .* Properties Need Professional .*)',
        r'([.!?])\s*(Our .* Process)',
        r'([.!?])\s*(Benefits for .* Property Owners)',
        r'([.!?])\s*(Maintenance for .* Conditions)',
        r'([.!?])\s*(Why Choose Local .* Contractors)',
        r'([.!?])\s*(Getting Started)'
    ]
    
    # Add line breaks before headers
    for pattern in header_patterns:
        cleaned = re.sub(pattern, r'\1\n\n\2', cleaned, flags=re.IGNORECASE)
    
    # Convert headers to HTML
    html_conversions = [
        (r'\*\*(Project Story Opening)\*\*', r'<h2>\1</h2>'),
        (r'(^|\n)(Project Story Opening)(\n|$)', r'\1<h2>\2</h2>\3'),
        (r'\*\*(The Project Story)\*\*', r'<h2>\1</h2>'),
        (r'(^|\n)(The Project Story)(\n|$)', r'\1<h2>\2</h2>\3'),
        (r'\*\*(Why .* Properties Need Professional .*)\*\*', r'<h2>\1</h2>'),
        (r'(^|\n)(Why .* Properties Need Professional .*)(\n|$)', r'\1<h2>\2</h2>\3'),
        (r'\*\*(Our .* Process)\*\*', r'<h2>\1</h2>'),
        (r'(^|\n)(Our .* Process)(\n|$)', r'\1<h2>\2</h2>\3'),
        (r'\*\*(Benefits for .* Property Owners)\*\*', r'<h2>\1</h2>'),
        (r'(^|\n)(Benefits for .* Property Owners)(\n|$)', r'\1<h2>\2</h2>\3'),
        (r'\*\*(Maintenance for .* Conditions)\*\*', r'<h2>\1</h2>'),
        (r'(^|\n)(Maintenance for .* Conditions)(\n|$)', r'\1<h2>\2</h2>\3'),
        (r'\*\*(Why Choose Local .* Contractors)\*\*', r'<h2>\1</h2>'),
        (r'(^|\n)(Why Choose Local .* Contractors)(\n|$)', r'\1<h2>\2</h2>\3'),
        (r'\*\*(Getting Started)\*\*', r'<h2>\1</h2>'),
        (r'(^|\n)(Getting Started)(\n|$)', r'\1<h2>\2</h2>\3')
    ]
    
    # Apply HTML conversions
    for pattern, replacement in html_conversions:
        cleaned = re.sub(pattern, replacement, cleaned, flags=re.MULTILINE | re.IGNORECASE)
    
    # Remove remaining ** bold formatting after header conversion
    cleaned = re.sub(r'\*\*(.*?)\*\*', r'\1', cleaned)
    
    # Remove any remaining single asterisks
    cleaned = re.sub(r'\*', '', cleaned)
    
    # Fix line spacing and paragraph breaks
    # Add proper line breaks after colons (for section headers)
    cleaned = re.sub(r':([A-Z])', r':\n\n\1', cleaned)
    
    # Add line breaks before section headers (capitalized words at start of line)
    cleaned = re.sub(r'([.!?])\s*([A-Z][A-Za-z\s]+):', r'\1\n\n\2:', cleaned)
    
    # Clean up excessive whitespace but preserve structure
    cleaned = re.sub(r'\n\s*\n\s*\n+', '\n\n', cleaned)
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
You are a professional marketing copywriter specializing in contractor websites.  
Write a comprehensive, detailed blog article about: **{service} in {city}**.  
The article must be EXACTLY 1500-1600 words with substantial content in each section.
Each section must contain multiple detailed paragraphs with specific examples, numbers, and local details.
The tone should be professional, direct, results-focused, and emphasize local expertise.  
Do not mention word counts, brackets, or instructions in the output.  
Do not output section labels like "(75–100 words)" or placeholders.  
Do not use markdown (#, *, -).  

CRITICAL: Each section below must be EXPANDED with detailed content - write 2-3 full paragraphs per section.
Follow this structure with clear section headlines (each headline on its own line):  

1. Attention-Grabbing Headline  
   - Write a compelling, results-focused headline about a recent project.  

2. Project Story Opening  
   - Start with a hook: either Problem/Solution, Dramatic Transformation, or Results Teaser.  
   - Write 1 strong paragraph.  

3. The Project Story  
   - Write 3-4 detailed paragraphs covering: The Problem, Our Solution, The Results, Why It Worked.  
   - Include specific details: exact timelines (3-4 weeks), property values ($15,000-$25,000), safety improvements, money saved.
   - Use realistic client names, property types, and specific locations within {city}.

4. Why {city} Properties Need Professional {service}  
   - Write 2-3 paragraphs explaining local climate and environmental challenges specific to {city}.  
   - Detail 3-4 specific common issues property owners face with real examples.  
   - Extensively explain how professional {service} solves each problem with technical details.

5. Our {service} Process  
   - Write 2-3 detailed paragraphs explaining Assessment, Preparation, Installation, and Protection steps.
   - Include specific techniques, materials, and timeframes for each step.
   - Extensively cover how each step adapts to {city}'s unique climate and soil conditions.  

6. Benefits for {city} Property Owners  
   - Write a detailed paragraphs covering Durability, Safety, Value, and Cost-Effectiveness.
   - Include specific dollar amounts, percentage improvements, and real examples.
   - Write as natural flowing sentences with technical details, not bullet points.

7. Maintenance for {city} Conditions  
   - Write 2 detailed paragraphs providing comprehensive seasonal care tips (Spring, Summer, Fall, Winter).
   - Include specific maintenance schedules, products, and techniques for {city}'s climate.  
   - Extensively explain how proper maintenance extends property life with real timelines and cost savings.

8. Why Choose Local {city} Contractors  
   - Write 2-3 paragraphs highlighting climate knowledge, soil understanding, codes, suppliers, and community investment.
   - Include specific examples of local expertise and relationships that benefit customers.
   - Detail advantages of choosing local vs. out-of-town contractors.

9. Getting Started  
   - Write 1-2 paragraphs with a strong call to action encouraging immediate contact.
   - Include specific services offered, consultation process, and guarantees.  
   - End with: "Contact us today at [phone] or visit [website] for your free estimate." 
   

CRITICAL:  
- Each section must begin with a clear headline (no numbers, no brackets, no labels like “(75–100 words)”).  
- Paragraphs must flow naturally .  
- Replace {service} and {city} naturally throughout.  
- Final output must read like a polished website blog post with multiple sub-headlines, similar to https://www.williespaving.com/service/paving/tarmac-vs-asphalt-difference/.  




    Topic: {gap_topic}
    Service: {service}
    City: {city}

    Write the complete clean article now:
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