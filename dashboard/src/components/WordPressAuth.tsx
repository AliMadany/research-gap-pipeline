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
  Anchor,
  Checkbox
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
  mandatory?: boolean;
}

// Local storage utilities
const WORDPRESS_CREDS_KEY = 'wordpress-credentials';

const saveCredentials = (credentials: WordPressAuth) => {
  try {
    localStorage.setItem(WORDPRESS_CREDS_KEY, JSON.stringify(credentials));
  } catch (error) {
    console.warn('Failed to save credentials to localStorage:', error);
  }
};

const loadCredentials = (): WordPressAuth | null => {
  try {
    const saved = localStorage.getItem(WORDPRESS_CREDS_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.warn('Failed to load credentials from localStorage:', error);
    return null;
  }
};

const clearCredentials = () => {
  try {
    localStorage.removeItem(WORDPRESS_CREDS_KEY);
  } catch (error) {
    console.warn('Failed to clear credentials from localStorage:', error);
  }
};

export function WordPressAuthModal({ opened, onClose, onAuthenticated, mandatory = false }: WordPressAuthProps) {
  const savedCreds = loadCredentials();
  const [formData, setFormData] = useState<WordPressAuth>(
    savedCreds || {
      site_url: '',
      username: '',
      app_password: ''
    }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(!!savedCreds);

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
        // Save credentials if "Remember me" is checked
        if (rememberMe) {
          saveCredentials(authData);
        } else {
          clearCredentials();
        }
        
        setSuccess(result.message);
        onAuthenticated(true);
        setTimeout(() => {
          onClose();
          if (!rememberMe) {
            setFormData({ site_url: '', username: '', app_password: '' });
          }
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
      onClose={mandatory ? () => {} : onClose}
      title={
        <Group>
          <IconBrandWordpress size={24} color="#21759b" />
          <Text fw={600}>{mandatory ? 'WordPress Login Required' : 'Connect to WordPress'}</Text>
        </Group>
      }
      size="md"
      closeOnClickOutside={!mandatory}
      closeOnEscape={!mandatory}
      withCloseButton={!mandatory}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          {/* Info Alert */}
          <Alert
            icon={<IconInfoCircle size={16} />}
            title={mandatory ? "Login required to continue" : "WordPress Application Password Required"}
            color={mandatory ? "yellow" : "blue"}
            variant="light"
          >
            <Text size="sm">
              {mandatory ? 
                "You must connect to WordPress to access the content management features." :
                "For security, use a WordPress Application Password instead of your main password."
              }{' '}
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

          {/* Remember Me Checkbox */}
          <Checkbox
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.currentTarget.checked)}
            label="Remember my credentials"
            description="Save credentials securely in browser for next time"
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
            {!mandatory && (
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
            )}
            <Button 
              type="submit" 
              loading={loading}
              leftSection={<IconBrandWordpress size={16} />}
              color="blue"
            >
              {loading ? 'Connecting...' : (mandatory ? 'Login to Continue' : 'Connect to WordPress')}
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
      clearCredentials(); // Clear saved credentials when disconnecting
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

// Auto-login utility function
export const attemptAutoLogin = async (): Promise<boolean> => {
  const savedCreds = loadCredentials();
  if (!savedCreds) {
    return false;
  }

  try {
    // Ensure site_url has proper format
    let siteUrl = savedCreds.site_url.trim();
    if (!siteUrl.startsWith('http://') && !siteUrl.startsWith('https://')) {
      siteUrl = 'https://' + siteUrl;
    }

    const authData = {
      ...savedCreds,
      site_url: siteUrl
    };

    const result = await apiService.authenticateWordPress(authData);
    return result.success;
  } catch (error) {
    console.error('Auto-login failed:', error);
    // Clear invalid credentials
    clearCredentials();
    return false;
  }
};