export const vertexShaderSource = `
              attribute vec2 a_position;

              void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
              }
            `;

export const fragmentShaderSource = `
              precision highp float;

              uniform vec2 u_resolution;
              uniform float u_time;
              uniform vec2 u_mouse;
              uniform float u_morphFactor;
              uniform float u_glitchIntensity;
              uniform float u_rotationSpeed;
              uniform float u_dimension;
              uniform float u_gridDensity;

              // 4D rotation matrices around various planes
              mat4 rotateXY(float theta) {
                float c = cos(theta);
                float s = sin(theta);
                return mat4(
                  c, -s, 0, 0,
                  s, c, 0, 0,
                  0, 0, 1, 0,
                  0, 0, 0, 1
                );
              }

              mat4 rotateXZ(float theta) {
                float c = cos(theta);
                float s = sin(theta);
                return mat4(
                  c, 0, -s, 0,
                  0, 1, 0, 0,
                  s, 0, c, 0,
                  0, 0, 0, 1
                );
              }

              mat4 rotateXW(float theta) {
                float c = cos(theta);
                float s = sin(theta);
                return mat4(
                  c, 0, 0, -s,
                  0, 1, 0, 0,
                  0, 0, 1, 0,
                  s, 0, 0, c
                );
              }

              mat4 rotateYZ(float theta) {
                float c = cos(theta);
                float s = sin(theta);
                return mat4(
                  1, 0, 0, 0,
                  0, c, -s, 0,
                  0, s, c, 0,
                  0, 0, 0, 1
                );
              }

              mat4 rotateYW(float theta) {
                float c = cos(theta);
                float s = sin(theta);
                return mat4(
                  1, 0, 0, 0,
                  0, c, 0, -s,
                  0, 0, 1, 0,
                  0, s, 0, c
                );
              }

              mat4 rotateZW(float theta) {
                float c = cos(theta);
                float s = sin(theta);
                return mat4(
                  1, 0, 0, 0,
                  0, 1, 0, 0,
                  0, 0, c, -s,
                  0, 0, s, c
                );
              }

              // Project a 4D point to 3D space
              vec3 project4Dto3D(vec4 p) {
                float w = 2.0 / (2.0 + p.w); // Perspective divide
                return vec3(p.x * w, p.y * w, p.z * w);
              }

              // Project a 3D point to 2D space
              vec2 project3Dto2D(vec3 p) {
                float z = 2.0 / (3.0 + p.z); // Perspective divide
                return vec2(p.x * z, p.y * z);
              }

              // Convert from screen space to normalized cube coordinates
              vec3 screenToNormalizedCoords(vec2 screen) {
                vec2 aspectRatio = vec2(u_resolution.x / u_resolution.y, 1.0);
                return vec3((screen * 2.0 - 1.0) * aspectRatio * 2.0, 0.0);
              }

              // Function to create a smooth-edged grid line
              float gridLine(float position, float width) {
                float halfW = width * 0.5;
                return smoothstep(0.0, halfW, halfW - abs(position));
              }

              // Calculate distance to the nearest point on a 3D grid
              float distanceToGridPoint(vec3 p, float gridSize) {
                vec3 gridPos = floor(p * gridSize + 0.5) / gridSize;
                return length(p - gridPos);
              }

              // Distance to nearest edge in 3D lattice
              float latticeEdges(vec3 p, float gridSize, float lineWidth) {
                vec3 grid = fract(p * gridSize);
                vec3 edges = 1.0 - smoothstep(0.0, lineWidth, abs(grid - 0.5));
                return max(max(edges.x, edges.y), edges.z);
              }

              // Distance to nearest vertex in 3D lattice
              float latticeVertices(vec3 p, float gridSize, float vertexSize) {
                vec3 grid = fract(p * gridSize);
                vec3 distToVertex = min(grid, 1.0 - grid);
                float minDist = min(min(distToVertex.x, distToVertex.y), distToVertex.z);
                return 1.0 - smoothstep(0.0, vertexSize, minDist);
              }

              // Create a hypercube (tesseract) lattice
              float hypercubeLattice(vec3 p, float morphFactor, float gridSize) {
                // Create base cubic lattice
                float edges = latticeEdges(p, gridSize, 0.03);
                float vertices = latticeVertices(p, gridSize, 0.05);

                // Add time-based distortion to simulate hypercube morphing
                float timeFactor = u_time * 0.2 * u_rotationSpeed;

                // Apply non-linear distortion based on morphFactor
                vec3 distortedP = p;
                distortedP.x += sin(p.z * 2.0 + timeFactor) * morphFactor * 0.2;
                distortedP.y += cos(p.x * 2.0 + timeFactor) * morphFactor * 0.2;
                distortedP.z += sin(p.y * 2.0 + timeFactor) * morphFactor * 0.1;

                // Apply 4D rotation projection when morphing to a hypercube
                if (u_dimension > 3.0) {
                  // Create a 4D point by extending our 3D point
                  float w = sin(length(p) * 3.0 + u_time * 0.3) * (u_dimension - 3.0);
                  vec4 p4d = vec4(distortedP, w);

                  // Apply 4D rotations
                  p4d = rotateXW(timeFactor * 0.31) * p4d;
                  p4d = rotateYW(timeFactor * 0.27) * p4d;
                  p4d = rotateZW(timeFactor * 0.23) * p4d;

                  // Project back to 3D
                  distortedP = project4Dto3D(p4d);
                }

                // Calculate lattice values for the distorted position
                float distortedEdges = latticeEdges(distortedP, gridSize, 0.03);
                float distortedVertices = latticeVertices(distortedP, gridSize, 0.05);

                // Blend between regular and distorted lattice based on morphFactor
                edges = mix(edges, distortedEdges, morphFactor);
                vertices = mix(vertices, distortedVertices, morphFactor);

                return max(edges, vertices);
              }

              void main() {
                // Normalized pixel coordinates
                vec2 uv = gl_FragCoord.xy / u_resolution.xy;

                // Correct aspect ratio
                float aspectRatio = u_resolution.x / u_resolution.y;
                uv.x *= aspectRatio;

                // Center coordinates
                vec2 center = vec2(u_mouse.x * aspectRatio, u_mouse.y);

                // Create 3D space coordinates
                vec3 p = vec3(uv - center, 0.0);

                // Apply rotation based on time
                float timeRotation = u_time * 0.2 * u_rotationSpeed;
                mat2 rotation = mat2(
                  cos(timeRotation), -sin(timeRotation),
                  sin(timeRotation), cos(timeRotation)
                );
                p.xy = rotation * p.xy;

                // Add z-dimension movement
                p.z = sin(u_time * 0.1) * 0.5;

                // Calculate hypercube lattice with grid density
                float lattice = hypercubeLattice(p, u_morphFactor, u_gridDensity);

                // Apply RGB color splitting for glitch effect
                float glitchAmount = u_glitchIntensity * (0.1 + 0.1 * sin(u_time * 5.0));

                // Calculate color offset vectors
                vec2 rOffset = vec2(glitchAmount, glitchAmount * 0.5);
                vec2 gOffset = vec2(-glitchAmount * 0.3, glitchAmount * 0.2);
                vec2 bOffset = vec2(glitchAmount * 0.1, -glitchAmount * 0.4);

                // Apply color channel shifting
                float r = hypercubeLattice(vec3(p.xy + rOffset, p.z), u_morphFactor, u_gridDensity);
                float g = hypercubeLattice(vec3(p.xy + gOffset, p.z), u_morphFactor, u_gridDensity);
                float b = hypercubeLattice(vec3(p.xy + bOffset, p.z), u_morphFactor, u_gridDensity);

                // Create moiré pattern by overlaying slightly offset grids
                float moireGrid1 = hypercubeLattice(p, u_morphFactor, u_gridDensity * 1.01);
                float moireGrid2 = hypercubeLattice(p, u_morphFactor, u_gridDensity * 0.99);
                float moire = abs(moireGrid1 - moireGrid2) * 0.5;

                // Blend the moiré pattern with the RGB lattice
                r = mix(r, moire, 0.3);
                g = mix(g, moire, 0.4);
                b = mix(b, moire, 0.5);

                // Base colors for the hypercube
                vec3 baseColor = vec3(0.1, 0.2, 0.4);
                vec3 latticeColor = vec3(0.9, 0.8, 1.0);

                // Final color with RGB glitch effect
                vec3 color = mix(baseColor, latticeColor, vec3(r, g, b));

                // Add subtle pulsing glow
                color += vec3(0.1, 0.2, 0.4) * (0.5 + 0.5 * sin(u_time * 0.5));

                // Vignette effect
                float vignette = 1.0 - smoothstep(0.4, 1.4, length(uv - vec2(center.x, center.y)));
                color *= vignette;

                gl_FragColor = vec4(color, 1.0);
              }
            `;
