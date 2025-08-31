import { useState, useEffect } from 'react'
import { 
  Modal, 
  Text, 
  Button, 
  Group, 
  Stack, 
  Grid, 
  Card, 
  Image, 
  Badge,
  Loader,
  Center,
  ScrollArea
} from '@mantine/core'
import { IconPhoto, IconCheck, IconX } from '@tabler/icons-react'
import { apiService, type WordPressMedia } from '../services/api'

interface WordPressImageSelectorProps {
  opened: boolean
  onClose: () => void
  onImageSelect: (image: WordPressMedia | null) => void
  wordpressAuthenticated: boolean
}

export function WordPressImageSelector({
  opened,
  onClose,
  onImageSelect,
  wordpressAuthenticated
}: WordPressImageSelectorProps) {
  const [loading, setLoading] = useState(false)
  const [media, setMedia] = useState<WordPressMedia[]>([])
  const [selectedImage, setSelectedImage] = useState<WordPressMedia | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load WordPress media when modal opens
  useEffect(() => {
    if (opened && wordpressAuthenticated) {
      loadWordPressMedia()
    }
  }, [opened, wordpressAuthenticated])

  const loadWordPressMedia = async () => {
    if (!wordpressAuthenticated) {
      setError('WordPress connection required')
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const result = await apiService.getWordPressMedia(50, 1)
      
      if (result.media && result.media.length > 0) {
        setMedia(result.media)
      } else {
        setError('No images found in WordPress Media Library')
      }
    } catch (err) {
      console.error('Failed to load WordPress media:', err)
      setError('Failed to load images from WordPress. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  const handleImageSelect = (image: WordPressMedia) => {
    setSelectedImage(image)
  }

  const handleConfirmSelection = () => {
    onImageSelect(selectedImage)
    onClose()
    setSelectedImage(null)
  }

  const handlePublishWithoutImage = () => {
    onImageSelect(null)
    onClose()
    setSelectedImage(null)
  }

  const handleCancel = () => {
    onClose()
    setSelectedImage(null)
  }

  // Reset state when modal closes
  useEffect(() => {
    if (!opened) {
      setSelectedImage(null)
      setError(null)
    }
  }, [opened])

  return (
    <Modal
      opened={opened}
      onClose={handleCancel}
      title={
        <Group gap="sm">
          <IconPhoto size={24} />
          <Text fw={600} size="lg">Select Featured Image</Text>
        </Group>
      }
      size="xl"
      scrollAreaComponent={ScrollArea.Autosize}
    >
      <Stack gap="md">
        {!wordpressAuthenticated ? (
          <Card withBorder p="md">
            <Text ta="center" c="red">
              WordPress connection required to load images
            </Text>
            <Group justify="center" mt="md">
              <Button onClick={handleCancel}>Cancel</Button>
              <Button onClick={handlePublishWithoutImage} variant="outline">
                Publish Without Image
              </Button>
            </Group>
          </Card>
        ) : loading ? (
          <Center p="xl">
            <Stack gap="md" align="center">
              <Loader size="lg" />
              <Text>Loading images from WordPress Media Library...</Text>
            </Stack>
          </Center>
        ) : error ? (
          <Card withBorder p="md">
            <Text ta="center" c="red" mb="md">
              {error}
            </Text>
            <Group justify="center">
              <Button onClick={loadWordPressMedia} variant="outline">
                Retry
              </Button>
              <Button onClick={handleCancel}>Cancel</Button>
              <Button onClick={handlePublishWithoutImage} variant="outline">
                Publish Without Image
              </Button>
            </Group>
          </Card>
        ) : (
          <>
            <Text size="sm" c="dimmed">
              Choose an image from your WordPress Media Library to set as the featured image for this article.
            </Text>

            {media.length === 0 ? (
              <Card withBorder p="md">
                <Text ta="center" c="dimmed" mb="md">
                  No images found in your WordPress Media Library
                </Text>
                <Text ta="center" size="sm" c="dimmed" mb="md">
                  Upload some images to your WordPress site first, then try again.
                </Text>
                <Group justify="center">
                  <Button onClick={loadWordPressMedia} variant="outline">
                    Refresh
                  </Button>
                  <Button onClick={handleCancel}>Cancel</Button>
                  <Button onClick={handlePublishWithoutImage}>
                    Publish Without Image
                  </Button>
                </Group>
              </Card>
            ) : (
              <>
                <Text size="sm" fw={500}>
                  Found {media.length} images in your Media Library:
                </Text>

                <ScrollArea.Autosize mah={400}>
                  <Grid>
                    {media.map((image) => (
                      <Grid.Col key={image.id} span={{ base: 6, sm: 4, md: 3 }}>
                        <Card
                          withBorder
                          p="xs"
                          style={{
                            cursor: 'pointer',
                            border: selectedImage?.id === image.id 
                              ? '2px solid #51cf66' 
                              : '1px solid #dee2e6',
                            backgroundColor: selectedImage?.id === image.id 
                              ? '#f8fff8' 
                              : 'white'
                          }}
                          onClick={() => handleImageSelect(image)}
                        >
                          <Card.Section>
                            <div style={{ position: 'relative' }}>
                              <Image
                                src={image.thumbnail}
                                alt={image.alt_text || image.title}
                                fit="cover"
                                h={100}
                                fallbackSrc="https://via.placeholder.com/150x100?text=No+Image"
                              />
                              {selectedImage?.id === image.id && (
                                <div style={{
                                  position: 'absolute',
                                  top: 5,
                                  right: 5,
                                  backgroundColor: '#51cf66',
                                  borderRadius: '50%',
                                  padding: '4px'
                                }}>
                                  <IconCheck size={16} color="white" />
                                </div>
                              )}
                            </div>
                          </Card.Section>
                          
                          <Stack gap={4} mt="xs">
                            <Text size="xs" fw={500} lineClamp={2}>
                              {image.title || 'Untitled'}
                            </Text>
                            <Text size="xs" c="dimmed">
                              ID: {image.id}
                            </Text>
                          </Stack>
                        </Card>
                      </Grid.Col>
                    ))}
                  </Grid>
                </ScrollArea.Autosize>

                {selectedImage && (
                  <Card withBorder p="md" style={{ backgroundColor: '#f8fff8' }}>
                    <Group>
                      <Image
                        src={selectedImage.medium}
                        alt={selectedImage.alt_text || selectedImage.title}
                        w={80}
                        h={60}
                        fit="cover"
                      />
                      <Stack gap={4} style={{ flex: 1 }}>
                        <Text fw={500}>{selectedImage.title || 'Untitled'}</Text>
                        <Text size="sm" c="dimmed">
                          {selectedImage.alt_text && `Alt: ${selectedImage.alt_text}`}
                        </Text>
                        <Badge size="sm" color="green">Selected</Badge>
                      </Stack>
                    </Group>
                  </Card>
                )}

                <Group justify="space-between" mt="md">
                  <Group>
                    <Button
                      variant="outline"
                      leftSection={<IconX size={16} />}
                      onClick={handleCancel}
                    >
                      Cancel
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={handlePublishWithoutImage}
                    >
                      Publish Without Image
                    </Button>
                  </Group>

                  <Button
                    color="green"
                    disabled={!selectedImage}
                    leftSection={<IconCheck size={16} />}
                    onClick={handleConfirmSelection}
                  >
                    Publish with Selected Image
                  </Button>
                </Group>
              </>
            )}
          </>
        )}
      </Stack>
    </Modal>
  )
}