#!/usr/bin/env python3
"""
Test Research Gap Detection without LLM
Multi-layered matching approach for accurate URL analysis
"""

import json
import re
from difflib import SequenceMatcher
from typing import List, Dict, Tuple


def load_sitemap_urls(filename='sitemap_urls.json', limit=10) -> List[str]:
    """Load URLs from sitemap_urls.json file"""
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            urls = json.load(f)
            return urls[:limit]
    except Exception as e:
        print(f"Error loading sitemap URLs: {e}")
        return []


def normalize_url(url: str) -> str:
    """
    Normalize URL for comparison
    Extract the relevant part and clean it up
    """
    # Get the last meaningful part of the URL
    if url.endswith('/'):
        url = url[:-1]
    
    # Split by '/' and get the last part, or second to last if last is empty
    parts = url.split('/')
    if len(parts) > 1:
        slug = parts[-1] if parts[-1] else parts[-2]
    else:
        slug = url
    
    # Replace underscores and hyphens with spaces
    normalized = re.sub(r'[_-]', ' ', slug)
    
    # Remove special characters except spaces
    normalized = re.sub(r'[^\w\s]', '', normalized)
    
    # Convert to lowercase and strip
    return normalized.lower().strip()


def exact_phrase_match(service: str, location: str, url_slug: str) -> bool:
    """
    Method 1: Exact phrase matching
    Look for exact "service in location" phrase
    """
    search_phrase = f"{service} in {location}".lower()
    return search_phrase in url_slug.lower()


def token_based_match(service: str, location: str, url_slug: str) -> bool:
    """
    Method 2: Token-based matching
    Check if both service AND location exist as separate tokens
    """
    tokens = url_slug.lower().split()
    service_found = service.lower() in tokens
    location_found = location.lower() in tokens
    return service_found and location_found


def regex_pattern_match(service: str, location: str, url_slug: str) -> bool:
    """
    Method 3: Regex pattern matching
    Look for service followed by location with optional words between
    """
    # Create pattern: service...location (with word boundaries)
    pattern = rf'\b{re.escape(service.lower())}\b.*\b{re.escape(location.lower())}\b'
    return bool(re.search(pattern, url_slug.lower()))


def fuzzy_similarity_match(service: str, location: str, url_slug: str, threshold: float = 0.9) -> bool:
    """
    Method 4: Fuzzy string similarity
    Compare similarity between expected phrase and URL slug
    Requires service to be present first, then checks overall similarity
    """
    # First check if the service is actually in the URL (mandatory)
    if service.lower() not in url_slug.lower():
        return False  # Service must be present
    
    # Then check overall similarity with higher threshold
    expected_phrase = f"{service} in {location}".lower()
    similarity = SequenceMatcher(None, expected_phrase, url_slug.lower()).ratio()
    return similarity >= threshold


def comprehensive_match(service: str, location: str, url: str) -> Tuple[bool, str]:
    """
    Multi-layered matching approach
    Returns (is_match, method_used)
    """
    url_slug = normalize_url(url)
    
    # Method 1: Exact phrase match (most reliable)
    if exact_phrase_match(service, location, url_slug):
        return True, "exact_phrase"
    
    # Method 2: Token-based match
    if token_based_match(service, location, url_slug):
        return True, "token_based"
    
    # Method 3: Regex pattern match
    if regex_pattern_match(service, location, url_slug):
        return True, "regex_pattern"
    
    # Method 4: Fuzzy similarity (least strict)
    if fuzzy_similarity_match(service, location, url_slug, threshold=0.8):
        return True, "fuzzy_similarity"
    
    return False, "no_match"


def find_research_gaps_no_llm(services: List[str], locations: List[str]) -> Dict:
    """
    Find research gaps using non-LLM approach
    """
    print(f"Analyzing {len(services)} services × {len(locations)} locations...")
    
    # Load URLs from sitemap
    sitemap_urls = load_sitemap_urls()
    
    if not sitemap_urls:
        print("❌ No URLs found in sitemap_urls.json")
        return {"error": "No URLs found"}
    
    print(f"Loaded {len(sitemap_urls)} URLs from sitemap")
    
    gaps = []
    matches = {}
    
    # Check every combination of service + location
    for service in services:
        for location in locations:
            combination = f"{service} in {location}"
            found_match = False
            
            # Check against each URL
            for url in sitemap_urls:
                is_match, method = comprehensive_match(service, location, url)
                
                if is_match:
                    found_match = True
                    matches[combination] = {"url": url, "method": method}
                    print(f"✅ {combination} -> {url} ({method})")
                    break
            
            # If no match found, it's a research gap
            if not found_match:
                gaps.append(combination)
                print(f"❌ Gap: {combination}")
    
    # Final results
    print(f"\nResults: {len(matches)} matches, {len(gaps)} gaps found")
    
    return {
        "research_gaps": gaps,
        "matches": matches,
        "total_urls_processed": len(sitemap_urls),
        "total_gaps_found": len(gaps)
    }


def test_matching_methods():
    """Test different matching methods with examples"""
    print("Testing matching methods...")
    
    test_cases = [
        ("teaching", "manchester", "https://www.test.com/paving/teaching_in_manchester"),
        ("paving", "london", "https://www.construction.com/paving_london_area"),
        ("teaching", "manchester", "https://www.other.com/completely/different/page")
    ]
    
    for service, location, url in test_cases:
        is_match, method = comprehensive_match(service, location, url)
        result = "✅ MATCH" if is_match else "❌ NO MATCH"
        print(f"{service} in {location} vs {url} -> {result} ({method})")


if __name__ == "__main__":
    print("Research Gap Detection Test (No LLM)\n")
    
    # Test with sample data
    test_services = ["teaching", "paving"]
    test_locations = ["manchester", "london"]
    
    results = find_research_gaps_no_llm(test_services, test_locations)
    
    print("\nFinal Results:")
    print(json.dumps({
        "research_gaps": results.get("research_gaps", []),
        "matches": results.get("matches", {}),
        "total_urls_processed": results.get("total_urls_processed", 0),
        "total_gaps_found": results.get("total_gaps_found", 0)
    }, indent=2))