<?php
/*
Plugin Name: AI Image Analysis
Description: Analyzes images using OpenAI's GPT-4 Vision API
Version: 1.0
Author: Your Name
*/

// Prevent direct file access
defined('ABSPATH') || exit;

class AI_Image_Analysis {
    private $api_key;
    private $plugin_dir;
    
    public function __construct() {
        $this->api_key = get_option('openai_api_key');
        $this->plugin_dir = plugin_dir_path(__FILE__);
        
        // Register activation hook
        register_activation_hook(__FILE__, array($this, 'activate_plugin'));
        
        // Admin hooks
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        
        // AJAX handlers
        add_action('wp_ajax_analyze_image', array($this, 'handle_image_analysis'));
        add_action('wp_ajax_nopriv_analyze_image', array($this, 'handle_unauthorized'));
        
        // Enqueue scripts
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_scripts'));
    }
    
    public function activate_plugin() {
        // Create necessary directories
        $this->create_plugin_directories();
        
        // Create initial CSS file if it doesn't exist
        $this->create_initial_css();
        
        // Create initial JS file if it doesn't exist
        $this->create_initial_js();
        
        // Add plugin version to database
        add_option('ai_image_analysis_version', '1.0.0');
    }
    
    private function create_plugin_directories() {
        $directories = array(
            'css',
            'js',
            'includes',
            'assets'
        );
        
        foreach ($directories as $dir) {
            $path = $this->plugin_dir . $dir;
            if (!file_exists($path)) {
                wp_mkdir_p($path);
                // Create .htaccess to protect directories
                file_put_contents($path . '/.htaccess', 'deny from all');
            }
        }
    }
    
    private function create_initial_css() {
        $css_file = $this->plugin_dir . 'css/admin.css';
        if (!file_exists($css_file)) {
            $css_content = <<<CSS
.upload-area {
    border: 2px dashed #ccc;
    border-radius: 4px;
    padding: 20px;
    text-align: center;
    margin: 20px 0;
    transition: all 0.3s ease;
}

.upload-area.highlight {
    border-color: #2271b1;
    background-color: rgba(34, 113, 177, 0.1);
}

.result-content {
    margin-top: 20px;
    padding: 15px;
    background: #fff;
    border: 1px solid #ccc;
    border-radius: 4px;
}

.analysis-error {
    color: #dc3232;
    padding: 10px;
    background: #fbeaea;
    border-left: 4px solid #dc3232;
}

.analysis-success {
    padding: 10px;
    background: #f0f6fc;
    border-left: 4px solid #2271b1;
}

.card {
    background: #fff;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 20px;
    margin-top: 20px;
}
CSS;
            file_put_contents($css_file, $css_content);
        }
    }
    
    private function create_initial_js() {
        $js_file = $this->plugin_dir . 'js/admin.js';
        if (!file_exists($js_file)) {
            $js_content = <<<JS
jQuery(document).ready(function($) {
    const dropArea = $('#image-upload-area');
    const fileInput = $('#image-upload');
    const resultArea = $('#analysis-result');
    const resultContent = $('#result-content');
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.on(eventName, preventDefaults);
        $(document).on(eventName, preventDefaults);
    });
    
    // Highlight drop zone when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.on(eventName, highlight);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.on(eventName, unhighlight);
    });
    
    // Handle dropped files
    dropArea.on('drop', handleDrop);
    fileInput.on('change', handleFiles);
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    function highlight(e) {
        dropArea.addClass('highlight');
    }
    
    function unhighlight(e) {
        dropArea.removeClass('highlight');
    }
    
    function handleDrop(e) {
        const dt = e.originalEvent.dataTransfer;
        const files = dt.files;
        handleFiles({ target: { files: files } });
    }
    
    function handleFiles(e) {
        const files = e.target.files;
        if (files.length > 0) {
            analyzeImage(files[0]);
        }
    }
    
