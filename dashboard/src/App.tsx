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
  Modal,
  TextInput,
  rem,
  Checkbox
} from '@mantine/core'
import { 
  IconDashboard, 
  IconFileText, 
  IconSettings, 
  IconChartBar,
  IconX,
  IconSearch,
  IconClock,
  IconPlus,
  IconCalendarTime,
  IconEdit,
  IconCheck,
  IconCalendar,
  IconPencil,
  IconExternalLink
} from '@tabler/icons-react'
import { apiService, type Article, type ResearchGap, type Stats, type WordPressPost, type WordPressMedia } from './services/api'
import { WordPressAuthModal, WordPressStatus, attemptAutoLogin } from './components/WordPressAuth'
import { WordPressImageSelector } from './components/WordPressImageSelector'

// Date formatting utilities
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  })
}

const formatDateShort = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

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
  const [wordpressPosts, setWordpressPosts] = useState<WordPressPost[]>([])
  const [loadingWpPosts, setLoadingWpPosts] = useState(false)
  const [generatingArticles, setGeneratingArticles] = useState<Set<string>>(new Set())
  const [publishingArticles, setPublishingArticles] = useState<Set<string>>(new Set())
  const [deletingArticles, setDeletingArticles] = useState<Set<string>>(new Set())
  const [editingInProgress, setEditingInProgress] = useState(false)
  const [bulkOperationInProgress, setBulkOperationInProgress] = useState(false)
  const [syncingWithWordPress, setSyncingWithWordPress] = useState(false)
  // const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [schedulingArticle, setSchedulingArticle] = useState<Article | null>(null)
  const [scheduledDate, setScheduledDate] = useState('')
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)
  const [showMandatoryLogin, setShowMandatoryLogin] = useState(false)
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set())
  const [bulkMode, setBulkMode] = useState(false)
  const [imageSelectModalOpen, setImageSelectModalOpen] = useState(false)
  const [articleToPublish, setArticleToPublish] = useState<Article | null>(null)
  const [publishScheduleDate, setPublishScheduleDate] = useState<string | undefined>()

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
    initializeApp()
  }, [])

  const initializeApp = async () => {
    try {
      // Try auto-login first
      console.log('Attempting auto-login...')
      const autoLoginSuccess = await attemptAutoLogin()
      
      if (autoLoginSuccess) {
        console.log('Auto-login successful')
        setWordpressAuthenticated(true)
        await loadInitialData()
      } else {
        console.log('Auto-login failed, requiring manual login')
        setShowMandatoryLogin(true)
      }
    } catch (error) {
      console.error('Failed to initialize app:', error)
      setShowMandatoryLogin(true)
    } finally {
      setInitialLoadComplete(true)
    }
  }

  const loadInitialData = async () => {
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
      setGeneratingArticles(prev => new Set([...prev, gap.id!]))
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
      setGeneratingArticles(prev => {
        const newSet = new Set(prev)
        newSet.delete(gap.id!)
        return newSet
      })
    }
  }

  const regenerateArticleFromGap = async (gap: ResearchGap) => {
    // Find existing article for this gap
    const existingArticle = articles.find(article => 
      article.title.toLowerCase().includes(gap.combination.toLowerCase()) ||
      article.content.toLowerCase().includes(gap.combination.toLowerCase())
    )

    if (existingArticle && confirm(`Replace existing article "${existingArticle.title}"?`)) {
      try {
        setGeneratingArticles(prev => new Set([...prev, gap.id!]))
        // Delete the existing article first
        await apiService.deleteArticle(existingArticle.id!)
        
        // Generate new article
        const newArticle = await apiService.generateArticle(gap.combination)
        
        // Update local state
        setArticles(prevArticles => 
          prevArticles.filter(a => a.id !== existingArticle.id).concat(newArticle)
        )
        
        // Refresh stats
        const updatedStats = await apiService.getStats()
        setStats(updatedStats)
        
        console.log(`Regenerated article: ${newArticle.title}`)
      } catch (error) {
        console.error('Failed to regenerate article:', error)
      } finally {
        setGeneratingArticles(prev => {
          const newSet = new Set(prev)
          newSet.delete(gap.id!)
          return newSet
        })
      }
    }
  }

  // Check if a research gap already has an article
  const hasExistingArticle = (gap: ResearchGap): boolean => {
    return articles.some(article => 
      article.title.toLowerCase().includes(gap.combination.toLowerCase()) ||
      article.content.toLowerCase().includes(gap.combination.toLowerCase())
    )
  }

  // Generate articles for all research gaps
  const generateAllArticles = async () => {
    if (researchGaps.length === 0) {
      alert('No research gaps found. Please run research analysis first.')
      return
    }

    const gapsWithoutArticles = researchGaps.filter(gap => !hasExistingArticle(gap))
    const gapsWithArticles = researchGaps.filter(gap => hasExistingArticle(gap))

    let totalToGenerate = gapsWithoutArticles.length
    
    if (gapsWithArticles.length > 0) {
      const regenerateExisting = confirm(
        `Found ${gapsWithoutArticles.length} new gaps and ${gapsWithArticles.length} gaps that already have articles.\n\n` +
        `Click OK to generate articles for new gaps only, or Cancel to regenerate ALL articles.`
      )
      
      if (!regenerateExisting) {
        totalToGenerate += gapsWithArticles.length
      }
    }

    if (totalToGenerate === 0) {
      alert('All research gaps already have articles.')
      return
    }

    const confirmed = confirm(`Generate ${totalToGenerate} articles? This may take several minutes.`)
    if (!confirmed) return

    setBulkOperationInProgress(true)
    let successCount = 0
    let errorCount = 0

    // Generate for gaps without articles
    for (const gap of gapsWithoutArticles) {
      try {
        const article = await apiService.generateArticle(gap.combination)
        setArticles(prevArticles => [...prevArticles, article])
        successCount++
        console.log(`Generated: ${article.title}`)
      } catch (error) {
        console.error(`Failed to generate for ${gap.combination}:`, error)
        errorCount++
      }
    }

    // Regenerate for gaps with existing articles if user chose to do so
    if (gapsWithArticles.length > 0) {
      const regenerateExisting = !confirm(
        `Generated ${successCount} new articles. Regenerate ${gapsWithArticles.length} existing articles?`
      )
      
      if (!regenerateExisting) {
        for (const gap of gapsWithArticles) {
          try {
            const existingArticle = articles.find(article => 
              article.title.toLowerCase().includes(gap.combination.toLowerCase()) ||
              article.content.toLowerCase().includes(gap.combination.toLowerCase())
            )

            if (existingArticle) {
              // Delete existing and create new
              await apiService.deleteArticle(existingArticle.id!)
              const newArticle = await apiService.generateArticle(gap.combination)
              
              setArticles(prevArticles => 
                prevArticles.filter(a => a.id !== existingArticle.id).concat(newArticle)
              )
              successCount++
              console.log(`Regenerated: ${newArticle.title}`)
            }
          } catch (error) {
            console.error(`Failed to regenerate for ${gap.combination}:`, error)
            errorCount++
          }
        }
      }
    }

    // Refresh stats
    const updatedStats = await apiService.getStats()
    setStats(updatedStats)

    setBulkOperationInProgress(false)
    alert(`Batch generation complete!\n${successCount} articles generated successfully\n${errorCount} failed`)
  }

  const openImageSelector = (article: Article, scheduleDate?: string) => {
    setArticleToPublish(article)
    setPublishScheduleDate(scheduleDate)
    setImageSelectModalOpen(true)
  }

  const handleImageSelection = async (selectedImage: WordPressMedia | null) => {
    if (!articleToPublish) return

    try {
      setPublishingArticles(prev => new Set([...prev, articleToPublish.id!]))
      
      const result = await apiService.publishArticle(
        articleToPublish.id!, 
        publishScheduleDate, 
        selectedImage?.id
      )
      
      if (result.success) {
        // Update local state
        setArticles(articles.map(article => 
          article.id === articleToPublish.id 
            ? { 
                ...article, 
                status: result.scheduled ? 'scheduled' as const : 'published' as const,
                scheduled_date: result.scheduled_date 
              }
            : article
        ))
        
        // Refresh stats
        const updatedStats = await apiService.getStats()
        setStats(updatedStats)
        
        if (result.scheduled) {
          alert(`✅ Article scheduled for ${formatDate(result.scheduled_date!)}`)
        } else {
          const imageText = selectedImage ? ` with featured image "${selectedImage.title}"` : ' without featured image'
          alert(`✅ Article published${imageText}: ${result.wordpress_url}`)
        }
        
        console.log(`Article ${result.scheduled ? 'scheduled' : 'published'}: ${result.wordpress_url}`)
      }
    } catch (error) {
      console.error('Failed to publish article:', error)
      alert('Failed to publish article. Please check your WordPress connection.')
    } finally {
      setPublishingArticles(prev => {
        const newSet = new Set(prev)
        newSet.delete(articleToPublish.id!)
        return newSet
      })
      // Reset state
      setArticleToPublish(null)
      setPublishScheduleDate(undefined)
    }
  }

  const publishArticle = async (articleId: string, scheduleDate?: string) => {
    const article = articles.find(a => a.id === articleId)
    if (!article) return
    
    // Open image selector instead of publishing directly
    openImageSelector(article, scheduleDate)
  }

  const openSchedulingModal = (article: Article) => {
    setSchedulingArticle(article)
    // Set default to 1 hour from now
    const defaultDate = new Date()
    defaultDate.setHours(defaultDate.getHours() + 1)
    setScheduledDate(defaultDate.toISOString().slice(0, 16)) // Format for datetime-local input
  }

  const handleScheduledPublish = async () => {
    if (!schedulingArticle || !scheduledDate) return
    
    try {
      await publishArticle(schedulingArticle.id!, new Date(scheduledDate).toISOString())
      setSchedulingArticle(null)
      setScheduledDate('')
    } catch (error) {
      console.error('Failed to schedule article:', error)
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
      setEditingInProgress(true)
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
      setEditingInProgress(false)
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
      const result = await apiService.getWordPressPosts(100, 1, true) // Fetch all posts
      setWordpressPosts(result.posts)
    } catch (error) {
      console.error('Failed to load WordPress posts:', error)
    } finally {
      setLoadingWpPosts(false)
    }
  }

  const deleteArticle = async (articleId: string) => {
    try {
      setDeletingArticles(prev => new Set([...prev, articleId]))
      const result = await apiService.deleteArticle(articleId)
      
      // Update local state
      setArticles(articles.filter(article => article.id !== articleId))
      
      // Show feedback message
      if (result.wordpress_deleted) {
        alert('✅ Article deleted from both your dashboard and WordPress!')
      } else if (result.wordpress_error) {
        alert(`⚠️ Article deleted from your dashboard, but WordPress deletion failed: ${result.wordpress_error}`)
      } else {
        alert('✅ Article deleted from your dashboard')
      }
      
      // Refresh stats
      const updatedStats = await apiService.getStats()
      setStats(updatedStats)
    } catch (error) {
      console.error('Failed to delete article:', error)
      alert('❌ Failed to delete article. Please try again.')
    } finally {
      setDeletingArticles(prev => {
        const newSet = new Set(prev)
        newSet.delete(articleId)
        return newSet
      })
    }
  }

  // Check for scheduled articles that have become published
  const checkScheduledArticles = async () => {
    try {
      const result = await apiService.checkScheduledArticles()
      if (result.updated > 0) {
        // Refresh articles and stats if any were updated
        const [articlesData, statsData] = await Promise.all([
          apiService.getArticles(),
          apiService.getStats()
        ])
        setArticles(articlesData)
        setStats(statsData)
        console.log(`✅ ${result.updated} scheduled articles became published`)
      }
    } catch (error) {
      console.error('Failed to check scheduled articles:', error)
    }
  }

  // Check for external changes to WordPress posts
  const checkForExternalChanges = async () => {
    if (!wordpressAuthenticated) return
    
    try {
      setSyncingWithWordPress(true)
      
      // Store current article count before refresh
      // const previousArticleCount = articles.length
      
      // Refresh all data to sync with WordPress
      await loadInitialData()
      
      // setLastSyncTime(new Date())
      console.log('✅ Auto-refreshed data to sync with WordPress')
      
      // Note: The article count comparison would happen after state updates,
      // so we'll just log the sync for now
    } catch (error) {
      console.error('Failed to refresh data:', error)
    } finally {
      setSyncingWithWordPress(false)
    }
  }

  // Set up real-time checking for scheduled articles and external changes
  useEffect(() => {
    const scheduledInterval = setInterval(checkScheduledArticles, 30000) // Check every 30 seconds
    const syncInterval = setInterval(checkForExternalChanges, 120000) // Check every 2 minutes
    
    return () => {
      clearInterval(scheduledInterval)
      clearInterval(syncInterval)
    }
  }, [wordpressAuthenticated])

  // Statistics calculations - use API stats when available
  const totalArticles = stats?.total_articles ?? articles.length
  const publishedArticles = stats?.published_articles ?? articles.filter(article => article.status === 'published').length
  const toPublishArticles = stats?.to_publish_articles ?? articles.filter(article => article.status === 'to_publish').length
  const scheduledArticles = stats?.scheduled_articles ?? articles.filter(article => article.status === 'scheduled').length
  const totalResearchGaps = stats?.total_research_gaps ?? researchGaps.length

  // Handle mandatory login completion
  const handleMandatoryLoginSuccess = async () => {
    setShowMandatoryLogin(false)
    setWordpressAuthenticated(true)
    await loadInitialData()
  }

  // Bulk operations
  const toggleBulkMode = () => {
    setBulkMode(!bulkMode)
    setSelectedArticles(new Set())
  }

  const toggleArticleSelection = (articleId: string) => {
    const newSelected = new Set(selectedArticles)
    if (newSelected.has(articleId)) {
      newSelected.delete(articleId)
    } else {
      newSelected.add(articleId)
    }
    setSelectedArticles(newSelected)
  }

  const selectAllArticles = (articles: Article[]) => {
    const allIds = articles.map(a => a.id!).filter(Boolean)
    setSelectedArticles(new Set(allIds))
  }

  const clearSelection = () => {
    setSelectedArticles(new Set())
  }

  const bulkDeleteArticles = async () => {
    if (selectedArticles.size === 0) return
    
    const confirmed = confirm(`Are you sure you want to delete ${selectedArticles.size} articles? This will remove them from BOTH your dashboard AND WordPress site.`)
    if (!confirmed) return

    setBulkOperationInProgress(true)
    let successCount = 0
    let errorCount = 0

    for (const articleId of selectedArticles) {
      try {
        await apiService.deleteArticle(articleId)
        successCount++
      } catch (error) {
        console.error(`Failed to delete article ${articleId}:`, error)
        errorCount++
      }
    }

    // Update local state
    setArticles(articles.filter(article => !selectedArticles.has(article.id!)))
    
    // Refresh stats
    const updatedStats = await apiService.getStats()
    setStats(updatedStats)

    // Clear selection
    setSelectedArticles(new Set())
    setBulkOperationInProgress(false)

    alert(`Bulk delete complete: ${successCount} deleted successfully, ${errorCount} failed`)
  }

  const bulkPublishArticles = async () => {
    if (selectedArticles.size === 0) return

    const toPublishArticles = articles.filter(article => 
      selectedArticles.has(article.id!) && article.status === 'to_publish'
    )

    if (toPublishArticles.length === 0) {
      alert('No "To Publish" articles selected')
      return
    }

    const confirmed = confirm(`Publish ${toPublishArticles.length} articles immediately?`)
    if (!confirmed) return

    setBulkOperationInProgress(true)
    let successCount = 0
    let errorCount = 0

    for (const article of toPublishArticles) {
      try {
        await apiService.publishArticle(article.id!)
        successCount++
      } catch (error) {
        console.error(`Failed to publish article ${article.id}:`, error)
        errorCount++
      }
    }

    // Refresh data
    await loadInitialData()
    
    // Clear selection
    setSelectedArticles(new Set())
    setBulkOperationInProgress(false)

    alert(`Bulk publish complete: ${successCount} published successfully, ${errorCount} failed`)
  }

  const bulkScheduleArticles = async (scheduleDate: string) => {
    if (selectedArticles.size === 0) return

    const toPublishArticles = articles.filter(article => 
      selectedArticles.has(article.id!) && article.status === 'to_publish'
    )

    if (toPublishArticles.length === 0) {
      alert('No "To Publish" articles selected')
      return
    }

    setBulkOperationInProgress(true)
    let successCount = 0
    let errorCount = 0

    for (const article of toPublishArticles) {
      try {
        await apiService.publishArticle(article.id!, scheduleDate)
        successCount++
      } catch (error) {
        console.error(`Failed to schedule article ${article.id}:`, error)
        errorCount++
      }
    }

    // Refresh data
    await loadInitialData()
    
    // Clear selection
    setSelectedArticles(new Set())
    setBulkOperationInProgress(false)

    alert(`Bulk schedule complete: ${successCount} scheduled successfully, ${errorCount} failed`)
  }

  // Show loading screen until initial authentication is complete
  if (!initialLoadComplete) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f8f9fa'
      }}>
        <Stack gap="md" align="center">
          <Text size="lg" fw={600}>Content Generator Manager</Text>
          <Text size="sm" c="dimmed">Initializing...</Text>
        </Stack>
      </div>
    )
  }

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
                <Text c="dimmed">Welcome to your content management dashboard.</Text>
              </div>
            </Group>

            <SimpleGrid cols={{ base: 2, md: 4 }} mb="xl">
              <StatsCard title="Total Articles" value={totalArticles} color="#51cf66" />
              <StatsCard title="Research Gaps" value={totalResearchGaps} color="#ff6b6b" />
              <StatsCard title="Published" value={publishedArticles} color="#51cf66" />
              <StatsCard title="Scheduled" value={scheduledArticles} color="#339af0" />
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
                <Group justify="space-between" align="center" mb="md">
                  <Title order={4}>Found Research Gaps ({researchGaps.length})</Title>
                  <Button
                    size="sm"
                    color="green"
                    variant="filled"
                    onClick={generateAllArticles}
                    loading={bulkOperationInProgress}
                    leftSection={<IconPlus size={16} />}
                  >
                    Generate All Articles
                  </Button>
                </Group>
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
                          color={hasExistingArticle(gap) ? "orange" : "green"}
                          onClick={() => hasExistingArticle(gap) ? regenerateArticleFromGap(gap) : createArticleFromGap(gap)}
                          loading={generatingArticles.has(gap.id!)}
                        >
                          {hasExistingArticle(gap) ? 'Regenerate Article' : 'Create Article'}
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
                      Created: {viewingArticle.created_at ? formatDate(viewingArticle.created_at) : 'Unknown'}
                    </Text>
                  </div>
                  {viewingArticle.status === 'to_publish' && (
                    <Group>
                      <Button 
                        color="green"
                        onClick={() => {
                          publishArticle(viewingArticle.id!)
                          setViewingArticle({...viewingArticle, status: 'published'})
                        }}
                        loading={publishingArticles.has(viewingArticle.id!)}
                        disabled={!wordpressAuthenticated}
                      >
                        Publish Now
                      </Button>
                      <Button 
                        color="blue"
                        variant="outline"
                        leftSection={<IconClock size={16} />}
                        onClick={() => openSchedulingModal(viewingArticle)}
                        disabled={!wordpressAuthenticated}
                      >
                        Schedule
                      </Button>
                    </Group>
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
                          .replace(/^## (.*$)/gm, '<h2 style="font-size: 1.5em; font-weight: 600; margin: 1.5em 0 0.5em 0; color: #212529;">$1</h2>')
                          .replace(/^### (.*$)/gm, '<h3 style="font-size: 1.25em; font-weight: 600; margin: 1.25em 0 0.5em 0; color: #495057;">$1</h3>')
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
                  <Button onClick={saveArticleChanges} color="green" loading={editingInProgress}>
                    Save Changes
                  </Button>
                  <Button onClick={cancelEditing} variant="outline" disabled={editingInProgress}>
                    Cancel
                  </Button>
                </Group>
              </Card>
            ) : (
              // Articles list view with sections
              <div>
                <Group justify="space-between" mb="lg">
                  <Title order={2}>Articles</Title>
                  <Group>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={checkForExternalChanges}
                      color="blue"
                      loading={syncingWithWordPress}
                    >
                      {syncingWithWordPress ? 'Syncing...' : 'Sync with WordPress'}
                    </Button>
                    <Button
                      variant={bulkMode ? "filled" : "outline"}
                      color="blue"
                      onClick={toggleBulkMode}
                      size="sm"
                    >
                      {bulkMode ? 'Exit Bulk Mode' : 'Select'}
                    </Button>
                    
                    {bulkMode && (
                      <>
                        <Text size="sm" c="dimmed">
                          {selectedArticles.size} selected
                        </Text>
                        {selectedArticles.size > 0 && (
                          <Group gap="xs">
                            <Button size="xs" variant="outline" onClick={clearSelection}>
                              Clear All
                            </Button>
                            <Button 
                              size="xs" 
                              color="red" 
                              onClick={bulkDeleteArticles}
                              loading={bulkOperationInProgress}
                            >
                              Delete Selected
                            </Button>
                            <Button 
                              size="xs" 
                              color="green"
                              onClick={bulkPublishArticles}
                              loading={bulkOperationInProgress}
                              disabled={!wordpressAuthenticated}
                            >
                              Publish Selected
                            </Button>
                            <Button 
                              size="xs" 
                              color="blue"
                              variant="outline"
                              onClick={() => {
                                const defaultDate = new Date()
                                defaultDate.setHours(defaultDate.getHours() + 1)
                                const scheduleDate = prompt('Schedule for (YYYY-MM-DDTHH:mm format):', defaultDate.toISOString().slice(0, 16))
                                if (scheduleDate) {
                                  bulkScheduleArticles(new Date(scheduleDate).toISOString())
                                }
                              }}
                              disabled={!wordpressAuthenticated}
                            >
                              Schedule Selected
                            </Button>
                          </Group>
                        )}
                      </>
                    )}
                  </Group>
                </Group>
                
                {/* Scheduled Section */}
                <div style={{ marginBottom: '2rem' }}>
                  <Group justify="space-between" align="center" mb="md">
                    <Group gap="sm">
                      <IconCalendarTime size={20} color="#339af0" />
                      <Title order={3} style={{ color: '#339af0' }}>
                        Scheduled ({scheduledArticles})
                      </Title>
                    </Group>
                    {bulkMode && scheduledArticles > 0 && (
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => selectAllArticles(articles.filter(a => a.status === 'scheduled'))}
                      >
                        Select All Scheduled
                      </Button>
                    )}
                  </Group>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {articles.filter(article => article.status === 'scheduled').map((article) => (
                      <Card key={article.id} shadow="sm" padding="lg" radius="md" withBorder>
                        <Group justify="space-between" align="flex-start">
                          {bulkMode && (
                            <Checkbox
                              checked={selectedArticles.has(article.id!)}
                              onChange={() => toggleArticleSelection(article.id!)}
                            />
                          )}
                          <div style={{ flex: 1 }}>
                            <Text 
                              size="lg" 
                              fw={600} 
                              mb="xs" 
                              style={{ cursor: 'pointer' }} 
                              onClick={() => bulkMode ? toggleArticleSelection(article.id!) : viewArticle(article)}
                            >
                              {article.title}
                            </Text>
                            
                            <Text size="sm" c="dimmed" mb="sm">
                              Created: {article.created_at ? formatDateShort(article.created_at) : 'Unknown'}
                            </Text>

                            <Group gap="xs" mb="sm">
                              <IconCalendarTime size={14} color="#339af0" />
                              <Text size="sm" c="blue">
                                Scheduled for: {article.scheduled_date ? formatDate(article.scheduled_date) : 'Unknown'}
                              </Text>
                            </Group>
                            
                            <Text size="sm" c="dimmed" lineClamp={2}>
                              {article.content.substring(0, 150)}...
                            </Text>
                          </div>
                          
                          <Group>
                            <Badge color="blue" variant="light">Scheduled</Badge>
                          </Group>
                        </Group>
                      </Card>
                    ))}
                    {scheduledArticles === 0 && (
                      <Card shadow="sm" padding="lg" radius="md" withBorder>
                        <Text c="dimmed" size="sm" ta="center">No scheduled articles</Text>
                      </Card>
                    )}
                  </div>
                </div>

                {/* To Publish Section */}
                <div style={{ marginBottom: '2rem' }}>
                  <Group justify="space-between" align="center" mb="md">
                    <Group gap="sm">
                      <IconEdit size={20} color="#ffd43b" />
                      <Title order={3} style={{ color: '#ffd43b' }}>
                        To Publish ({toPublishArticles})
                      </Title>
                    </Group>
                    {bulkMode && toPublishArticles > 0 && (
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => selectAllArticles(articles.filter(a => a.status === 'to_publish'))}
                      >
                        Select All To Publish
                      </Button>
                    )}
                  </Group>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {articles.filter(article => article.status === 'to_publish').map((article) => (
                      <Card key={article.id} shadow="sm" padding="lg" radius="md" withBorder>
                        <Group justify="space-between" align="flex-start">
                          {bulkMode && (
                            <Checkbox
                              checked={selectedArticles.has(article.id!)}
                              onChange={() => toggleArticleSelection(article.id!)}
                            />
                          )}
                          <div 
                            style={{ flex: 1, cursor: 'pointer' }} 
                            onClick={() => bulkMode ? toggleArticleSelection(article.id!) : viewArticle(article)}
                          >
                            <Text fw={600} size="lg" mb="xs" style={{ color: '#51cf66' }}>
                              {article.title}
                            </Text>
                            <Text size="sm" c="dimmed" mb="sm">
                              Created: {article.created_at ? formatDateShort(article.created_at) : 'Unknown'}
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
                              loading={publishingArticles.has(article.id!)}
                              disabled={!wordpressAuthenticated}
                            >
                              Publish Now
                            </Button>
                            <Button 
                              size="sm" 
                              color="blue"
                              variant="outline"
                              leftSection={<IconClock size={14} />}
                              onClick={(e) => {
                                e.stopPropagation()
                                openSchedulingModal(article)
                              }}
                              disabled={!wordpressAuthenticated}
                            >
                              Schedule
                            </Button>
                            <Button 
                              size="sm" 
                              color="red" 
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (article.id && confirm(`Are you sure you want to delete "${article.title}"? This will remove it from BOTH your dashboard AND WordPress site.`)) {
                                  deleteArticle(article.id)
                                }
                              }}
                              loading={deletingArticles.has(article.id!)}
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
                  <Group justify="space-between" align="center" mb="md">
                    <Group gap="sm">
                      <IconCheck size={20} color="#51cf66" />
                      <Title order={3} style={{ color: '#51cf66' }}>
                        Published ({publishedArticles})
                      </Title>
                    </Group>
                    {bulkMode && publishedArticles > 0 && (
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => selectAllArticles(articles.filter(a => a.status === 'published'))}
                      >
                        Select All Published
                      </Button>
                    )}
                  </Group>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {articles.filter(article => article.status === 'published').map((article) => (
                      <Card key={article.id} shadow="sm" padding="lg" radius="md" withBorder>
                        <Group justify="space-between" align="flex-start">
                          {bulkMode && (
                            <Checkbox
                              checked={selectedArticles.has(article.id!)}
                              onChange={() => toggleArticleSelection(article.id!)}
                            />
                          )}
                          <div 
                            style={{ flex: 1, cursor: 'pointer' }} 
                            onClick={() => bulkMode ? toggleArticleSelection(article.id!) : viewArticle(article)}
                          >
                            <Text fw={600} size="lg" mb="xs" style={{ color: '#51cf66' }}>
                              {article.title}
                            </Text>
                            <Text size="sm" c="dimmed" mb="sm">
                              Created: {article.created_at ? formatDateShort(article.created_at) : 'Unknown'}
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
                                if (article.id && confirm(`Are you sure you want to delete "${article.title}"? This will remove it from BOTH your dashboard AND WordPress site.`)) {
                                  deleteArticle(article.id)
                                }
                              }}
                              loading={deletingArticles.has(article.id!)}
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
              <Grid.Col span={4}>
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                  <Title order={4} mb="md">Published Articles ({publishedArticles})</Title>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                    {articles.filter(article => article.status === 'published').map((article) => (
                      <Card key={article.id} padding="sm" withBorder>
                        <Text size="sm" fw={500}>{article.title}</Text>
                        <Text size="xs" c="dimmed">{article.created_at ? formatDateShort(article.created_at) : 'Unknown'}</Text>
                      </Card>
                    ))}
                    {publishedArticles === 0 && (
                      <Text c="dimmed" size="sm">No published articles yet</Text>
                    )}
                  </div>
                </Card>
              </Grid.Col>

              <Grid.Col span={4}>
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                  <Title order={4} mb="md">Scheduled ({scheduledArticles})</Title>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                    {articles.filter(article => article.status === 'scheduled').map((article) => (
                      <Card key={article.id} padding="sm" withBorder>
                        <Group justify="space-between">
                          <div>
                            <Text size="sm" fw={500}>{article.title}</Text>
                            <Group gap="xs">
                              <IconCalendarTime size={12} color="#339af0" />
                              <Text size="xs" c="blue">{article.scheduled_date ? formatDate(article.scheduled_date) : 'Unknown date'}</Text>
                            </Group>
                          </div>
                          <Badge color="blue" size="sm">Scheduled</Badge>
                        </Group>
                      </Card>
                    ))}
                    {scheduledArticles === 0 && (
                      <Text c="dimmed" size="sm">No scheduled articles</Text>
                    )}
                  </div>
                </Card>
              </Grid.Col>

              <Grid.Col span={4}>
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                  <Title order={4} mb="md">To Publish ({toPublishArticles})</Title>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                    {articles.filter(article => article.status === 'to_publish').map((article) => (
                      <Card key={article.id} padding="sm" withBorder>
                        <Group justify="space-between">
                          <div>
                            <Text size="sm" fw={500}>{article.title}</Text>
                            <Text size="xs" c="dimmed">{article.created_at ? formatDateShort(article.created_at) : 'Unknown'}</Text>
                          </div>
                          <Group gap="xs">
                            <Button 
                              size="xs" 
                              color="green"
                              onClick={() => article.id && publishArticle(article.id)}
                              disabled={!wordpressAuthenticated || !article.id}
                              loading={article.id ? publishingArticles.has(article.id) : false}
                            >
                              Publish
                            </Button>
                            <Button 
                              size="xs" 
                              color="blue"
                              variant="outline"
                              onClick={() => openSchedulingModal(article)}
                              disabled={!wordpressAuthenticated}
                              leftSection={<IconCalendarTime size={12} />}
                            >
                              Schedule
                            </Button>
                          </Group>
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
                {loadingWpPosts ? 'Loading All Posts...' : 'Refresh Posts'}
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
                              <Group gap="xs">
                                <IconCalendar size={14} color="#868e96" />
                                <Text size="sm" c="dimmed">
                                  {formatDate(post.date)}
                                </Text>
                              </Group>
                              <Group gap="xs">
                                <IconPencil size={14} color="#868e96" />
                                <Text size="sm" c="dimmed">
                                  {post.word_count} words
                                </Text>
                              </Group>
                              <Group gap="xs">
                                <IconExternalLink size={14} color="#51cf66" />
                                <Text size="sm" c="dimmed">
                                  <a href={post.link} target="_blank" rel="noopener noreferrer" style={{color: '#51cf66', textDecoration: 'none'}}>
                                    View Post
                                  </a>
                                </Text>
                              </Group>
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

      {/* Scheduling Modal */}
      <Modal
        opened={!!schedulingArticle}
        onClose={() => {
          setSchedulingArticle(null)
          setScheduledDate('')
        }}
        title="Schedule Article Publication"
        size="md"
      >
        {schedulingArticle && (
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Schedule "{schedulingArticle.title}" for publication
            </Text>
            
            <TextInput
              label="Publication Date & Time"
              type="datetime-local"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              description="Choose when to publish this article (uses your local timezone)"
              required
            />
            
            <Group justify="flex-end" mt="md">
              <Button
                variant="outline"
                onClick={() => {
                  setSchedulingArticle(null)
                  setScheduledDate('')
                }}
              >
                Cancel
              </Button>
              <Button
                color="blue"
                leftSection={<IconClock size={16} />}
                onClick={handleScheduledPublish}
                disabled={!scheduledDate}
                loading={schedulingArticle ? publishingArticles.has(schedulingArticle.id!) : false}
              >
                Schedule Publication
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

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

      {/* Mandatory Login Modal */}
      <WordPressAuthModal
        opened={showMandatoryLogin}
        onClose={() => {}}
        onAuthenticated={handleMandatoryLoginSuccess}
        mandatory={true}
      />

      {/* WordPress Image Selector Modal */}
      <WordPressImageSelector
        opened={imageSelectModalOpen}
        onClose={() => {
          setImageSelectModalOpen(false)
          setArticleToPublish(null)
          setPublishScheduleDate(undefined)
        }}
        onImageSelect={handleImageSelection}
        wordpressAuthenticated={wordpressAuthenticated}
      />
    </AppShell>
  )
}

export default App
