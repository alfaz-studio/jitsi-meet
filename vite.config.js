import vitePluginSsi from '@catfyrr/vite-plugin-ssi';
import basicSsl from '@vitejs/plugin-basic-ssl';
import react from '@vitejs/plugin-react';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import svgr from 'vite-plugin-svgr';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Static files to copy to build root (dest: ".")
const ROOT_FILES = [
    'fonts',
    'images',
    'lang',
    'sounds',
    '_unlock',
    'base.html',
    'body.html',
    'config.js',
    'fonts.html',
    'head.html',
    'interface_config.js',
    'LICENSE',
    'manifest.json',
    'plugin.head.html',
    'pwa-worker.js',
    'title.html'
];

const COMMON_ROOT_FILES = [
    'node_modules/@jitsi/rnnoise-wasm/dist/rnnoise.wasm',
    'node_modules/@matrix-org/olm/olm.wasm',
    'node_modules/@tensorflow/tfjs-backend-wasm/dist/*.wasm',
    'node_modules/@vladmandic/human-models/models/{blazeface-front.bin,blazeface-front.json,emotion.bin,emotion.json}',
    'react/features/stream-effects/virtual-background/vendor/tflite/*.wasm',
    'resources/*.txt'
];

// Static files to copy to build/static folder
const STATIC_FILES = [
    'static/pwa',
    'static/themes',
    'static/analytics.js',
    'static/settingsToolbarAdditionalContent.html',
    'static/welcomePageAdditionalCard.html',
    'static/welcomePageAdditionalContent.html'

];

// Files to copy to build/libs folder
const LIB_FILES = [
    'node_modules/@jitsi/excalidraw/dist/excalidraw-assets',
    'node_modules/@jitsi/excalidraw/dist/excalidraw-assets-dev',
    'node_modules/lib-jitsi-meet/dist/umd/lib-jitsi-meet.*',
    'react/features/stream-effects/virtual-background/vendor/models/*.tflite'
];


/**
 * Plugin to run deploy-local.sh script
 */
function deployLocalPlugin(options = {}) {
    const {
        scriptPath = 'deploy-local.sh',
        timeout = 300000 // 5 minutes timeout
    } = options;

    return {
        name: 'vite-plugin-deploy-local',

        async writeBundle() {
            try {
                const execAsync = promisify(exec);
                const scriptFullPath = path.resolve(__dirname, scriptPath);

                if (fs.existsSync(scriptFullPath)) {
                    const stats = fs.statSync(scriptFullPath);

                    if (stats.isFile()) {
                        const { stdout, stderr } = await execAsync(scriptFullPath, {
                            timeout
                        });

                        stdout && console.log('Deploy script output:', stdout);
                        stderr && console.warn('Deploy script warnings:', stderr);
                    }
                }
            } catch (error) {
                console.error('Error running deploy local script:', error.message);
            }
        }
    };
}

export default defineConfig(({ mode }) => {
    const isProduction = mode === 'production';
    const isDev = !isProduction;
    // eslint-disable-next-line no-undef
    const analyzeBundle = Boolean(process.env.ANALYZE_BUNDLE);

    return {
        plugins: [
            vitePluginSsi(),
            basicSsl({
                name: 'jitsi-meet',
                domains: [ 'localhost', '127.0.0.1', '::1' ],
                certDir: './build/meet/certs'
            }),
            svgr({
                svgrOptions: {
                    dimensions: false,
                    expandProps: 'start'
                },
                include: '**/*.svg',
                exclude: ''
            }),
            react(),
            ...analyzeBundle ? [
                visualizer({
                    filename: './build/meet/app-stats.html',
                    open: true,
                    gzipSize: true,
                    brotliSize: true
                })
            ] : [],
            ...isProduction ? [
                deployLocalPlugin(),
                viteStaticCopy({
                    structured: false,
                    targets: [

                        // Root files
                        ...ROOT_FILES.map(src => {
                            return { src,
                                dest: '.',
                                overwrite: 'error' };
                        }),

                        // Common Root files
                        ...COMMON_ROOT_FILES.map(src => {
                            return { src,
                                dest: '.',
                                overwrite: 'error' };
                        }),

                        // Static files
                        ...STATIC_FILES.map(src => {
                            return { src,
                                dest: 'static',
                                overwrite: 'error' };
                        }),

                        // Library files
                        ...LIB_FILES.map(src => {
                            return { src,
                                dest: 'libs',
                                overwrite: 'error' };
                        })
                    ]
                })
            ] : [],
            ...isDev ? [
                viteStaticCopy({
                    structured: false,
                    targets: [

                        // Common Root files
                        ...COMMON_ROOT_FILES.map(src => {
                            return { src,
                                dest: '.',
                                overwrite: 'error' };
                        }),

                        // Library files
                        ...LIB_FILES.map(src => {
                            return { src,
                                dest: 'libs',
                                overwrite: 'error' };
                        })
                    ]
                })
            ] : []
        ],

        define: {
            '__DEV__': !isProduction,

            // Provide process for browser compatibility
            global: 'globalThis',
            'process.env': '{}',
            'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),

            // Define APP and other globals
            'APP': 'window.APP',
            'JitsiMeetJS': 'window.JitsiMeetJS',
            'config': 'window.config',
            'interfaceConfig': 'window.interfaceConfig'
        },

        resolve: {
            alias: {
                'focus-visible': 'focus-visible/dist/focus-visible.min.js',
                '@giphy/js-analytics': path.resolve(__dirname, 'giphy-analytics-stub.js')
            },
            extensions: [
                '.web.js',
                '.web.ts',
                '.web.tsx',
                '.tsx',
                '.ts',
                '.js',
                '.json'
            ]
        },

        css: {
            preprocessorOptions: {
                scss: {
                    silenceDeprecations: [
                        'legacy-js-api',
                        'import',
                        'global-builtin',
                        'color-functions',
                        'slash-div'
                    ]
                }
            }
        },

        // Configure worker and worklet handling
        worker: {
            format: 'es'
        },

        // Base path for deployment - matches the /meet/ subpath
        base: '/meet/',

        // Handle module resolution fallbacks
        build: {
            outDir: 'build/meet',
            sourcemap: true,
            rollupOptions: {
                input: [
                    'index.html',
                    'static/404.html',
                    'static/callback.html',
                    'static/close.html',
                    'static/close2.html',
                    'static/close3.html',
                    'static/dialInInfo.html',
                    'static/msredirect.html',
                    'static/oauth.html',
                    'static/offline.html',
                    'static/planLimit.html',
                    'static/prejoin.html',
                    'static/recommendedBrowsers.html',
                    'static/signout-callback.html',
                    'static/whiteboard.html'
                ]
            }
        }
    };
});
