<?php
/**
 * Plugin Name: Plugin Generator Connector
 * Description: Connect your WordPress site to the Plugin Generator app for direct plugin deployment
 * Version: 1.1.0
 * Author: Your Name
 */

// Prevent direct access
if (!defined('ABSPATH')) exit;

class PluginGeneratorConnector {
    private $api_key;
    private $options_name = 'plugin_generator_connector_options';

    public function __construct() {
        // Initialize the plugin
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        
        // Register REST API endpoints
        add_action('rest_api_init', array($this, 'register_api_endpoints'));
    }

    public function add_admin_menu() {
        add_options_page(
            'Plugin Generator Connector',
            'Plugin Generator',
            'manage_options',
            'plugin-generator-connector',
            array($this, 'admin_page')
        );
    }

    public function register_settings() {
        register_setting('plugin_generator_connector', $this->options_name);
        
        // Generate API key if it doesn't exist
        $options = get_option($this->options_name);
        if (empty($options['api_key'])) {
            $options['api_key'] = $this->generate_api_key();
            update_option($this->options_name, $options);
        }
    }

    private function generate_api_key() {
        return wp_generate_password(32, false);
    }

    public function admin_page() {
        $options = get_option($this->options_name);
        ?>
        <div class="wrap">
            <h1>Plugin Generator Connector</h1>
            <p>Use this API key to connect your WordPress site to the Plugin Generator app.</p>
            
            <div class="card" style="max-width: 600px; padding: 20px; margin-top: 20px;">
                <h2>Your API Key</h2>
                <input type="text" readonly class="regular-text" value="<?php echo esc_attr($options['api_key']); ?>" 
                       style="width: 100%; padding: 10px; font-family: monospace; margin-bottom: 10px;" />
                <button class="button button-primary" onclick="navigator.clipboard.writeText('<?php echo esc_js($options['api_key']); ?>'); alert('API key copied to clipboard!');">
                    Copy to Clipboard
                </button>
            </div>
            
            <div class="card" style="max-width: 600px; padding: 20px; margin-top: 20px;">
                <h2>Connection Status</h2>
                <p>Status: <span id="connection-status">Checking...</span></p>
                <p>Last connected: <span id="last-connected"><?php echo isset($options['last_connected']) ? esc_html($options['last_connected']) : 'Never'; ?></span></p>
            </div>
        </div>
        <?php
    }

    public function register_api_endpoints() {
        // Endpoint to validate API key
        register_rest_route('plugin-generator/v1', '/validate', array(
            'methods' => 'POST',
            'callback' => array($this, 'validate_api_key'),
            'permission_callback' => '__return_true'
        ));
        
        // Endpoint to install a plugin
        register_rest_route('plugin-generator/v1', '/install-plugin', array(
            'methods' => 'POST',
            'callback' => array($this, 'install_plugin'),
            'permission_callback' => array($this, 'check_api_key')
        ));
        
        // Endpoint to update an existing plugin
        register_rest_route('plugin-generator/v1', '/update-plugin', array(
            'methods' => 'POST',
            'callback' => array($this, 'update_plugin'),
            'permission_callback' => array($this, 'check_api_key')
        ));
        
        // Endpoint to delete a plugin
        register_rest_route('plugin-generator/v1', '/delete-plugin', array(
            'methods' => 'POST',
            'callback' => array($this, 'delete_plugin'),
            'permission_callback' => array($this, 'check_api_key')
        ));
        
        // Endpoint to check if a plugin exists
        register_rest_route('plugin-generator/v1', '/check-plugin-exists', array(
            'methods' => 'POST',
            'callback' => array($this, 'check_plugin_exists'),
            'permission_callback' => array($this, 'check_api_key')
        ));
    }