    function analyzeImage(file) {
        resultArea.show();
        resultContent.html('<p>Analyzing image...</p>');
        
        const formData = new FormData();
        formData.append('action', 'analyze_image');
        formData.append('image', file);
        formData.append('_ajax_nonce', aiImageAnalysis.nonce);
        
        $.ajax({
            url: aiImageAnalysis.ajaxUrl,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                if (response.success) {
                    resultContent.html(`
                        <div class="analysis-success">
                            <p>${response.data.description}</p>
                        </div>
                    `);
                } else {
                    resultContent.html(`
                        <div class="analysis-error">
                            <p>Error: ${response.data}</p>
                        </div>
                    `);
                }
            },
            error: function() {
                resultContent.html(`
                    <div class="analysis-error">
                        <p>Error: Failed to analyze image</p>
                    </div>
                `);
            }
        });
    }
});
JS;
            file_put_contents($js_file, $js_content);
        }
    }
    
    public function add_admin_menu() {
        add_menu_page(
            'AI Image Analysis',
            'Image Analysis',
            'manage_options',
            'ai-image-analysis',
            array($this, 'render_admin_page'),
            'dashicons-visibility'
        );
    }
    
    public function register_settings() {
        register_setting('ai_image_analysis_settings', 'openai_api_key');
    }
    
    public function render_admin_page() {
        ?>
        <div class="wrap">
            <h1>AI Image Analysis Settings</h1>
            
            <form method="post" action="options.php">
                <?php
                settings_fields('ai_image_analysis_settings');
                do_settings_sections('ai_image_analysis_settings');
                ?>
                
                <table class="form-table">
                    <tr>
                        <th scope="row">OpenAI API Key</th>
                        <td>
                            <input type="password" 
                                   name="openai_api_key" 
                                   value="<?php echo esc_attr(get_option('openai_api_key')); ?>" 
                                   class="regular-text">
                        </td>
                    </tr>
                </table>
                
                <?php submit_button(); ?>
            </form>
            
            <div id="image-analysis-tool" class="card">
                <h2>Image Analysis Tool</h2>
                <div class="inside">
                    <div id="image-upload-area" class="upload-area">
                        <input type="file" id="image-upload" accept="image/*" style="display: none;">
                        <button class="button button-primary" onclick="document.getElementById('image-upload').click()">
                            Select Image
                        </button>
                        <p class="description">or drag and drop an image here</p>
                    </div>
                    <div id="analysis-result" style="display: none;">
                        <h3>Analysis Result</h3>
                        <div id="result-content" class="result-content"></div>
                    </div>
                </div>
            </div>
        </div>
        <?php
    }
    
    public function enqueue_admin_scripts($hook) {
        if ('toplevel_page_ai-image-analysis' !== $hook) {
            return;
        }
        
        wp_enqueue_script(
            'ai-image-analysis',
            plugins_url('js/admin.js', __FILE__),
            array('jquery'),
            '1.0.0',
            true
        );
        
        wp_localize_script('ai-image-analysis', 'aiImageAnalysis', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('ai_image_analysis_nonce')
        ));
        
        wp_enqueue_style(
            'ai-image-analysis',
            plugins_url('css/admin.css', __FILE__)
        );
    }
    
    public function handle_unauthorized() {
        wp_send_json_error('Unauthorized access');
    }
    
    public function handle_image_analysis() {
        check_ajax_referer('ai_image_analysis_nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Unauthorized access');
        }
        
        if (empty($_FILES['image'])) {
            wp_send_json_error('No image provided');
        }
        
        $image = $_FILES['image'];
        $image_data = base64_encode(file_get_contents($image['tmp_name']));
        
        $analysis = $this->analyze_image($image_data, $image['type']);
        
        if (is_wp_error($analysis)) {
            wp_send_json_error($analysis->get_error_message());
        }
        
        wp_send_json_success($analysis);
    }
    
    private function analyze_image($image_data, $mime_type) {
        if (empty($this->api_key)) {
            return new WP_Error('missing_api_key', 'OpenAI API key is not configured');
        }
        
        $response = wp_remote_post('https://api.openai.com/v1/chat/completions', array(
            'headers' => array(
                'Authorization' => 'Bearer ' . $this->api_key,
                'Content-Type' => 'application/json'
            ),
            'body' => json_encode(array(
                'model' => 'gpt-4-vision-preview',
                'messages' => array(
                    array(
                        'role' => 'user',
                        'content' => array(
                            array(
                                'type' => 'text',
                                'text' => 'Analyze this image and describe what you see in detail.'
                            ),
                            array(
                                'type' => 'image_url',
                                'image_url' => array(
                                    'url' => "data:$mime_type;base64,$image_data"
                                )
                            )
                        )
                    )
                ),
                'max_tokens' => 500
            )),
            'timeout' => 30
        ));
        
        if (is_wp_error($response)) {
            return $response;
        }
        
        $body = json_decode(wp_remote_retrieve_body($response), true);
        
        if (empty($body['choices'][0]['message']['content'])) {
            return new WP_Error('analysis_failed', 'Failed to analyze image');
        }
        
        return array(
            'description' => $body['choices'][0]['message']['content']
        );
    }
}

// Initialize the plugin
function init_ai_image_analysis() {
    new AI_Image_Analysis();
}
add_action('init', 'init_ai_image_analysis');

