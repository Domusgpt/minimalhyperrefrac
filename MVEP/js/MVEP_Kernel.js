import { vertexShaderSource, fragmentShaderSource } from './Shader_Source.js';
import { dataState } from './Data_Source.js';

export class HypercubeLatticeEffect {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (!this.gl) {
      console.error('WebGL not supported');
      alert('WebGL is not supported or is disabled. Please enable it in your browser settings or try a different browser.');
      return;
    }

    // Animation properties (internal to kernel)
    this.startTime = Date.now();
    this.mouseX = 0.5;
    this.mouseY = 0.5;

    // Initialize
    if (!this.initShaders()) return; // Stop if shaders fail
    this.initBuffers();
    this.setupInteraction();
    this.resize();
    // this.animate(); // Animation will be started by main.js
  }

  initShaders() {
    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) {
        console.error("Shader creation failed. Kernel initialization aborted.");
        return false;
    }

    this.program = this.createProgram(vertexShader, fragmentShader);

    if (!this.program) {
        console.error("Shader program linking failed. Kernel initialization aborted.");
        return false;
    }

    // Get attribute and uniform locations
    this.positionAttributeLocation = this.gl.getAttribLocation(this.program, 'a_position');
    this.resolutionUniformLocation = this.gl.getUniformLocation(this.program, 'u_resolution');
    this.timeUniformLocation = this.gl.getUniformLocation(this.program, 'u_time');
    this.mouseUniformLocation = this.gl.getUniformLocation(this.program, 'u_mouse');
    this.morphFactorUniformLocation = this.gl.getUniformLocation(this.program, 'u_morphFactor');
    this.glitchIntensityUniformLocation = this.gl.getUniformLocation(this.program, 'u_glitchIntensity');
    this.rotationSpeedUniformLocation = this.gl.getUniformLocation(this.program, 'u_rotationSpeed');
    this.dimensionUniformLocation = this.gl.getUniformLocation(this.program, 'u_dimension');
    this.gridDensityUniformLocation = this.gl.getUniformLocation(this.program, 'u_gridDensity');
    return true;
  }

  createShader(type, source) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    const success = this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS);
    if (!success) {
      console.error("Could not compile shader:", this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  createProgram(vertexShader, fragmentShader) {
    const program = this.gl.createProgram();
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    const success = this.gl.getProgramParameter(program, this.gl.LINK_STATUS);
    if (!success) {
      console.error("Could not link program:", this.gl.getProgramInfoLog(program));
      this.gl.deleteProgram(program);
      return null;
    }
    return program;
  }

  initBuffers() {
    this.positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    // Set the geometry - a rectangle that covers the entire viewport (2 triangles using TRIANGLE_STRIP)
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([
        -1.0, -1.0,  // bottom left
         1.0, -1.0,  // bottom right
        -1.0,  1.0,  // top left
         1.0,  1.0,  // top right
      ]),
      this.gl.STATIC_DRAW
    );
  }

  setupInteraction() {
    // Track mouse position
    this.canvas.addEventListener('mousemove', (event) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = (event.clientX - rect.left) / rect.width;
      this.mouseY = 1.0 - (event.clientY - rect.top) / rect.height; // Flip Y for WebGL
    });

    // Handle touch events for mobile
    this.canvas.addEventListener('touchmove', (event) => {
      if (event.touches.length > 0) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouseX = (event.touches[0].clientX - rect.left) / rect.width;
        this.mouseY = 1.0 - (event.touches[0].clientY - rect.top) / rect.height;
        event.preventDefault(); // Important for touch scrolling
      }
    }, { passive: false }); // passive: false to allow preventDefault

    // Handle window resize
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const displayWidth = this.canvas.clientWidth;
    const displayHeight = this.canvas.clientHeight;

    if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
      this.canvas.width = displayWidth;
      this.canvas.height = displayHeight;
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  render() { // Removed 'time' parameter, will get it from this.startTime
    if (!this.gl || !this.program) return; // Ensure GL context and program are available

    const currentTime = Date.now();
    const elapsedTime = (currentTime - this.startTime) / 1000;

    this.gl.clearColor(0.05, 0.05, 0.1, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    this.gl.useProgram(this.program);

    this.gl.enableVertexAttribArray(this.positionAttributeLocation);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.vertexAttribPointer(
      this.positionAttributeLocation,
      2,          // size (num components per iteration)
      this.gl.FLOAT,   // type of data
      false,      // normalize
      0,          // stride
      0           // offset
    );

    // Set the uniforms, reading from dataState for controlled ones
    this.gl.uniform2f(this.resolutionUniformLocation, this.canvas.width, this.canvas.height);
    this.gl.uniform1f(this.timeUniformLocation, elapsedTime); // Use calculated elapsedTime
    this.gl.uniform2f(this.mouseUniformLocation, this.mouseX, this.mouseY);
    this.gl.uniform1f(this.morphFactorUniformLocation, dataState.morphFactor);
    this.gl.uniform1f(this.glitchIntensityUniformLocation, dataState.glitchIntensity);
    this.gl.uniform1f(this.rotationSpeedUniformLocation, dataState.rotationSpeed);
    this.gl.uniform1f(this.dimensionUniformLocation, dataState.dimension);
    this.gl.uniform1f(this.gridDensityUniformLocation, dataState.gridDensity);

    // Draw the geometry (2 triangles using TRIANGLE_STRIP)
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }
}
