import json
import itertools
import re
import requests

def load_sitemap_urls(filepath, limit=10):
    """Load first 10 URLs from sitemap JSON file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            urls = json.load(f)
            urls = urls[:limit]  # Take first 10 URLs
            print(f"Loaded {len(urls)} URLs from sitemap")
            return urls
    except Exception as e:
        print(f"Error loading sitemap URLs: {e}")
        return []

def query_ollama(prompt):
    try:
        response = requests.post('http://localhost:11434/api/generate',
            json={
                'model': 'deepseek-r1:1.5b',  # Changed model
                'prompt': prompt,
                'stream': False,
                'options': {
                    'temperature': 0.1
                }
            }
        )
        if response.status_code != 200:
            print(f"Error: Ollama API returned status code {response.status_code}")
            print(f"Response content: {response.text}")  # Added to see error details
            return None
            
        json_response = response.json()
        if 'response' not in json_response:
            print(f"Error: Unexpected API response format: {json_response}")
            return None
            
        return json_response['response']
    except Exception as e:
        print(f"Error querying Ollama: {str(e)}")
        return None

def check_match(service, location, url):
    # 1) Normalize the slug exactly as before
    slug = normalize_text(url)  # e.g. "/paving-in-manchester/" → "paving in manchester"
    combo = f"{service} in {location}".lower()  # "paving in manchester"
    
    # 2) Strict Python phrase check
    if combo in slug:
        return True

    # 3) Fallback to LLM on the normalized slug
    prompt = f"""
    You are a strict URL‐slug matcher.

    Here is the normalized slug (lowercase, underscores/hyphens → spaces):

    {slug}

    Question: Does this slug contain the exact phrase "{combo}"?
    Answer ONLY “yes” or “no” (no extra text).
    """
    response = query_ollama(prompt)
    if not response:
        return False
    answer = response.strip().splitlines()[-1].lower()
    return answer == "yes"


def normalize_text(text):
    # Remove URL components and get last meaningful part
    text = text.split('/')[-2] if text.endswith('/') else text.split('/')[-1]
    
    # Replace special characters and dashes with spaces
    text = re.sub(r'[_-]', ' ', text)
    
    # Remove any remaining special characters
    text = re.sub(r'[^\w\s]', '', text)
    
    # Convert to lowercase
    text = text.lower()
    
    return text.strip()

# Test data with more specific test cases
services = [
    "teaching"
]

locations = [
    "Manchester"
]

# Load URLs from JSON file
print("Loading URLs from sitemap_urls.json...")
sitemap_urls = load_sitemap_urls('sitemap_urls.json', limit=10)

if not sitemap_urls:
    print("Error: No URLs loaded from sitemap file")
    exit(1)

print("\nProcessing URLs:")
for url in sitemap_urls:
    print(f"- {url}")

# Find gaps
gaps = []
matches = {}

for service in services:
    for location in locations:
        combo = f"{service} in {location}"
        found_match = False
        
        # Check if this combination is already found
        if combo in matches:
            print(f"Already found match for: {combo}")
            continue
            
        for url in sitemap_urls:
            if check_match(service, location, url):
                found_match = True
                matches[combo] = {"url": url}
                print(f"Found match: {combo} -> {url}")
                # Important: Break out of URL checking loop once match is found
                break
        
        # Only add to gaps if no match was found after checking all URLs
        if not found_match:
            gaps.append(combo)
            print(f"Found research gap: {combo}")

# Remove any combinations from gaps that are in matches
gaps = [gap for gap in gaps if gap not in matches]

# Output results with gaps highlighted
result = {
    "research_gaps": gaps,
    "matches": matches,
    "total_urls_processed": len(sitemap_urls),
    "total_gaps_found": len(gaps)
}

print("\nFinal Results:")
print(json.dumps(result, indent=2))
print(f"\nTotal Research Gaps Found: {len(gaps)}")
if gaps:
    print("\nResearch Gaps:")
    for gap in gaps:
        print(f"- {gap}")