from usp.tree import sitemap_tree_for_homepage
import json

def export_sitemap_to_json(root_sitemap_url, output_path):
    # Parse the sitemap (and any nested sitemaps)
    tree = sitemap_tree_for_homepage(root_sitemap_url)
    
    # Collect every page URL
    urls = [page.url for page in tree.all_pages()]
    
    # Write out as JSON
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(urls, f, indent=2)
    
    print(f"Saved {len(urls)} URLs to {output_path}")

if __name__ == "__main__":
    ROOT_SITEMAP = "https://www.williespaving.com/sitemap.xml"
    OUTPUT_FILE = "sitemap_urls.json"
    
    export_sitemap_to_json(ROOT_SITEMAP, OUTPUT_FILE)
