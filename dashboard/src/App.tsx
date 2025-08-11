import { useState } from 'react'
import { 
  AppShell, 
  Navbar, 
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

interface Article {
  id: string
  title: string
  content: string
  status: 'published' | 'to_publish'
  createdAt: string
}

interface ResearchGap {
  id: string
  service: string
  location: string
  combination: string
  foundAt: string
}

function App() {
  const [activeTab, setActiveTab] = useState('overview')
  const [services, setServices] = useState<string[]>([])
  const [locations, setLocations] = useState<string[]>([])
  const [serviceInput, setServiceInput] = useState('')
  const [locationInput, setLocationInput] = useState('')
  const [articles, setArticles] = useState<Article[]>([])
  const [researchGaps, setResearchGaps] = useState<ResearchGap[]>([])
  const [sitemapsAnalyzed, setSitemapsAnalyzed] = useState<number>(0)
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false)
  const [analysisStatus, setAnalysisStatus] = useState<string>('')
  const [editingArticle, setEditingArticle] = useState<Article | null>(null)
  const [viewingArticle, setViewingArticle] = useState<Article | null>(null)
  const [editTitle, setEditTitle] = useState<string>('')
  const [editContent, setEditContent] = useState<string>('')

  const navItems: NavItem[] = [
    { icon: IconDashboard, label: 'Overview', active: activeTab === 'overview' },
    { icon: IconFileText, label: 'Research Analysis', active: activeTab === 'researchanalysis' },
    { icon: IconFileText, label: 'Articles', active: activeTab === 'articles' },
    { icon: IconChartBar, label: 'Sitemaps', active: activeTab === 'sitemaps' },
    { icon: IconSettings, label: 'Settings', active: activeTab === 'settings' },
  ]

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

  // Non-LLM utility functions
  const loadSitemapUrls = async (limit = 10): Promise<string[]> => {
    try {
      const response = await fetch('/sitemap_urls.json')
      if (!response.ok) throw new Error('Failed to load sitemap URLs')
      const urls = await response.json()
      return urls.slice(0, limit)
    } catch (error) {
      console.error('Error loading sitemap URLs:', error)
      return []
    }
  }

  const normalizeUrl = (url: string): string => {
    // Get the last meaningful part of the URL
    if (url.endsWith('/')) {
      url = url.slice(0, -1)
    }
    
    // Split by '/' and get the last part, or second to last if last is empty
    const parts = url.split('/')
    let slug: string
    if (parts.length > 1) {
      slug = parts[parts.length - 1] || parts[parts.length - 2]
    } else {
      slug = url
    }
    
    // Replace underscores and hyphens with spaces
    let normalized = slug.replace(/[_-]/g, ' ')
    
    // Remove special characters except spaces
    normalized = normalized.replace(/[^\w\s]/g, '')
    
    // Convert to lowercase and strip
    return normalized.toLowerCase().trim()
  }

  const exactPhraseMatch = (service: string, location: string, urlSlug: string): boolean => {
    const searchPhrase = `${service} in ${location}`.toLowerCase()
    return urlSlug.toLowerCase().includes(searchPhrase)
  }

  const tokenBasedMatch = (service: string, location: string, urlSlug: string): boolean => {
    const tokens = urlSlug.toLowerCase().split()
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
    // First check if the service is actually in the URL (mandatory)
    if (!urlSlug.toLowerCase().includes(service.toLowerCase())) {
      return false // Service must be present
    }
    
    // Then check overall similarity with higher threshold
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

  const comprehensiveMatch = (service: string, location: string, url: string): { isMatch: boolean; method: string } => {
    const urlSlug = normalizeUrl(url)
    
    // Method 1: Exact phrase match (most reliable)
    if (exactPhraseMatch(service, location, urlSlug)) {
      return { isMatch: true, method: 'exact_phrase' }
    }
    
    // Method 2: Token-based match
    if (tokenBasedMatch(service, location, urlSlug)) {
      return { isMatch: true, method: 'token_based' }
    }
    
    // Method 3: Regex pattern match
    if (regexPatternMatch(service, location, urlSlug)) {
      return { isMatch: true, method: 'regex_pattern' }
    }
    
    // Method 4: Fuzzy similarity (least strict)
    if (fuzzySimilarityMatch(service, location, urlSlug, 0.9)) {
      return { isMatch: true, method: 'fuzzy_similarity' }
    }
    
    return { isMatch: false, method: 'no_match' }
  }

  const findResearchGaps = async () => {
    if (services.length === 0 || locations.length === 0) {
      console.error("❌ Please add at least one service and one location")
      setAnalysisStatus("Error: Please add at least one service and one location")
      return
    }

    setIsAnalyzing(true)
    setAnalysisStatus("Starting analysis...")
    console.log(`Analyzing ${services.length} services × ${locations.length} locations...`)
    
    try {
      // Load URLs from sitemap
      setAnalysisStatus("Loading sitemap URLs...")
      const sitemapUrls = await loadSitemapUrls(10)
      
      if (sitemapUrls.length === 0) {
        console.error("❌ No URLs found in sitemap_urls.json")
        setAnalysisStatus("Error: No URLs found in sitemap_urls.json")
        setIsAnalyzing(false)
        return
      }
      
      console.log(`Loaded ${sitemapUrls.length} URLs from sitemap`)
      
      const gaps: ResearchGap[] = []
      const matches: Record<string, { url: string; method: string }> = {}
      let checkedCount = 0
      const totalCombinations = services.length * locations.length
      
      // Check every combination of service + location
      for (const service of services) {
        for (const location of locations) {
          checkedCount++
          const combination = `${service} in ${location}`
          setAnalysisStatus(`Checking: ${combination} (${checkedCount}/${totalCombinations})`)
          
          let foundMatch = false
          
          // Check against each URL
          for (const url of sitemapUrls) {
            const { isMatch, method } = comprehensiveMatch(service, location, url)
            
            if (isMatch) {
              foundMatch = true
              matches[combination] = { url, method }
              console.log(`✅ ${combination} -> ${url} (${method})`)
              break
            }
          }
          
          // If no match found, it's a research gap
          if (!foundMatch) {
            gaps.push({
              id: `${Date.now()}-${Math.random()}`,
              service,
              location,
              combination,
              foundAt: new Date().toLocaleString()
            })
            console.log(`❌ Gap: ${combination}`)
          }
        }
      }
      
      // Clear old gaps and add new ones
      setResearchGaps(gaps)
      
      console.log(`\nResults: ${Object.keys(matches).length} matches, ${gaps.length} gaps found`)
      
      if (gaps.length > 0) {
        setAnalysisStatus(`Analysis complete! Found ${gaps.length} research gaps`)
      } else {
        setAnalysisStatus("Analysis complete! No research gaps found")
      }
      
    } catch (error) {
      console.error("❌ Error during analysis:", error)
      setAnalysisStatus(`Error: ${error}`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const findRelevantLinks = async (service: string, location: string): Promise<Array<{url: string, anchor: string}>> => {
    const sitemapUrls = await loadSitemapUrls(50) // Load more URLs for better linking
    const relevantLinks: Array<{url: string, anchor: string}> = []
    
    const serviceKeywords = [service.toLowerCase()]
    const locationKeywords = [location.toLowerCase()]
    
    // Add common variations based on service type
    const serviceType = service.toLowerCase()
    if (serviceType === 'paving') {
      serviceKeywords.push('driveway', 'asphalt', 'concrete', 'pavement', 'surfacing')
    } else if (serviceType === 'roofing') {
      serviceKeywords.push('roof', 'shingle', 'tile', 'metal', 'repair', 'installation')
    } else if (serviceType === 'landscaping') {
      serviceKeywords.push('garden', 'lawn', 'plants', 'design', 'maintenance')
    } else if (serviceType === 'flooring') {
      serviceKeywords.push('floor', 'carpet', 'hardwood', 'tile', 'laminate')
    } else if (serviceType === 'plumbing') {
      serviceKeywords.push('pipe', 'drain', 'water', 'leak', 'repair')
    } else if (serviceType === 'electrical') {
      serviceKeywords.push('wire', 'outlet', 'circuit', 'installation', 'repair')
    }
    
    for (const url of sitemapUrls) {
      const normalizedSlug = normalizeUrl(url)
      const urlWords = normalizedSlug.split(' ')
      
      // Check if URL contains service-related keywords
      const hasServiceKeyword = serviceKeywords.some(keyword => 
        normalizedSlug.includes(keyword) || urlWords.includes(keyword)
      )
      
      // Check if URL contains location (optional for internal links)
      const hasLocationKeyword = locationKeywords.some(keyword => 
        normalizedSlug.includes(keyword) || urlWords.includes(keyword)
      )
      
      if (hasServiceKeyword) {
        // Create anchor text based on URL content
        let anchorText = ''
        
        if (normalizedSlug.includes('driveway')) {
          anchorText = hasLocationKeyword ? `driveway services in ${location}` : 'driveway services'
        } else if (normalizedSlug.includes('paving')) {
          anchorText = hasLocationKeyword ? `paving services in ${location}` : 'professional paving'
        } else if (normalizedSlug.includes('asphalt')) {
          anchorText = 'asphalt solutions'
        } else if (normalizedSlug.includes('concrete')) {
          anchorText = 'concrete services'
        } else if (normalizedSlug.includes('sealcoat')) {
          anchorText = 'sealcoating services'
        } else if (normalizedSlug.includes('repair')) {
          anchorText = `${service} repair services`
        } else {
          // Generic anchor based on service
          anchorText = hasLocationKeyword ? `${service} services in ${location}` : `${service} services`
        }
        
        // Avoid duplicate links
        if (!relevantLinks.some(link => link.url === url)) {
          relevantLinks.push({ url, anchor: anchorText })
        }
      }
    }
    
    return relevantLinks.slice(0, 5) // Limit to 5 internal links per article
  }

  const insertInternalLinks = (content: string, links: Array<{url: string, anchor: string}>): string => {
    let updatedContent = content
    
    // Insert links strategically in different sections
    const insertionPoints = [
      { section: '**The Project Story**', position: 'after' },
      { section: '**Our', position: 'before' },
      { section: '**Benefits for', position: 'before' },
      { section: '**Why Choose Local', position: 'before' }
    ]
    
    links.forEach((link, index) => {
      if (index < insertionPoints.length) {
        const insertPoint = insertionPoints[index]
        const sectionRegex = new RegExp(`(${insertPoint.section.replace(/\*/g, '\\*')}.*?)`, 's')
        
        if (insertPoint.position === 'after') {
          // Insert after the section
          updatedContent = updatedContent.replace(sectionRegex, (match) => {
            const endOfSection = match.indexOf('\n\n')
            if (endOfSection !== -1) {
              return match.slice(0, endOfSection) + 
                     `\n\nFor more information about our comprehensive services, check out our [${link.anchor}](${link.url}).` +
                     match.slice(endOfSection)
            }
            return match + `\n\nLearn more about our [${link.anchor}](${link.url}).`
          })
        } else {
          // Insert before the section
          updatedContent = updatedContent.replace(sectionRegex, 
            `If you're considering related services, our [${link.anchor}](${link.url}) page has additional information.\n\n$1`
          )
        }
      }
    })
    
    return updatedContent
  }

  const generateArticleContent = async (service: string, location: string): Promise<string> => {
    const capitalizedService = service.charAt(0).toUpperCase() + service.slice(1)
    const capitalizedLocation = location.charAt(0).toUpperCase() + location.slice(1)
    
    const baseContent = `How We Transformed This ${capitalizedLocation} Property with Professional ${capitalizedService}

When the Johnson family called us last month, their driveway was a cracked safety hazard costing them potential home value. Three weeks later? Completely transformed and $8,000 in added property value.

**The Project Story**

The Problem: The Johnson's 20-year-old driveway had multiple cracks allowing water penetration, creating trip hazards and diminishing curb appeal.

Our Solution: Complete removal and replacement using high-grade materials designed for ${capitalizedLocation}'s climate conditions, including proper drainage and base preparation.

The Results: A smooth, durable surface that eliminated safety concerns and significantly improved the property's appearance and value.

Why It Worked: Professional installation with quality materials and local expertise that DIY approaches can't match.

**Why ${capitalizedLocation} Properties Need Professional ${capitalizedService}**

${capitalizedLocation}'s variable weather conditions create unique problems for surfaces. Common issues include:
• Freeze-thaw cycles causing cracks and heaving
• Heavy rainfall leading to drainage problems  
• Temperature fluctuations affecting material durability

Professional ${service} solves these problems with proper materials, installation techniques, and local expertise.

**Our ${capitalizedService} Process**

Assessment: Site evaluation and planning for ${capitalizedLocation}'s specific conditions
Preparation: Proper excavation, base work, and drainage solutions
Installation: Quality materials and professional techniques
Protection: Long-term maintenance recommendations

Each step is designed specifically for ${capitalizedLocation}'s climate and soil conditions.

**Benefits for ${capitalizedLocation} Property Owners**

Durability: Proper installation handles weather extremes
Safety: Smooth surfaces reduce hazards during all seasons
Value: Quality ${service} increases property worth significantly
Cost-Effectiveness: Professional work prevents expensive future repairs

**Maintenance for ${capitalizedLocation} Conditions**

Seasonal Care:
• Spring: Inspect for winter damage and address issues early
• Summer: Monitor for heat stress and apply protective treatments
• Fall: Prepare surfaces for winter weather
• Winter: Proper snow removal and ice management

Regular maintenance extends your investment and prevents major issues.

**Why Choose Local ${capitalizedLocation} Contractors**

Local contractors understand ${capitalizedLocation}'s specific challenges:
• Climate and weather patterns
• Soil conditions and requirements  
• Local codes and regulations
• Established supplier relationships

We're invested in this community and committed to quality work.

**Getting Started**

Ready to transform your property like our recent ${capitalizedLocation} project? We provide:
• Free consultations and estimates
• Licensed, insured, professional service
• Quality materials and warranties  
• Flexible scheduling

Contact us today for your free estimate and see how professional ${service} can transform your property.`

    // Find and insert relevant internal links
    const relevantLinks = await findRelevantLinks(service, location)
    const contentWithLinks = insertInternalLinks(baseContent, relevantLinks)
    
    return contentWithLinks
  }

  const createArticleFromGap = async (gap: ResearchGap) => {
    // Check if article already exists for this gap
    const existingArticle = articles.find(article => 
      article.title === `${gap.service.charAt(0).toUpperCase() + gap.service.slice(1)} Services in ${gap.location.charAt(0).toUpperCase() + gap.location.slice(1)}`
    )
    
    if (existingArticle) {
      console.log(`Article already exists for ${gap.combination}`)
      return
    }

    console.log(`Generating article with internal links for ${gap.combination}...`)
    
    const articleContent = await generateArticleContent(gap.service, gap.location)
    
    const newArticle: Article = {
      id: `article-${Date.now()}`,
      title: `${gap.service.charAt(0).toUpperCase() + gap.service.slice(1)} Services in ${gap.location.charAt(0).toUpperCase() + gap.location.slice(1)}`,
      content: articleContent,
      status: 'to_publish',
      createdAt: new Date().toLocaleString()
    }
    
    setArticles(prevArticles => [...prevArticles, newArticle])
    console.log(`Created article: ${newArticle.title} with internal links`)
  }

  const publishArticle = (articleId: string) => {
    setArticles(articles.map(article => 
      article.id === articleId 
        ? { ...article, status: 'published' as const }
        : article
    ))
  }

  const analyzeSitemap = () => {
    setSitemapsAnalyzed(prev => prev + 1)
  }

  const startEditingArticle = (article: Article) => {
    setEditingArticle(article)
    setEditTitle(article.title)
    setEditContent(article.content)
  }

  const saveArticleChanges = () => {
    if (!editingArticle) return
    
    setArticles(articles.map(article => 
      article.id === editingArticle.id 
        ? { ...article, title: editTitle, content: editContent }
        : article
    ))
    
    setEditingArticle(null)
    setEditTitle('')
    setEditContent('')
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

  const deleteArticle = (articleId: string) => {
    setArticles(articles.filter(article => article.id !== articleId))
  }

  // Statistics calculations
  const totalArticles = articles.length
  const publishedArticles = articles.filter(article => article.status === 'published').length
  const toPublishArticles = articles.filter(article => article.status === 'to_publish').length
  const totalResearchGaps = researchGaps.length

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
            <Text size="lg" fw={600}>entity</Text>
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
            <Text size="sm" fw={500}>James Rasmussen</Text>
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
                          <Text size="sm" c="dimmed">Found: {gap.foundAt}</Text>
                        </div>
                        <Button
                          size="sm"
                          color="green"
                          onClick={() => createArticleFromGap(gap)}
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
                      Created: {viewingArticle.createdAt}
                    </Text>
                  </div>
                  {viewingArticle.status === 'to_publish' && (
                    <Button 
                      color="green"
                      onClick={() => {
                        publishArticle(viewingArticle.id)
                        setViewingArticle({...viewingArticle, status: 'published'})
                      }}
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
                              Created: {article.createdAt}
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
                                publishArticle(article.id)
                              }}
                            >
                              Publish
                            </Button>
                            <Button 
                              size="sm" 
                              color="red" 
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteArticle(article.id)
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
                              Created: {article.createdAt}
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
                                deleteArticle(article.id)
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
                        <Text size="xs" c="dimmed">{article.createdAt}</Text>
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
                            <Text size="xs" c="dimmed">{article.createdAt}</Text>
                          </div>
                          <Button 
                            size="xs" 
                            color="green"
                            onClick={() => publishArticle(article.id)}
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
      </AppShell.Main>
    </AppShell>
  )
}

export default App
