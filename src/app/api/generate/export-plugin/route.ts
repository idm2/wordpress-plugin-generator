import { NextResponse } from "next/server"
import JSZip from "jszip"

interface ExportPluginRequest {
  pluginName: string
  code: string
  structure: "simplified" | "traditional"
}

export async function POST(req: Request) {
  try {
    const { pluginName, code, structure } = (await req.json()) as ExportPluginRequest

    if (!pluginName || !code) {
      return NextResponse.json({ error: "Missing plugin name or code" }, { status: 400 })
    }

    // Create a new ZIP file
    const zip = new JSZip()

    // Create the main plugin folder
    const pluginFolder = zip.folder(pluginName)
    if (!pluginFolder) {
      throw new Error("Failed to create plugin folder")
    }

    if (structure === "simplified") {
      // For simplified structure, just add the main plugin file
      const cleanCode = code
        .replace(/^```(?:php)?\s*|\s*```$/g, "")  // Remove code block markers
        .replace(/^[\s\S]*?<\?php/, "<?php")      // Ensure clean PHP opening tag
        .replace(/\n<\?php/g, "")                 // Remove any additional PHP tags
        .trim()

      const finalCode = cleanCode.startsWith("<?php") ? cleanCode : `<?php\n${cleanCode}`
      pluginFolder.file(`${pluginName}.php`, finalCode)
    } else {
      // For traditional structure, create the full WordPress plugin structure
      const headerMatch = code.match(/\/\*[\s\S]*?\*\//)
      const pluginHeader = headerMatch ? headerMatch[0] : ""

      // Create main plugin file
      const mainFileContent = `<?php
${pluginHeader}

/**
 * The plugin bootstrap file
 *
 * @link              ${pluginName.toLowerCase()}.com
 * @since             1.0.0
 * @package           ${pluginName.replace(/-/g, "_")}
 *
 * @wordpress-plugin
 */

// If this file is called directly, abort.
if (!defined('WPINC')) {
    die;
}

/**
 * Currently plugin version.
 * Start at version 1.0.0 and use SemVer - https://semver.org
 */
define('${pluginName.toUpperCase()}_VERSION', '1.0.0');

/**
 * Define plugin directory path and URL
 */
define('${pluginName.toUpperCase()}_PATH', plugin_dir_path(__FILE__));
define('${pluginName.toUpperCase()}_URL', plugin_dir_url(__FILE__));

/**
 * The code that runs during plugin activation.
 */
function activate_${pluginName.toLowerCase()}() {
    require_once ${pluginName.toUpperCase()}_PATH . 'includes/class-${pluginName.toLowerCase()}-activator.php';
    ${pluginName.replace(/-/g, "_")}_Activator::activate();
}

/**
 * The code that runs during plugin deactivation.
 */
function deactivate_${pluginName.toLowerCase()}() {
    require_once ${pluginName.toUpperCase()}_PATH . 'includes/class-${pluginName.toLowerCase()}-deactivator.php';
    ${pluginName.replace(/-/g, "_")}_Deactivator::deactivate();
}

register_activation_hook(__FILE__, 'activate_${pluginName.toLowerCase()}');
register_deactivation_hook(__FILE__, 'deactivate_${pluginName.toLowerCase()}');

/**
 * The core plugin class that is used to define internationalization,
 * admin-specific hooks, and public-facing site hooks.
 */
require_once ${pluginName.toUpperCase()}_PATH . 'includes/class-${pluginName.toLowerCase()}.php';

/**
 * Begins execution of the plugin.
 *
 * @since    1.0.0
 */
function run_${pluginName.toLowerCase()}() {
    $plugin = new ${pluginName.replace(/-/g, "_")}();
    $plugin->run();
}
run_${pluginName.toLowerCase()}();`

      pluginFolder.file(`${pluginName}.php`, mainFileContent)

      // Create index.php files for security
      const indexContent = `<?php // Silence is golden`
      pluginFolder.file('index.php', indexContent)

      // Create uninstall.php
      pluginFolder.file(
        'uninstall.php',
        `<?php
// If uninstall not called from WordPress, then exit.
if (!defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}`
      )

      // Create README.txt
      pluginFolder.file(
        'README.txt',
        `=== ${pluginName} ===
Contributors: (this should be a list of wordpress.org userid's)
Tags: comments, spam
Requires at least: 6.0
Tested up to: 6.4
Stable tag: 1.0.0
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html

Here is a short description of the plugin.

== Description ==

This is the long description. No limit, and you can use Markdown (as well as in the following sections).

== Installation ==

1. Upload \`${pluginName}\` to the \`/wp-content/plugins/\` directory
2. Activate the plugin through the 'Plugins' menu in WordPress

== Changelog ==

= 1.0 =
* Initial release`
      )

      // Create LICENSE.txt
      pluginFolder.file(
        'LICENSE.txt',
        `                    GNU GENERAL PUBLIC LICENSE
                       Version 2, June 1991

 Copyright (C) 1989, 1991 Free Software Foundation, Inc.,
 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA
 Everyone is permitted to copy and distribute verbatim copies
 of this license document, but changing it is not allowed.`
      )

      // Create admin directory structure
      const adminFolder = pluginFolder.folder("admin")
      if (!adminFolder) {
        throw new Error("Failed to create admin folder")
      }

      // Add admin subfolders
      adminFolder.folder("css").file('index.php', indexContent)
      adminFolder.folder("js").file('index.php', indexContent)
      adminFolder.folder("partials").file('index.php', indexContent)

      // Create admin class file
      adminFolder.file(
        `class-${pluginName.toLowerCase()}-admin.php`,
        `<?php
/**
 * The admin-specific functionality of the plugin.
 *
 * @since      1.0.0
 * @package    ${pluginName.replace(/-/g, "_")}
 * @subpackage ${pluginName.replace(/-/g, "_")}/admin
 */
class ${pluginName.replace(/-/g, "_")}_Admin {

    private $plugin_name;
    private $version;

    public function __construct($plugin_name, $version) {
        $this->plugin_name = $plugin_name;
        $this->version = $version;
        
        // Add menu item and hooks for delete posts functionality
        add_action('admin_menu', array($this, 'add_delete_posts_button'));
        add_action('admin_post_delete_all_posts', array($this, 'delete_all_posts'));
    }

    public function enqueue_styles() {
        wp_enqueue_style(
            $this->plugin_name,
            plugin_dir_url(__FILE__) . 'css/' . $this->plugin_name . '-admin.css',
            array(),
            $this->version,
            'all'
        );
    }

    public function enqueue_scripts() {
        wp_enqueue_script(
            $this->plugin_name,
            plugin_dir_url(__FILE__) . 'js/' . $this->plugin_name . '-admin.js',
            array('jquery'),
            $this->version,
            false
        );
    }

    /**
     * Add menu item for delete posts functionality
     */
    public function add_delete_posts_button() {
        add_menu_page(
            'Delete All Posts',
            'Delete All Posts',
            'manage_options',
            'delete-all-posts',
            array($this, 'delete_posts_page')
        );
    }

    /**
     * Render the delete posts admin page
     */
    public function delete_posts_page() {
        ?>
        <div class="wrap">
            <h2>Delete All Posts</h2>
            <form method="post" action="<?php echo admin_url('admin-post.php'); ?>">
                <input type="hidden" name="action" value="delete_all_posts">
                <?php wp_nonce_field('delete_all_posts_nonce', 'delete_all_posts_nonce'); ?>
                <input type="submit" class="button button-primary" value="Delete All Posts">
            </form>
        </div>
        <?php
    }

    /**
     * Handle the delete posts action
     */
    public function delete_all_posts() {
        if (!current_user_can('manage_options')) {
            return;
        }

        check_admin_referer('delete_all_posts_nonce', 'delete_all_posts_nonce');

        $posts = get_posts(array(
            'post_type' => 'post',
            'numberposts' => -1,
            'post_status' => 'any'
        ));

        foreach ($posts as $post) {
            wp_delete_post($post->ID, true);
        }

        wp_redirect(admin_url('edit.php'));
        exit;
    }
}`
      )

      // Create includes directory structure
      const includesFolder = pluginFolder.folder("includes")
      if (!includesFolder) {
        throw new Error("Failed to create includes folder")
      }

      includesFolder.file('index.php', indexContent)

      // Create main plugin class
      includesFolder.file(
        `class-${pluginName.toLowerCase()}.php`,
        `<?php
/**
 * The core plugin class.
 *
 * @since      1.0.0
 * @package    ${pluginName.replace(/-/g, "_")}
 * @subpackage ${pluginName.replace(/-/g, "_")}/includes
 */
class ${pluginName.replace(/-/g, "_")} {

    protected $loader;
    protected $plugin_name;
    protected $version;

    public function __construct() {
        $this->version = ${pluginName.toUpperCase()}_VERSION;
        $this->plugin_name = '${pluginName.toLowerCase()}';

        $this->load_dependencies();
        $this->set_locale();
        $this->define_admin_hooks();
        $this->define_public_hooks();
    }

    private function load_dependencies() {
        require_once ${pluginName.toUpperCase()}_PATH . 'includes/class-${pluginName.toLowerCase()}-loader.php';
        require_once ${pluginName.toUpperCase()}_PATH . 'includes/class-${pluginName.toLowerCase()}-i18n.php';
        require_once ${pluginName.toUpperCase()}_PATH . 'admin/class-${pluginName.toLowerCase()}-admin.php';
        require_once ${pluginName.toUpperCase()}_PATH . 'public/class-${pluginName.toLowerCase()}-public.php';

        $this->loader = new ${pluginName.replace(/-/g, "_")}_Loader();
    }

    private function set_locale() {
        $plugin_i18n = new ${pluginName.replace(/-/g, "_")}_i18n();
        $this->loader->add_action('plugins_loaded', $plugin_i18n, 'load_plugin_textdomain');
    }

    private function define_admin_hooks() {
        $plugin_admin = new ${pluginName.replace(/-/g, "_")}_Admin($this->get_plugin_name(), $this->get_version());
        $this->loader->add_action('admin_enqueue_scripts', $plugin_admin, 'enqueue_styles');
        $this->loader->add_action('admin_enqueue_scripts', $plugin_admin, 'enqueue_scripts');
    }

    private function define_public_hooks() {
        $plugin_public = new ${pluginName.replace(/-/g, "_")}_Public($this->get_plugin_name(), $this->get_version());
        $this->loader->add_action('wp_enqueue_scripts', $plugin_public, 'enqueue_styles');
        $this->loader->add_action('wp_enqueue_scripts', $plugin_public, 'enqueue_scripts');
    }

    public function run() {
        $this->loader->run();
    }

    public function get_plugin_name() {
        return $this->plugin_name;
    }

    public function get_loader() {
        return $this->loader;
    }

    public function get_version() {
        return $this->version;
    }
}`
      )

      // Create loader class
      includesFolder.file(
        `class-${pluginName.toLowerCase()}-loader.php`,
        `<?php
/**
 * Register all actions and filters for the plugin.
 *
 * @since      1.0.0
 * @package    ${pluginName.replace(/-/g, "_")}
 * @subpackage ${pluginName.replace(/-/g, "_")}/includes
 */
class ${pluginName.replace(/-/g, "_")}_Loader {

    protected $actions;
    protected $filters;

    public function __construct() {
        $this->actions = array();
        $this->filters = array();
    }

    public function add_action($hook, $component, $callback, $priority = 10, $accepted_args = 1) {
        $this->actions = $this->add($this->actions, $hook, $component, $callback, $priority, $accepted_args);
    }

    public function add_filter($hook, $component, $callback, $priority = 10, $accepted_args = 1) {
        $this->filters = $this->add($this->filters, $hook, $component, $callback, $priority, $accepted_args);
    }

    private function add($hooks, $hook, $component, $callback, $priority, $accepted_args) {
        $hooks[] = array(
            'hook'          => $hook,
            'component'     => $component,
            'callback'      => $callback,
            'priority'      => $priority,
            'accepted_args' => $accepted_args
        );
        return $hooks;
    }

    public function run() {
        foreach ($this->filters as $hook) {
            add_filter($hook['hook'], array($hook['component'], $hook['callback']), $hook['priority'], $hook['accepted_args']);
        }
        foreach ($this->actions as $hook) {
            add_action($hook['hook'], array($hook['component'], $hook['callback']), $hook['priority'], $hook['accepted_args']);
        }
    }
}`
      )

      // Create i18n class
      includesFolder.file(
        `class-${pluginName.toLowerCase()}-i18n.php`,
        `<?php
/**
 * Define the internationalization functionality.
 *
 * @since      1.0.0
 * @package    ${pluginName.replace(/-/g, "_")}
 * @subpackage ${pluginName.replace(/-/g, "_")}/includes
 */
class ${pluginName.replace(/-/g, "_")}_i18n {

    public function load_plugin_textdomain() {
        load_plugin_textdomain(
            '${pluginName.toLowerCase()}',
            false,
            dirname(dirname(plugin_basename(__FILE__))) . '/languages/'
        );
    }
}`
      )

      // Create activator class
      includesFolder.file(
        `class-${pluginName.toLowerCase()}-activator.php`,
        `<?php
/**
 * Fired during plugin activation.
 *
 * @since      1.0.0
 * @package    ${pluginName.replace(/-/g, "_")}
 * @subpackage ${pluginName.replace(/-/g, "_")}/includes
 */
class ${pluginName.replace(/-/g, "_")}_Activator {

    public static function activate() {
        // Activation code here
    }
}`
      )

      // Create deactivator class
      includesFolder.file(
        `class-${pluginName.toLowerCase()}-deactivator.php`,
        `<?php
/**
 * Fired during plugin deactivation.
 *
 * @since      1.0.0
 * @package    ${pluginName.replace(/-/g, "_")}
 * @subpackage ${pluginName.replace(/-/g, "_")}/includes
 */
class ${pluginName.replace(/-/g, "_")}_Deactivator {

    public static function deactivate() {
        // Deactivation code here
    }
}`
      )

      // Create languages directory
      const languagesFolder = pluginFolder.folder("languages")
      if (!languagesFolder) {
        throw new Error("Failed to create languages folder")
      }
      languagesFolder.file('index.php', indexContent)
      languagesFolder.file(`${pluginName.toLowerCase()}.pot`, '')

      // Create public directory structure
      const publicFolder = pluginFolder.folder("public")
      if (!publicFolder) {
        throw new Error("Failed to create public folder")
      }

      // Add public subfolders
      publicFolder.folder("css").file('index.php', indexContent)
      publicFolder.folder("js").file('index.php', indexContent)
      publicFolder.folder("partials").file('index.php', indexContent)

      // Create public class file
      publicFolder.file(
        `class-${pluginName.toLowerCase()}-public.php`,
        `<?php
/**
 * The public-facing functionality of the plugin.
 *
 * @since      1.0.0
 * @package    ${pluginName.replace(/-/g, "_")}
 * @subpackage ${pluginName.replace(/-/g, "_")}/public
 */
class ${pluginName.replace(/-/g, "_")}_Public {

    private $plugin_name;
    private $version;

    public function __construct($plugin_name, $version) {
        $this->plugin_name = $plugin_name;
        $this->version = $version;
    }

    public function enqueue_styles() {
        wp_enqueue_style(
            $this->plugin_name,
            plugin_dir_url(__FILE__) . 'css/plugin-name-public.css',
            array(),
            $this->version,
            'all'
        );
    }

    public function enqueue_scripts() {
        wp_enqueue_script(
            $this->plugin_name,
            plugin_dir_url(__FILE__) . 'js/plugin-name-public.js',
            array('jquery'),
            $this->version,
            false
        );
    }
}`
      )
    }

    // Generate the ZIP file as a Uint8Array
    const zipContent = await zip.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
      compressionOptions: {
        level: 9,
      },
    })

    // Return the ZIP file with appropriate headers
    return new Response(zipContent, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${pluginName}.zip"`,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    })
  } catch (error) {
    console.error("Error creating plugin ZIP:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create plugin ZIP" },
      { status: 500 },
    )
  }
}

export async function OPTIONS(req: Request) {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}