    public function validate_api_key($request) {
        $params = $request->get_params();
        $api_key = isset($params['api_key']) ? sanitize_text_field($params['api_key']) : '';
        
        $options = get_option($this->options_name);
        $valid = $api_key === $options['api_key'];
        
        if ($valid) {
            $options['last_connected'] = current_time('mysql');
            update_option($this->options_name, $options);
            
            return new WP_REST_Response(array(
                'success' => true,
                'site_name' => get_bloginfo('name'),
                'site_url' => get_site_url(),
                'wp_version' => get_bloginfo('version')
            ), 200);
        }
        
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Invalid API key'
        ), 401);
    }

    public function check_api_key($request) {
        $params = $request->get_params();
        $api_key = isset($params['api_key']) ? sanitize_text_field($params['api_key']) : '';
        
        $options = get_option($this->options_name);
        return $api_key === $options['api_key'];
    }
    
    /**
     * Check if a plugin exists
     */
    public function check_plugin_exists($request) {
        $params = $request->get_params();
        $plugin_slug = isset($params['plugin_slug']) ? sanitize_text_field($params['plugin_slug']) : '';
        
        if (empty($plugin_slug)) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'Plugin slug is required'
            ), 400);
        }
        
        // Check if the plugin directory exists
        $plugin_dir = WP_PLUGIN_DIR . '/' . $plugin_slug;
        $exists = file_exists($plugin_dir) && is_dir($plugin_dir);
        
        return new WP_REST_Response(array(
            'success' => true,
            'exists' => $exists,
            'plugin_slug' => $plugin_slug,
            'plugin_dir' => $plugin_dir
        ), 200);
    }
    
    /**
     * Delete a plugin
     */
    public function delete_plugin($request) {
        if (!function_exists('delete_plugins')) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
            require_once ABSPATH . 'wp-admin/includes/file.php';
        }
        
        $params = $request->get_params();
        $plugin_slug = isset($params['plugin_slug']) ? sanitize_text_field($params['plugin_slug']) : '';
        
        if (empty($plugin_slug)) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'Plugin slug is required'
            ), 400);
        }
        
        // Check if the plugin directory exists
        $plugin_dir = WP_PLUGIN_DIR . '/' . $plugin_slug;
        if (!file_exists($plugin_dir) || !is_dir($plugin_dir)) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'Plugin not found',
                'plugin_slug' => $plugin_slug,
                'plugin_dir' => $plugin_dir
            ), 404);
        }
        
        // Find the main plugin file
        $plugin_files = glob($plugin_dir . '/*.php');
        $plugin_file = null;
        
        foreach ($plugin_files as $file) {
            $plugin_data = get_plugin_data($file, false, false);
            if (!empty($plugin_data['Name'])) {
                $plugin_file = $file;
                break;
            }
        }
        
        if (!$plugin_file) {
            // If we can't find the main plugin file, try to delete the directory manually
            $this->recursive_rmdir($plugin_dir);
            
            if (!file_exists($plugin_dir)) {
                return new WP_REST_Response(array(
                    'success' => true,
                    'message' => 'Plugin directory deleted successfully',
                    'plugin_slug' => $plugin_slug
                ), 200);
            } else {
                return new WP_REST_Response(array(
                    'success' => false,
                    'message' => 'Failed to delete plugin directory',
                    'plugin_slug' => $plugin_slug
                ), 500);
            }
        }
        
        // Deactivate the plugin first
        $relative_path = str_replace(WP_PLUGIN_DIR . '/', '', $plugin_file);
        if (is_plugin_active($relative_path)) {
            deactivate_plugins($relative_path, true);
        }
        
        // Delete the plugin
        $result = delete_plugins(array($relative_path));
        
        if (is_wp_error($result)) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => $result->get_error_message(),
                'plugin_slug' => $plugin_slug
            ), 500);
        }
        
        return new WP_REST_Response(array(
            'success' => true,
            'message' => 'Plugin deleted successfully',
            'plugin_slug' => $plugin_slug
        ), 200);
    }
    
    /**
     * Helper function to recursively delete a directory
     */
    private function recursive_rmdir($dir) {
        if (!is_dir($dir)) {
            return;
        }
        
        $files = array_diff(scandir($dir), array('.', '..'));
        foreach ($files as $file) {
            $path = $dir . '/' . $file;
            is_dir($path) ? $this->recursive_rmdir($path) : unlink($path);
        }
        
        return rmdir($dir);
    }

    /**
     * Update an existing plugin
     * This method first deletes the existing plugin and then installs the new version
     */
    public function update_plugin($request) {
        $params = $request->get_params();
        $plugin_zip = isset($params['plugin_zip']) ? $params['plugin_zip'] : '';
        $plugin_slug = isset($params['plugin_slug']) ? sanitize_text_field($params['plugin_slug']) : '';
        $force_update = isset($params['force_update']) ? (bool)$params['force_update'] : false;
        
        if (empty($plugin_zip) || empty($plugin_slug)) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'Plugin ZIP and plugin slug are required'
            ), 400);
        }
        
        // First, delete the existing plugin
        $delete_request = new WP_REST_Request('POST', '/plugin-generator/v1/delete-plugin');
        $delete_request->set_param('api_key', $params['api_key']);
        $delete_request->set_param('plugin_slug', $plugin_slug);
        
        $delete_response = $this->delete_plugin($delete_request);
        $delete_data = $delete_response->get_data();
        
        // If deletion failed and it's not because the plugin doesn't exist, return the error
        if (!$delete_data['success'] && $delete_response->get_status() !== 404) {
            // If force update is enabled, continue anyway
            if (!$force_update) {
                return $delete_response;
            }
        }
        
        // Wait a moment to ensure filesystem operations complete
        sleep(1);
        
        // Now install the new plugin
        $install_request = new WP_REST_Request('POST', '/plugin-generator/v1/install-plugin');
        $install_request->set_param('api_key', $params['api_key']);
        $install_request->set_param('plugin_zip', $plugin_zip);
        
        $install_response = $this->install_plugin($install_request);
        $install_data = $install_response->get_data();
        
        // Add update-specific information to the response
        $install_data['update'] = true;
        $install_data['previous_deletion'] = $delete_data;
        
        return new WP_REST_Response($install_data, $install_response->get_status());
    }

    public function install_plugin($request) {
        if (!class_exists('WP_Filesystem_Direct')) {
            require_once ABSPATH . 'wp-admin/includes/class-wp-filesystem-base.php';
            require_once ABSPATH . 'wp-admin/includes/class-wp-filesystem-direct.php';
        }
        
        $params = $request->get_params();
        $plugin_zip = isset($params['plugin_zip']) ? $params['plugin_zip'] : '';
        $force_install = isset($params['force_install']) ? (bool)$params['force_install'] : false;
        
        if (empty($plugin_zip)) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'No plugin data provided'
            ), 400);
        }
        
        // Decode base64 plugin data
        $decoded = base64_decode($plugin_zip);
        
        // Create temporary file
        $upload_dir = wp_upload_dir();
        $temp_file = $upload_dir['basedir'] . '/plugin-generator-temp.zip';
        
        // Write to file
        $filesystem = new WP_Filesystem_Direct(null);
        $filesystem->put_contents($temp_file, $decoded, FS_CHMOD_FILE);
        
        // Include required files for plugin installation
        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/plugin-install.php';
        require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';
        require_once ABSPATH . 'wp-admin/includes/plugin.php';
        
        // If force install is enabled, use a custom upgrader skin that forces installation
        $skin = $force_install ? new Force_Upgrader_Skin() : new Automatic_Upgrader_Skin();
        
        // Use the WordPress upgrader to install the plugin
        $upgrader = new Plugin_Upgrader($skin);
        
        // If force install is enabled, add a filter to override the package destination
        if ($force_install) {
            add_filter('upgrader_package_options', array($this, 'force_install_filter'));
        }
        
        $result = $upgrader->install($temp_file);
        
        // Remove the filter if it was added
        if ($force_install) {
            remove_filter('upgrader_package_options', array($this, 'force_install_filter'));
        }
        
        // Clean up
        $filesystem->delete($temp_file);
        
        if (is_wp_error($result)) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => $result->get_error_message()
            ), 500);
        }
        
        if (false === $result) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'Plugin installation failed'
            ), 500);
        }
        
        // Get the installed plugin file
        $plugin_file = $upgrader->plugin_info();
        
        // Activate the plugin
        $activation_result = activate_plugin($plugin_file);
        
        if (is_wp_error($activation_result)) {
            return new WP_REST_Response(array(
                'success' => true,
                'activated' => false,
                'message' => 'Plugin installed but activation failed: ' . $activation_result->get_error_message()
            ), 200);
        }
        
        return new WP_REST_Response(array(
            'success' => true,
            'activated' => true,
            'message' => 'Plugin installed and activated successfully'
        ), 200);
    }
    
    /**
     * Filter to force plugin installation by overriding the destination
     */
    public function force_install_filter($options) {
        $options['clear_destination'] = true;
        $options['abort_if_destination_exists'] = false;
        return $options;
    }
}

/**
 * Custom upgrader skin that forces installation
 */
class Force_Upgrader_Skin extends Automatic_Upgrader_Skin {
    public function request_filesystem_credentials($error = false, $context = '', $allow_relaxed_file_ownership = false) {
        return true;
    }
}

// Initialize the plugin
$plugin_generator_connector = new PluginGeneratorConnector(); 