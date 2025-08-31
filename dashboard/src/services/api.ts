const API_BASE_URL = 'http://localhost:8000';

export interface Article {
  id?: string;
  title: string;
  content: string;
  status: 'published' | 'to_publish' | 'scheduled';
  created_at?: string;
  word_count?: number;
  generated?: boolean;
  scheduled_date?: string;
}

export interface ResearchGap {
  id?: string;
  service: string;
  location: string;
  combination: string;
  found_at?: string;
}

export interface WordPressAuth {
  site_url: string;
  username: string;
  app_password: string;
}

export interface Stats {
  total_articles: number;
  published_articles: number;
  to_publish_articles: number;
  scheduled_articles: number;
  total_research_gaps: number;
  wordpress_authenticated: boolean;
}

export interface WordPressPost {
  id: number;
  title: string;
  link: string;
  date: string;
  modified: string;
  status: string;
  excerpt: string;
  categories: string[];
  category_ids: number[];
  author: number;
  word_count: number;
}

export interface WordPressMedia {
  id: number;
  title: string;
  alt_text: string;
  caption: string;
  url: string;
  thumbnail: string;
  medium: string;
  date: string;
}

class ApiService {
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text() as unknown as T;
      }
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // WordPress Authentication
  async authenticateWordPress(auth: WordPressAuth): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/auth/wordpress', {
      method: 'POST',
      body: JSON.stringify(auth),
    });
  }

  async getWordPressAuthStatus(): Promise<{ authenticated: boolean }> {
    return this.request<{ authenticated: boolean }>('/auth/wordpress/status');
  }

  async logoutWordPress(): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/auth/wordpress', {
      method: 'DELETE',
    });
  }

  // Articles
  async getArticles(): Promise<Article[]> {
    return this.request<Article[]>('/articles');
  }

  async createArticle(article: Omit<Article, 'id'>): Promise<Article> {
    return this.request<Article>('/articles', {
      method: 'POST',
      body: JSON.stringify(article),
    });
  }

  async updateArticle(id: string, article: Article): Promise<Article> {
    return this.request<Article>(`/articles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(article),
    });
  }

  async deleteArticle(id: string): Promise<{ 
    success: boolean; 
    message: string; 
    wordpress_deleted?: boolean; 
    wordpress_error?: string | null;
  }> {
    return this.request<{ 
      success: boolean; 
      message: string; 
      wordpress_deleted?: boolean; 
      wordpress_error?: string | null;
    }>(`/articles/${id}`, {
      method: 'DELETE',
    });
  }

  async publishArticle(id: string, scheduledDate?: string, featuredImageId?: number): Promise<{
    success: boolean;
    message: string;
    wordpress_post_id?: number;
    wordpress_url?: string;
    scheduled?: boolean;
    scheduled_date?: string;
  }> {
    const body: any = {};
    if (scheduledDate) body.scheduled_date = scheduledDate;
    if (featuredImageId) body.featured_image_id = featuredImageId;
    
    return this.request<{
      success: boolean;
      message: string;
      wordpress_post_id?: number;
      wordpress_url?: string;
      scheduled?: boolean;
      scheduled_date?: string;
    }>(`/articles/${id}/publish`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // Research Gap Analysis
  async analyzeResearchGaps(services: string[], locations: string[]): Promise<{
    success: boolean;
    total_combinations: number;
    matches_found: number;
    research_gaps: number;
    gaps: ResearchGap[];
    matches: Record<string, { url: string; method: string }>;
  }> {
    return this.request<{
      success: boolean;
      total_combinations: number;
      matches_found: number;
      research_gaps: number;
      gaps: ResearchGap[];
      matches: Record<string, { url: string; method: string }>;
    }>('/research-gaps/analyze', {
      method: 'POST',
      body: JSON.stringify({ services, locations }),
    });
  }

  async getResearchGaps(): Promise<ResearchGap[]> {
    return this.request<ResearchGap[]>('/research-gaps');
  }

  // Article Generation
  async generateArticle(gapTopic: string): Promise<Article> {
    return this.request<Article>('/articles/generate', {
      method: 'POST',
      body: JSON.stringify({ gap_topic: gapTopic }),
    });
  }

  // Statistics
  async getStats(): Promise<Stats> {
    return this.request<Stats>('/stats');
  }

  // Check scheduled articles
  async checkScheduledArticles(): Promise<{ success: boolean; message: string; updated: number }> {
    return this.request<{ success: boolean; message: string; updated: number }>('/articles/check-scheduled', {
      method: 'POST',
    });
  }

  // WordPress Posts
  async getWordPressPosts(perPage: number = 100, page: number = 1, fetchAll: boolean = true): Promise<{
    posts: WordPressPost[];
    total_posts: number;
    page: number;
    per_page: number;
    fetched_all?: boolean;
  }> {
    return this.request<{
      posts: WordPressPost[];
      total_posts: number;
      page: number;
      per_page: number;
      fetched_all?: boolean;
    }>(`/wordpress/posts?per_page=${perPage}&page=${page}&fetch_all=${fetchAll}`);
  }

  // WordPress Media Library
  async getWordPressMedia(perPage: number = 50, page: number = 1): Promise<{
    media: WordPressMedia[];
    page: number;
    total_pages: number;
    total_items: number;
  }> {
    return this.request<{
      media: WordPressMedia[];
      page: number;
      total_pages: number;
      total_items: number;
    }>(`/wordpress/media?per_page=${perPage}&page=${page}`);
  }

  // Health Check
  async healthCheck(): Promise<{ message: string; version: string }> {
    return this.request<{ message: string; version: string }>('/');
  }
}

export const apiService = new ApiService();