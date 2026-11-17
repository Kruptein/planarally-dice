import { defineConfig } from "vite";

export default defineConfig({
    // Serves the example dice meshes (and their uv textures) from the site root
    publicDir: "../meshes",
    resolve: {
        // @planarally/dice is linked from the repository root, which has its own copy of Babylon
        dedupe: ["@babylonjs/core", "@babylonjs/havok"],
    },
    optimizeDeps: {
        // Pre-bundling would break the relative path Havok uses to fetch its .wasm file
        exclude: ["@babylonjs/havok"],
    },
});
