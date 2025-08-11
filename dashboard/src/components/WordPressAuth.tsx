import { useState } from 'react';
import {
  Modal,
  TextInput,
  Button,
  Group,
  Stack,
  Text,
  Alert,
  PasswordInput,
  Card,
  Badge,
  Anchor
} from '@mantine/core';
import { 
  IconBrandWordpress, 
  IconCheck, 
  IconX, 
  IconExternalLink,
  IconInfoCircle 
} from '@tabler/icons-react';
import { apiService, type WordPressAuth } from '../services/api';

interface WordPressAuthProps {
  opened: boolean;
  onClose: () => void;
  onAuthenticated: (authenticated: boolean) => void;
}

export function WordPressAuthModal({ opened, onClose, onAuthenticated }: WordPressAuthProps) {
  const [formData, setFormData] = useState<WordPressAuth>({
    site_url: '',
    username: '',
    app_password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate form
      if (!formData.site_url || !formData.username || !formData.app_password) {
        throw new Error('All fields are required');
      }

      // Ensure site_url has proper format
      let siteUrl = formData.site_url.trim();
      if (!siteUrl.startsWith('http://') && !siteUrl.startsWith('https://')) {
        siteUrl = 'https://' + siteUrl;
      }

      const authData = {
        ...formData,
        site_url: siteUrl
      };

      const result = await apiService.authenticateWordPress(authData);
      
      if (result.success) {
        setSuccess(result.message);
        onAuthenticated(true);
        setTimeout(() => {
          onClose();
          setFormData({ site_url: '', username: '', app_password: '' });
          setSuccess(null);
        }, 2000);
      } else {
        throw new Error(result.message || 'Authentication failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof WordPressAuth, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear errors when user starts typing
    if (error) setError(null);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group>
          <IconBrandWordpress size={24} color="#21759b" />
          <Text fw={600}>Connect to WordPress</Text>
        </Group>
      }
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          {/* Info Alert */}
          <Alert
            icon={<IconInfoCircle size={16} />}
            title="WordPress Application Password Required"
            color="blue"
            variant="light"
          >
            <Text size="sm">
              For security, use a WordPress Application Password instead of your main password.{' '}
              <Anchor 
                href="https://wordpress.org/support/article/application-passwords/" 
                target="_blank"
                size="sm"
              >
                Learn how to create one <IconExternalLink size={12} style={{ verticalAlign: 'middle' }} />
              </Anchor>
            </Text>
          </Alert>

          {/* Site URL */}
          <TextInput
            label="WordPress Site URL"
            placeholder="example.com or https://yoursite.wordpress.com"
            value={formData.site_url}
            onChange={(e) => handleInputChange('site_url', e.target.value)}
            required
            leftSection={<IconBrandWordpress size={16} />}
            description="Your WordPress site URL (with or without https://)"
          />

          {/* Username */}
          <TextInput
            label="Username"
            placeholder="your-username"
            value={formData.username}
            onChange={(e) => handleInputChange('username', e.target.value)}
            required
            description="Your WordPress username"
          />

          {/* Application Password */}
          <PasswordInput
            label="Application Password"
            placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
            value={formData.app_password}
            onChange={(e) => handleInputChange('app_password', e.target.value)}
            required
            description="Generated Application Password (not your login password)"
          />

          {/* Error Display */}
          {error && (
            <Alert icon={<IconX size={16} />} color="red" variant="light">
              {error}
            </Alert>
          )}

          {/* Success Display */}
          {success && (
            <Alert icon={<IconCheck size={16} />} color="green" variant="light">
              {success}
            </Alert>
          )}

          {/* Submit Button */}
          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              loading={loading}
              leftSection={<IconBrandWordpress size={16} />}
              color="blue"
            >
              {loading ? 'Connecting...' : 'Connect to WordPress'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

interface WordPressStatusProps {
  authenticated: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function WordPressStatus({ authenticated, onConnect, onDisconnect }: WordPressStatusProps) {
  const [loading, setLoading] = useState(false);

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await apiService.logoutWordPress();
      onDisconnect();
    } catch (error) {
      console.error('Failed to disconnect:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card shadow="sm" padding="md" radius="md" withBorder>
      <Group justify="space-between" align="center">
        <Group>
          <IconBrandWordpress size={24} color="#21759b" />
          <div>
            <Text fw={600}>WordPress Connection</Text>
            <Text size="sm" c="dimmed">
              {authenticated ? 'Connected and ready to publish' : 'Not connected'}
            </Text>
          </div>
        </Group>
        
        <Group>
          <Badge 
            color={authenticated ? 'green' : 'gray'} 
            variant={authenticated ? 'light' : 'outline'}
            leftSection={authenticated ? <IconCheck size={12} /> : <IconX size={12} />}
          >
            {authenticated ? 'Connected' : 'Disconnected'}
          </Badge>
          
          {authenticated ? (
            <Button
              variant="outline"
              color="red"
              size="sm"
              onClick={handleDisconnect}
              loading={loading}
            >
              Disconnect
            </Button>
          ) : (
            <Button
              variant="outline"
              color="blue"
              size="sm"
              onClick={onConnect}
              leftSection={<IconBrandWordpress size={16} />}
            >
              Connect
            </Button>
          )}
        </Group>
      </Group>
    </Card>
  );
}