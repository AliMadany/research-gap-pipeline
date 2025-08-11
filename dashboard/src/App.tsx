import { useState, useEffect } from 'react'
import { 
  AppShell, 
  Text, 
  Group, 
  Stack, 
  Avatar, 
  UnstyledButton,
  Button,
  Card,
  Grid,
  SimpleGrid,
  Badge,
  Divider,
  Title,
  rem
} from '@mantine/core'
import { 
  IconDashboard, 
  IconFileText, 
  IconSettings, 
  IconChartBar,
  IconPlus,
  IconX,
  IconSearch
} from '@tabler/icons-react'
import { apiService, type Article, type ResearchGap, type Stats, type WordPressPost } from './services/api'
import { WordPressAuthModal, WordPressStatus } from './components/WordPressAuth'

interface NavItem {
  icon: React.ComponentType<any>
  label: string
  active?: boolean
}

interface StatsCardProps {
  title: string
  value: string | number
  color: string
}

function StatsCard({ title, value, color }: StatsCardProps) {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Group justify="space-between">
        <div>
          <Text size="sm" c="dimmed" tt="uppercase" fw={700}>
            {title}
          </Text>
          <Text fw={700} size="xl" style={{ color }}>
            {value}
          </Text>
        </div>
      </Group>
    </Card>
  )
}

// Interfaces now imported from API service

