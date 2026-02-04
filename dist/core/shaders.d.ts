/** Shared fullscreen quad vertex shader */
export declare const VERTEX_SHADER = "\nattribute vec2 a_position;\nvarying vec2 v_texCoord;\nvoid main() {\n  v_texCoord = a_position * 0.5 + 0.5;\n  gl_Position = vec4(a_position, 0.0, 1.0);\n}\n";
/** Passthrough fragment shader (just samples the texture) */
export declare const PASSTHROUGH_FRAGMENT = "\nprecision mediump float;\nvarying vec2 v_texCoord;\nuniform sampler2D u_texture;\nvoid main() {\n  gl_FragColor = texture2D(u_texture, v_texCoord);\n}\n";
/** Compile a shader from source */
export declare function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader;
/** Link a program from vertex + fragment shaders */
export declare function createProgram(gl: WebGLRenderingContext, vertexSource: string, fragmentSource: string): WebGLProgram;
