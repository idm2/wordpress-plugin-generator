const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

interface WordPressInstance {
  id: string
  adminUrl: string
  username: string
  password: string
}

export async function createWordPressInstance(siteName: string): Promise<WordPressInstance> {
  try {
    console.log('Creating WordPress instance...')
    const response = await fetch(`${API_URL}/preview-plugin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        pluginName: siteName,
        code: '' // Will be sent in installPlugin
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Server error:', errorData)
      throw new Error(errorData.error || 'Failed to create WordPress instance')
    }

    const data = await response.json()
    console.log('WordPress instance created:', data)

    if (!data.status || !data.data?.wp_url) {
      console.error('Invalid server response:', data)
      throw new Error('Invalid response from server')
    }

    return {
      id: data.data.id,
      adminUrl: `${data.data.wp_url}/wp-admin`,
      username: data.data.wp_username,
      password: data.data.wp_password
    }
  } catch (error) {
    console.error('Error creating WordPress instance:', error)
    throw error
  }
}

export async function installPlugin(instanceId: string, pluginCode: string, pluginName: string): Promise<void> {
  try {
    console.log('Installing plugin...')
    // Wait for the site to be fully ready
    await new Promise(resolve => setTimeout(resolve, 15000))

    const response = await fetch(`${API_URL}/preview-plugin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        siteId: instanceId,
        pluginName,
        code: pluginCode
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Plugin installation error:', errorData)
      throw new Error(errorData.error || 'Failed to install plugin')
    }

    console.log('Plugin installed successfully')
  } catch (error) {
    console.error('Error installing plugin:', error)
    throw error
  }
}

export async function deleteWordPressInstance(instanceId: string): Promise<void> {
  try {
    console.log('Deleting WordPress instance...')
    const response = await fetch(`${API_URL}/delete-preview-site`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        siteId: instanceId
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Delete site error:', errorData)
      throw new Error(errorData.error || 'Failed to delete WordPress instance')
    }

    console.log('WordPress instance deleted successfully')
  } catch (error) {
    console.error('Error deleting WordPress instance:', error)
    throw error
  }
}