function App() {
  const [activeTab, setActiveTab] = useState('overview')
  const [services, setServices] = useState<string[]>([])
  const [locations, setLocations] = useState<string[]>([])
  const [serviceInput, setServiceInput] = useState('')
  const [locationInput, setLocationInput] = useState('')
  const [articles, setArticles] = useState<Article[]>([])
  const [researchGaps, setResearchGaps] = useState<ResearchGap[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [sitemapsAnalyzed, setSitemapsAnalyzed] = useState<number>(0)
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false)
  const [analysisStatus, setAnalysisStatus] = useState<string>('')
  const [editingArticle, setEditingArticle] = useState<Article | null>(null)
  const [viewingArticle, setViewingArticle] = useState<Article | null>(null)
  const [editTitle, setEditTitle] = useState<string>('')
  const [editContent, setEditContent] = useState<string>('')
  const [wordpressAuthModalOpen, setWordpressAuthModalOpen] = useState(false)
  const [wordpressAuthenticated, setWordpressAuthenticated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [wordpressPosts, setWordpressPosts] = useState<WordPressPost[]>([])
  const [loadingWpPosts, setLoadingWpPosts] = useState(false)

  const navItems: NavItem[] = [
    { icon: IconDashboard, label: 'Overview', active: activeTab === 'overview' },
    { icon: IconFileText, label: 'Research Analysis', active: activeTab === 'researchanalysis' },
    { icon: IconFileText, label: 'Articles', active: activeTab === 'articles' },
    { icon: IconFileText, label: 'WordPress Posts', active: activeTab === 'wordpressposts' },
    { icon: IconChartBar, label: 'Sitemaps', active: activeTab === 'sitemaps' },
    { icon: IconSettings, label: 'Settings', active: activeTab === 'settings' },
  ]

  // Load data on component mount
  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    setLoading(true)
    try {
      // Load articles, research gaps, stats, and WordPress auth status
      const [articlesData, gapsData, statsData, authStatus] = await Promise.all([
        apiService.getArticles(),
        apiService.getResearchGaps(),
        apiService.getStats(),
        apiService.getWordPressAuthStatus()
      ])

      setArticles(articlesData)
      setResearchGaps(gapsData)
      setStats(statsData)
      setWordpressAuthenticated(authStatus.authenticated)
    } catch (error) {
      console.error('Failed to load initial data:', error)
    } finally {
      setLoading(false)
    }
  }

  const addService = () => {
    if (serviceInput.trim() && !services.includes(serviceInput.trim())) {
      setServices([...services, serviceInput.trim()])
      setServiceInput('')
    }
  }

  const addLocation = () => {
    if (locationInput.trim() && !locations.includes(locationInput.trim())) {
      setLocations([...locations, locationInput.trim()])
      setLocationInput('')
    }
  }

  const removeService = (service: string) => {
    setServices(services.filter(s => s !== service))
  }

  const removeLocation = (location: string) => {
    setLocations(locations.filter(l => l !== location))
  }

  // Utility functions now handled by the backend API

  // Unused matching functions - commented out to fix TypeScript warnings
  // These functions are available in the backend API
  
  /* 
  const exactPhraseMatch = (service: string, location: string, urlSlug: string): boolean => {
    const searchPhrase = `${service} in ${location}`.toLowerCase()
    return urlSlug.toLowerCase().includes(searchPhrase)
  }

  const tokenBasedMatch = (service: string, location: string, urlSlug: string): boolean => {
    const tokens = urlSlug.toLowerCase().split(' ')
    const serviceFound = tokens.includes(service.toLowerCase())
    const locationFound = tokens.includes(location.toLowerCase())
    return serviceFound && locationFound
  }

  const regexPatternMatch = (service: string, location: string, urlSlug: string): boolean => {
    const serviceEscaped = service.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const locationEscaped = location.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = new RegExp(`\\b${serviceEscaped}\\b.*\\b${locationEscaped}\\b`, 'i')
    return pattern.test(urlSlug.toLowerCase())
  }

  const fuzzySimilarityMatch = (service: string, location: string, urlSlug: string, threshold = 0.9): boolean => {
    if (!urlSlug.toLowerCase().includes(service.toLowerCase())) {
      return false
    }
    
    const expectedPhrase = `${service} in ${location}`.toLowerCase()
    const similarity = calculateSimilarity(expectedPhrase, urlSlug.toLowerCase())
    return similarity >= threshold
  }

  const calculateSimilarity = (str1: string, str2: string): number => {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    
    if (longer.length === 0) return 1.0
    
    const editDistance = levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix = []
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }
    
    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }
    
    return matrix[str2.length][str1.length]
  }
  */

  // Comprehensive matching function - keeping for potential future use
  // const comprehensiveMatch = (service: string, location: string, url: string): { isMatch: boolean; method: string } => {
  //   const urlSlug = normalizeUrl(url)
    
  //   // Method 1: Exact phrase match (most reliable)
  //   if (exactPhraseMatch(service, location, urlSlug)) {
  //     return { isMatch: true, method: 'exact_phrase' }
  //   }
    
  //   // Method 2: Token-based match
  //   if (tokenBasedMatch(service, location, urlSlug)) {
  //     return { isMatch: true, method: 'token_based' }
  //   }
    
  //   // Method 3: Regex pattern match
  //   if (regexPatternMatch(service, location, urlSlug)) {
  //     return { isMatch: true, method: 'regex_pattern' }
  //   }
    
  //   // Method 4: Fuzzy similarity (least strict)
  //   if (fuzzySimilarityMatch(service, location, urlSlug, 0.9)) {
  //     return { isMatch: true, method: 'fuzzy_similarity' }
  //   }
    
  //   return { isMatch: false, method: 'no_match' }
  // }

  const findResearchGaps = async () => {
    if (services.length === 0 || locations.length === 0) {
      setAnalysisStatus("Error: Please add at least one service and one location")
      return
    }

    setIsAnalyzing(true)
    setAnalysisStatus("Starting analysis...")
    
    try {
      const result = await apiService.analyzeResearchGaps(services, locations)
      
      if (result.success) {
        setResearchGaps(result.gaps)
        setAnalysisStatus(`Analysis complete! Found ${result.research_gaps} research gaps out of ${result.total_combinations} combinations`)
        
        // Refresh stats
        const updatedStats = await apiService.getStats()
        setStats(updatedStats)
      } else {
        setAnalysisStatus("Analysis failed")
      }
      
    } catch (error) {
      console.error("❌ Error during analysis:", error)
      setAnalysisStatus(`Error: ${error}`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Unused utility functions - these are now handled by the backend API

  // Unused functions commented out to fix TypeScript errors

  const createArticleFromGap = async (gap: ResearchGap) => {
    try {
      setLoading(true)
      const article = await apiService.generateArticle(gap.combination)
      
      // Add to local state
      setArticles(prevArticles => [...prevArticles, article])
      
      // Refresh stats
      const updatedStats = await apiService.getStats()
      setStats(updatedStats)
      
      console.log(`Created article: ${article.title}`)
    } catch (error) {
      console.error('Failed to generate article:', error)
    } finally {
      setLoading(false)
    }
  }

  const publishArticle = async (articleId: string) => {
    try {
      setLoading(true)
      const result = await apiService.publishArticle(articleId)
      
      if (result.success) {
        // Update local state
        setArticles(articles.map(article => 
          article.id === articleId 
            ? { ...article, status: 'published' as const }
            : article
        ))
        
        // Refresh stats
        const updatedStats = await apiService.getStats()
        setStats(updatedStats)
        
        console.log(`Article published: ${result.wordpress_url}`)
      }
    } catch (error) {
      console.error('Failed to publish article:', error)
      alert('Failed to publish article. Please check your WordPress connection.')
    } finally {
      setLoading(false)
    }
  }

  const analyzeSitemap = () => {
    setSitemapsAnalyzed(prev => prev + 1)
  }

  const startEditingArticle = (article: Article) => {
    setEditingArticle(article)
    setEditTitle(article.title)
    setEditContent(article.content)
  }

  const saveArticleChanges = async () => {
    if (!editingArticle) return
    
    try {
      setLoading(true)
      const updatedArticle = {
        ...editingArticle,
        title: editTitle,
        content: editContent
      }
      
      await apiService.updateArticle(editingArticle.id!, updatedArticle)
      
      // Update local state
      setArticles(articles.map(article => 
        article.id === editingArticle.id 
          ? updatedArticle
          : article
      ))
      
      setEditingArticle(null)
      setEditTitle('')
      setEditContent('')
    } catch (error) {
      console.error('Failed to save article:', error)
    } finally {
      setLoading(false)
    }
  }

  const cancelEditing = () => {
    setEditingArticle(null)
    setEditTitle('')
    setEditContent('')
  }

  const viewArticle = (article: Article) => {
    setViewingArticle(article)
  }

  const closeArticleView = () => {
    setViewingArticle(null)
  }

  const loadWordPressPosts = async () => {
    if (!wordpressAuthenticated) {
      return
    }
    
    setLoadingWpPosts(true)
    try {
      const result = await apiService.getWordPressPosts(20, 1)
      setWordpressPosts(result.posts)
    } catch (error) {
      console.error('Failed to load WordPress posts:', error)
    } finally {
      setLoadingWpPosts(false)
    }
  }

  const deleteArticle = async (articleId: string) => {
    try {
      setLoading(true)
      await apiService.deleteArticle(articleId)
      
      // Update local state
      setArticles(articles.filter(article => article.id !== articleId))
      
      // Refresh stats
      const updatedStats = await apiService.getStats()
      setStats(updatedStats)
    } catch (error) {
      console.error('Failed to delete article:', error)
    } finally {
      setLoading(false)
    }
  }

  // Statistics calculations - use API stats when available
  const totalArticles = stats?.total_articles ?? articles.length
  const publishedArticles = stats?.published_articles ?? articles.filter(article => article.status === 'published').length
  const toPublishArticles = stats?.to_publish_articles ?? articles.filter(article => article.status === 'to_publish').length
  const totalResearchGaps = stats?.total_research_gaps ?? researchGaps.length

  return (
    <AppShell
      navbar={{
        width: 280,
        breakpoint: 'sm',
      }}
      padding="md"
      style={{ backgroundColor: '#f8f9fa' }}
    >
      <AppShell.Navbar p="md" style={{ backgroundColor: 'white' }}>
        <Group mb="xl">
          <Avatar size={40} color="green">E</Avatar>
          <div>
            <Text size="lg" fw={600}>Content Generator Manger</Text>
            <Text size="xs" c="dimmed">My Workspace</Text>
          </div>
        </Group>

        <Stack gap="xs">
          {navItems.map((item, index) => (
            <UnstyledButton
              key={index}
              onClick={() => setActiveTab(item.label.toLowerCase().replace(' ', ''))}
              style={{
                display: 'block',
                width: '100%',
                padding: rem(10),
                borderRadius: rem(8),
                color: item.active ? 'white' : '#495057',
                backgroundColor: item.active ? '#51cf66' : 'transparent',
                textDecoration: 'none',
              }}
            >
              <Group>
                <item.icon size={18} stroke={1.5} />
                <Text size="sm" fw={item.active ? 600 : 400}>
                  {item.label}
                </Text>
              </Group>
            </UnstyledButton>
          ))}
        </Stack>

        <Divider my="lg" />
        
        <Group>
          <Avatar size={30} src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60" />
          <div>
            <Text size="sm" fw={500}>Namless</Text>
            <Text size="xs" c="dimmed">Administrator</Text>
          </div>
        </Group>
      </AppShell.Navbar>

      <AppShell.Main>
        {activeTab === 'overview' && (
          <div>
            <Group justify="space-between" mb="xl">
              <div>
                <Title order={2} mb="xs">Dashboard</Title>
                <Text c="dimmed">Welcome, Let's dive into your personalized setup guide.</Text>
              </div>
              <Button leftSection={<IconPlus size={16} />} color="green">
                Create campaign
              </Button>
            </Group>

            <SimpleGrid cols={{ base: 2, md: 4 }} mb="xl">
              <StatsCard title="Total Articles" value={totalArticles} color="#51cf66" />
              <StatsCard title="Research Gaps" value={totalResearchGaps} color="#ff6b6b" />
              <StatsCard title="Published" value={publishedArticles} color="#51cf66" />
              <StatsCard title="To Publish" value={toPublishArticles} color="#ffd43b" />
            </SimpleGrid>

            <SimpleGrid cols={{ base: 2, md: 4 }} mb="xl">
              <StatsCard title="Sitemaps Analyzed" value={sitemapsAnalyzed} color="#339af0" />
              <StatsCard title="Services Added" value={services.length} color="#845ef7" />
              <StatsCard title="Locations Added" value={locations.length} color="#20c997" />
              <StatsCard title="Total Combinations" value={services.length * locations.length} color="#fd7e14" />
            </SimpleGrid>

            <Title order={3} mb="md">Performance Over Time</Title>
            <Card shadow="sm" padding="lg" radius="md" withBorder mb="xl" h={300}>
              <Text c="dimmed" size="sm">Chart placeholder - Performance metrics over time</Text>
            </Card>
          </div>
        )}

        {activeTab === 'researchanalysis' && (
          <div>
            <Title order={2} mb="lg">Research Analysis</Title>
            <Text c="dimmed" mb="xl">Add services and locations to find research gaps</Text>

            <Grid>
              <Grid.Col span={6}>
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                  <Title order={4} mb="md">Services</Title>
                  
                  <Group mb="md">
                    <input
                      type="text"
                      placeholder="Add service (e.g., paving)"
                      value={serviceInput}
                      onChange={(e) => setServiceInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addService()}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        border: '1px solid #dee2e6',
                        borderRadius: '4px'
                      }}
                    />
                    <Button onClick={addService} size="sm" color="green">
                      Add
                    </Button>
                  </Group>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {services.map((service, index) => (
                      <Badge
                        key={index}
                        color="blue"
                        variant="light"
                        rightSection={
                          <IconX
                            size={12}
                            style={{ cursor: 'pointer' }}
                            onClick={() => removeService(service)}
                          />
                        }
                      >
                        {service}
                      </Badge>
                    ))}
                  </div>
                </Card>
              </Grid.Col>

              <Grid.Col span={6}>
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                  <Title order={4} mb="md">Locations</Title>
                  
                  <Group mb="md">
                    <input
                      type="text"
                      placeholder="Add location (e.g., Manchester)"
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addLocation()}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        border: '1px solid #dee2e6',
                        borderRadius: '4px'
                      }}
                    />
                    <Button onClick={addLocation} size="sm" color="green">
                      Add
                    </Button>
                  </Group>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {locations.map((location, index) => (
                      <Badge
                        key={index}
                        color="blue"
                        variant="light"
                        rightSection={
                          <IconX
                            size={12}
                            style={{ cursor: 'pointer' }}
                            onClick={() => removeLocation(location)}
                          />
                        }
                      >
                        {location}
                      </Badge>
                    ))}
                  </div>
                </Card>
              </Grid.Col>
            </Grid>

            <Group justify="center" mt="xl">
              <Button
                leftSection={<IconSearch size={16} />}
                size="lg"
                color="green"
                disabled={services.length === 0 || locations.length === 0 || isAnalyzing}
                onClick={findResearchGaps}
                loading={isAnalyzing}
              >
                {isAnalyzing ? 'Analyzing...' : 'Find Research Gaps'}
              </Button>
            </Group>

            {analysisStatus && (
              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <Text size="sm" c={analysisStatus.includes('Error') ? 'red' : 'blue'}>
                  {analysisStatus}
                </Text>
              </div>
            )}

            {researchGaps.length > 0 && (
              <div style={{ marginTop: '2rem' }}>
                <Title order={4} mb="md">Found Research Gaps ({researchGaps.length})</Title>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {researchGaps.slice(-5).map((gap) => (
                    <Card key={gap.id} shadow="sm" padding="md" radius="md" withBorder>
                      <Group justify="space-between">
                        <div>
                          <Text fw={600}>{gap.combination}</Text>
                          <Text size="sm" c="dimmed">Found: {gap.found_at}</Text>
                        </div>
                        <Button
                          size="sm"
                          color="green"
                          onClick={() => createArticleFromGap(gap)}
                          loading={loading}
                        >
                          Create Article
                        </Button>
                      </Group>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'articles' && (
          <div>
            {viewingArticle ? (
              // Full article view
              <div>
                <Group mb="lg">
                  <Button variant="outline" onClick={closeArticleView}>
                    ← Back to Articles
                  </Button>
                  <div style={{ flex: 1 }}>
                    <Text size="sm" c="dimmed">
                      Status: {viewingArticle.status === 'published' ? '✅ Published' : '📝 To Publish'} | 
                      Created: {viewingArticle.created_at}
                    </Text>
                  </div>
                  {viewingArticle.status === 'to_publish' && (
                    <Button 
                      color="green"
                      onClick={() => {
                        publishArticle(viewingArticle.id!)
                        setViewingArticle({...viewingArticle, status: 'published'})
                      }}
                      loading={loading}
                      disabled={!wordpressAuthenticated}
                    >
                      Publish Article
                    </Button>
                  )}
                </Group>

                <Card shadow="sm" padding="xl" radius="md" withBorder>
                  <div style={{ 
                    maxWidth: '800px', 
                    margin: '0 auto',
                    lineHeight: '1.6',
                    fontSize: '16px'
                  }}>
                    <Title order={1} mb="xl" style={{ textAlign: 'center' }}>
                      {viewingArticle.title}
                    </Title>
                    
                    <div 
                      style={{ whiteSpace: 'pre-line' }}
                      dangerouslySetInnerHTML={{ 
                        __html: viewingArticle.content
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" style="color: #51cf66; text-decoration: underline;">$1</a>')
                          .replace(/• /g, '• ')
                      }}
                    />
                  </div>
                </Card>
              </div>
            ) : editingArticle ? (
              // Edit article view
              <Card shadow="sm" padding="lg" radius="md" withBorder mb="xl">
                <Title order={4} mb="md">Edit Article</Title>
                
                <div style={{ marginBottom: '1rem' }}>
                  <Text size="sm" fw={500} mb="xs">Title</Text>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <Text size="sm" fw={500} mb="xs">Content</Text>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={20}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                      fontSize: '14px',
                      fontFamily: 'monospace',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <Group>
                  <Button onClick={saveArticleChanges} color="green">
                    Save Changes
                  </Button>
                  <Button onClick={cancelEditing} variant="outline">
                    Cancel
                  </Button>
                </Group>
              </Card>
            ) : (
              // Articles list view with sections
              <div>
                <Title order={2} mb="lg">Articles</Title>
                
                {/* To Publish Section */}
                <div style={{ marginBottom: '2rem' }}>
                  <Title order={3} mb="md" style={{ color: '#ffd43b' }}>
                    📝 To Publish ({toPublishArticles})
                  </Title>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {articles.filter(article => article.status === 'to_publish').map((article) => (
                      <Card key={article.id} shadow="sm" padding="lg" radius="md" withBorder>
                        <Group justify="space-between" align="flex-start">
                          <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => viewArticle(article)}>
                            <Text fw={600} size="lg" mb="xs" style={{ color: '#51cf66' }}>
                              {article.title}
                            </Text>
                            <Text size="sm" c="dimmed" mb="sm">
                              Created: {article.created_at}
                            </Text>
                            <Text size="sm" c="dimmed" style={{ 
                              maxHeight: '60px', 
                              overflow: 'hidden',
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical'
                            }}>
                              {article.content.substring(0, 200)}...
                            </Text>
                          </div>
                          <Group>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                startEditingArticle(article)
                              }}
                            >
                              Edit
                            </Button>
                            <Button 
                              size="sm" 
                              color="green"
                              onClick={(e) => {
                                e.stopPropagation()
                                publishArticle(article.id!)
                              }}
                              loading={loading}
                              disabled={!wordpressAuthenticated}
                            >
                              Publish
                            </Button>
                            <Button 
                              size="sm" 
                              color="red" 
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (article.id) deleteArticle(article.id)
                              }}
                            >
                              Delete
                            </Button>
                          </Group>
                        </Group>
                      </Card>
                    ))}
                    
                    {toPublishArticles === 0 && (
                      <Card shadow="sm" padding="lg" radius="md" withBorder>
                        <Text c="dimmed" ta="center">
                          No articles to publish yet.
                        </Text>
                      </Card>
                    )}
                  </div>
                </div>

                {/* Published Section */}
                <div>
                  <Title order={3} mb="md" style={{ color: '#51cf66' }}>
                    ✅ Published ({publishedArticles})
                  </Title>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {articles.filter(article => article.status === 'published').map((article) => (
                      <Card key={article.id} shadow="sm" padding="lg" radius="md" withBorder>
                        <Group justify="space-between" align="flex-start">
                          <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => viewArticle(article)}>
                            <Text fw={600} size="lg" mb="xs" style={{ color: '#51cf66' }}>
                              {article.title}
                            </Text>
                            <Text size="sm" c="dimmed" mb="sm">
                              Created: {article.created_at}
                            </Text>
                            <Text size="sm" c="dimmed" style={{ 
                              maxHeight: '60px', 
                              overflow: 'hidden',
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical'
                            }}>
                              {article.content.substring(0, 200)}...
                            </Text>
                          </div>
                          <Group>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                startEditingArticle(article)
                              }}
                            >
                              Edit
                            </Button>
                            <Button 
                              size="sm" 
                              color="red" 
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (article.id) deleteArticle(article.id)
                              }}
                            >
                              Delete
                            </Button>
                          </Group>
                        </Group>
                      </Card>
                    ))}
                    
                    {publishedArticles === 0 && (
                      <Card shadow="sm" padding="lg" radius="md" withBorder>
                        <Text c="dimmed" ta="center">
                          No published articles yet.
                        </Text>
                      </Card>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'sitemaps' && (
          <div>
            <Title order={2} mb="lg">Sitemaps</Title>
            
            <Grid>
              <Grid.Col span={6}>
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                  <Title order={4} mb="md">Add Sitemap</Title>
                  <Group>
                    <input
                      type="text"
                      placeholder="https://example.com/sitemap.xml"
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        border: '1px solid #dee2e6',
                        borderRadius: '4px'
                      }}
                    />
                    <Button color="green" onClick={analyzeSitemap}>Analyze</Button>
                  </Group>
                </Card>
              </Grid.Col>
            </Grid>

            <Grid mt="xl">
              <Grid.Col span={6}>
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                  <Title order={4} mb="md">Published Articles ({publishedArticles})</Title>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                    {articles.filter(article => article.status === 'published').map((article) => (
                      <Card key={article.id} padding="sm" withBorder>
                        <Text size="sm" fw={500}>{article.title}</Text>
                        <Text size="xs" c="dimmed">{article.created_at}</Text>
                      </Card>
                    ))}
                    {publishedArticles === 0 && (
                      <Text c="dimmed" size="sm">No published articles yet</Text>
                    )}
                  </div>
                </Card>
              </Grid.Col>

              <Grid.Col span={6}>
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                  <Title order={4} mb="md">To Publish ({toPublishArticles})</Title>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                    {articles.filter(article => article.status === 'to_publish').map((article) => (
                      <Card key={article.id} padding="sm" withBorder>
                        <Group justify="space-between">
                          <div>
                            <Text size="sm" fw={500}>{article.title}</Text>
                            <Text size="xs" c="dimmed">{article.created_at}</Text>
                          </div>
                          <Button 
                            size="xs" 
                            color="green"
                            onClick={() => article.id && publishArticle(article.id)}
                            disabled={!wordpressAuthenticated || !article.id}
                          >
                            Publish
                          </Button>
                        </Group>
                      </Card>
                    ))}
                    {toPublishArticles === 0 && (
                      <Text c="dimmed" size="sm">No articles to publish</Text>
                    )}
                  </div>
                </Card>
              </Grid.Col>
            </Grid>
          </div>
        )}

        {activeTab === 'wordpressposts' && (
          <div>
            <Group justify="space-between" mb="lg">
              <Title order={2}>WordPress Posts</Title>
              <Button 
                onClick={loadWordPressPosts}
                loading={loadingWpPosts}
                disabled={!wordpressAuthenticated}
                color="blue"
              >
                Refresh Posts
              </Button>
            </Group>
            
            {!wordpressAuthenticated ? (
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Text ta="center" c="dimmed">
                  Connect to WordPress to view existing posts
                </Text>
                <Group justify="center" mt="md">
                  <Button onClick={() => setWordpressAuthModalOpen(true)}>
                    Connect to WordPress
                  </Button>
                </Group>
              </Card>
            ) : (
              <div>
                {wordpressPosts.length === 0 ? (
                  <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <Text ta="center" c="dimmed">
                      {loadingWpPosts ? 'Loading posts...' : 'No WordPress posts found. Click "Refresh Posts" to load them.'}
                    </Text>
                  </Card>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {wordpressPosts.map((post) => (
                      <Card key={post.id} shadow="sm" padding="lg" radius="md" withBorder>
                        <Group justify="space-between" align="flex-start">
                          <div style={{ flex: 1 }}>
                            <Group mb="xs">
                              <Text fw={600} size="lg" style={{ color: '#51cf66' }}>
                                {post.title}
                              </Text>
                              {post.categories.map((category, index) => (
                                <Badge key={index} color="blue" variant="light" size="sm">
                                  {category}
                                </Badge>
                              ))}
                            </Group>
                            
                            <Group gap="md" mb="sm">
                              <Text size="sm" c="dimmed">
                                📅 {new Date(post.date).toLocaleDateString()}
                              </Text>
                              <Text size="sm" c="dimmed">
                                📝 {post.word_count} words
                              </Text>
                              <Text size="sm" c="dimmed">
                                🔗 <a href={post.link} target="_blank" rel="noopener noreferrer" style={{color: '#51cf66'}}>
                                  View Post
                                </a>
                              </Text>
                            </Group>
                            
                            <Text size="sm" c="dimmed" style={{ 
                              maxHeight: '60px', 
                              overflow: 'hidden',
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical'
                            }}>
                              {post.excerpt}
                            </Text>
                          </div>
                        </Group>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div>
            <Title order={2} mb="lg">Settings</Title>
            
            <Stack gap="lg">
              <WordPressStatus
                authenticated={wordpressAuthenticated}
                onConnect={() => setWordpressAuthModalOpen(true)}
                onDisconnect={() => setWordpressAuthenticated(false)}
              />
              
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Title order={4} mb="md">Application Settings</Title>
                <Text size="sm" c="dimmed">
                  Configure your Research Gap Pipeline settings here.
                </Text>
              </Card>
            </Stack>
          </div>
        )}
      </AppShell.Main>

      {/* WordPress Authentication Modal */}
      <WordPressAuthModal
        opened={wordpressAuthModalOpen}
        onClose={() => setWordpressAuthModalOpen(false)}
        onAuthenticated={(authenticated) => {
          setWordpressAuthenticated(authenticated)
          if (authenticated) {
            // Refresh stats to show WordPress connection status
            apiService.getStats().then(setStats)
          }
        }}
      />
    </AppShell>
  )
}

export default App
