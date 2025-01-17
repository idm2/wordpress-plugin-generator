export async function downloadPlugin(pluginName: string, code: string) {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/export-plugin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pluginName, code }),
      });
  
      if (!response.ok) {
        throw new Error('Failed to download plugin');
      }
  
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${pluginName}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading plugin:', err);
      throw err;
    }
  }
  
  