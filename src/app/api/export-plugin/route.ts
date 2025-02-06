import { NextResponse } from "next/server"
import JSZip from "jszip"

export async function POST(req: Request) {
  try {
    const { pluginName, code } = await req.json()

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

    // Add the main plugin file
    pluginFolder.file(`${pluginName}.php`, code)

    // Add standard WordPress plugin structure
    const adminFolder = pluginFolder.folder("admin")
    if (!adminFolder) {
      throw new Error("Failed to create admin folder")
    }

    const includesFolder = pluginFolder.folder("includes")
    if (!includesFolder) {
      throw new Error("Failed to create includes folder")
    }

    const publicFolder = pluginFolder.folder("public")
    if (!publicFolder) {
      throw new Error("Failed to create public folder")
    }

    // Add standard files (admin, includes, public folders)
    const adminCssFolder = adminFolder.folder("css")
    if (!adminCssFolder) {
      throw new Error("Failed to create admin/css folder")
    }
    adminCssFolder.file("admin.css", "/* Admin styles */")

    const adminJsFolder = adminFolder.folder("js")
    if (!adminJsFolder) {
      throw new Error("Failed to create admin/js folder")
    }
    adminJsFolder.file("admin.js", "// Admin JavaScript")

    adminFolder.file(
      "class-admin.php",
      `<?php
namespace ${pluginName.replace(/-/g, "_")}\\Admin;

class Admin {
    public function __construct() {
        add_action('admin_init', array($this, 'init'));
    }

    public function init() {
        // Admin initialization code
    }
}`,
    )

    includesFolder.file(
      "class-loader.php",
      `<?php
namespace ${pluginName.replace(/-/g, "_")}\\Includes;

class Loader {
    protected $actions = array();
    protected $filters = array();

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
}`,
    )

    const publicCssFolder = publicFolder.folder("css")
    if (!publicCssFolder) {
      throw new Error("Failed to create public/css folder")
    }
    publicCssFolder.file("public.css", "/* Public styles */")

    const publicJsFolder = publicFolder.folder("js")
    if (!publicJsFolder) {
      throw new Error("Failed to create public/js folder")
    }
    publicJsFolder.file("public.js", "// Public JavaScript")

    publicFolder.file(
      "class-public.php",
      `<?php
namespace ${pluginName.replace(/-/g, "_")}\\Frontend;

class Frontend {
    public function __construct() {
        add_action('wp_enqueue_scripts', array($this, 'enqueue_assets'));
    }

    public function enqueue_assets() {
        // Enqueue frontend assets
    }
}`,
    )

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