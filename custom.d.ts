declare module '*.svg' {
    const content: any;
    export default content;
}

/**
 * Type definitions for @jitsi/rnnoise-wasm
 */

interface IRnnoiseModule extends EmscriptenModule {
    _rnnoise_create: () => number;
    _rnnoise_destroy: (context: number) => void;
    _rnnoise_process_frame: (context: number, input: number, output: number) => number;
}

declare module '@jitsi/rnnoise-wasm' {
    /**
     * Creates an RNNoise WASM module synchronously.
     * @returns {IRnnoiseModule} The RNNoise WASM module instance
     */
    export function createRNNWasmModuleSync(): IRnnoiseModule;

    /**
     * Creates an RNNoise WASM module asynchronously.
     * @returns {Promise<IRnnoiseModule>} Promise that resolves to the RNNoise WASM module instance
     */
    export function createRNNWasmModule(): Promise<IRnnoiseModule>;
}
