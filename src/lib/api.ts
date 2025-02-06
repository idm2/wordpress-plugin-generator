export async function downloadPlugin(pluginName: string, code: string) {
    try {
      const response = await fetch(`/api/export-plugin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pluginName, code }),
      });
  
      if (!response.ok) {
        throw new Error(`Failed to download plugin: ${response.status}`);
      }
  
      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error("Received empty response from server");
      }
  
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
  
  