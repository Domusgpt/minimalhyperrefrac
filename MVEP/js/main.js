import { HypercubeLatticeEffect } from './MVEP_Kernel.js';
import { initUI } from './UI_Interface.js';

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('hypercube-canvas');
  if (!canvas) {
    console.error('Canvas element #hypercube-canvas not found!');
    alert('Error: Canvas element #hypercube-canvas not found. The animation cannot start.');
    return;
  }

  try {
    const effect = new HypercubeLatticeEffect(canvas);

    if (!effect.gl) {
        console.error("HypercubeLatticeEffect initialization failed, possibly due to no WebGL context. Effect.gl is null.");
        // Attempt to inform the user through the UI if possible, or fallback to alert.
        const controlsDiv = document.querySelector('.controls');
        if (controlsDiv) {
            const errorMsg = document.createElement('p');
            errorMsg.textContent = 'Error: WebGL initialization failed. Please ensure your browser supports WebGL and it is enabled.';
            errorMsg.style.color = 'red';
            controlsDiv.parentNode.insertBefore(errorMsg, controlsDiv);
        } else {
            alert('Error: WebGL initialization failed. Please ensure your browser supports WebGL and it is enabled.');
        }
        return; // Stop further execution if WebGL context is not available
    }

    initUI(); // Setup UI controls and their listeners

    // Start the animation loop
    function animateLoop() {
      if (effect && typeof effect.render === 'function') {
        effect.render(); // Kernel's render method calculates its own time
      }
      requestAnimationFrame(animateLoop);
    }

    // Check if the program was successfully linked in the kernel
    if (effect.program) {
        animateLoop(); // Start the loop only if the shader program is valid
    } else {
        console.error("Shader program not available in HypercubeLatticeEffect. Animation not started.");
        // Optionally, inform the user on the page
        const controlsDiv = document.querySelector('.controls');
         if (controlsDiv) {
            const errorMsg = document.createElement('p');
            errorMsg.textContent = 'Error: Shader program initialization failed. Animation cannot start.';
            errorMsg.style.color = 'red';
            controlsDiv.parentNode.insertBefore(errorMsg, controlsDiv);
        } else {
            alert('Error: Shader program initialization failed. Animation cannot start.');
        }
    }

  } catch (error) {
    console.error("Error initializing MVEP:", error);
    alert('An unexpected error occurred while initializing the visualization. Check console for details.');
  }
});
