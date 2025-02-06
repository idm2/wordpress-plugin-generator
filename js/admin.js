// Assuming jQuery is included in your WordPress theme or plugin.  If not, include it via wp_enqueue_script() in your plugin/theme's functions.php file.
jQuery(document).ready(($) => {
    const dropArea = $("#image-upload-area")
    const fileInput = $("#image-upload")
    const resultArea = $("#analysis-result")
    const resultContent = $("#result-content")
  
    // Prevent default drag behaviors
    ;["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
      dropArea.on(eventName, preventDefaults)
      $(document).on(eventName, preventDefaults)
    })
  
    // Highlight drop zone when item is dragged over it
    ;["dragenter", "dragover"].forEach((eventName) => {
      dropArea.on(eventName, highlight)
    })
    ;["dragleave", "drop"].forEach((eventName) => {
      dropArea.on(eventName, unhighlight)
    })
  
    // Handle dropped files
    dropArea.on("drop", handleDrop)
    fileInput.on("change", handleFiles)
  
    function preventDefaults(e) {
      e.preventDefault()
      e.stopPropagation()
    }
  
    function highlight(e) {
      dropArea.addClass("highlight")
    }
  
    function unhighlight(e) {
      dropArea.removeClass("highlight")
    }
  
    function handleDrop(e) {
      const dt = e.originalEvent.dataTransfer
      const files = dt.files
      handleFiles({ target: { files: files } })
    }
  
    function handleFiles(e) {
      const files = e.target.files
      if (files.length > 0) {
        analyzeImage(files[0])
      }
    }
  
    function analyzeImage(file) {
      resultArea.show()
      resultContent.html("<p>Analyzing image...</p>")
  
      const formData = new FormData()
      formData.append("action", "analyze_image")
      formData.append("image", file)
      formData.append("_ajax_nonce", aiImageAnalysis.nonce)
  
      $.ajax({
        url: aiImageAnalysis.ajaxUrl,
        type: "POST",
        data: formData,
        processData: false,
        contentType: false,
        success: (response) => {
          if (response.success) {
            resultContent.html(`
                          <div class="analysis-success">
                              <p>${response.data.description}</p>
                          </div>
                      `)
          } else {
            resultContent.html(`
                          <div class="analysis-error">
                              <p>Error: ${response.data}</p>
                          </div>
                      `)
          }
        },
        error: () => {
          resultContent.html(`
                      <div class="analysis-error">
                          <p>Error: Failed to analyze image</p>
                      </div>
                  `)
        },
      })
    }
  })
  
  