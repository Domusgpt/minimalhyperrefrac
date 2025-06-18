import { dataState } from './Data_Source.js';

export function initUI() {
  // Connect sliders to their value displays
  document.querySelectorAll('.slider').forEach(slider => {
    const valueDisplay = document.getElementById(`${slider.id}-value`);

    // Update value display on input
    slider.addEventListener('input', () => {
      if (valueDisplay) { // Check if valueDisplay element exists
        valueDisplay.textContent = parseFloat(slider.value).toFixed(2);
      }
    });

    // Initialize value displays if they exist and slider has a value
    if (valueDisplay && typeof slider.value !== 'undefined') { // Check if slider.value is defined
        valueDisplay.textContent = parseFloat(slider.value).toFixed(2);
    }
  });

  // Interactive parameters
  const morphFactorSlider = document.getElementById('morphFactor');
  if (morphFactorSlider) {
    morphFactorSlider.addEventListener('input', (event) => {
      dataState.morphFactor = parseFloat(event.target.value);
    });
  }

  const glitchIntensitySlider = document.getElementById('glitchIntensity');
  if (glitchIntensitySlider) {
    glitchIntensitySlider.addEventListener('input', (event) => {
      dataState.glitchIntensity = parseFloat(event.target.value);
    });
  }

  const rotationSpeedSlider = document.getElementById('rotationSpeed');
  if (rotationSpeedSlider) {
    rotationSpeedSlider.addEventListener('input', (event) => {
      dataState.rotationSpeed = parseFloat(event.target.value);
    });
  }

  const dimensionSlider = document.getElementById('dimension');
  if (dimensionSlider) {
    dimensionSlider.addEventListener('input', (event) => {
      dataState.dimension = parseFloat(event.target.value);
    });
  }

  const gridDensitySlider = document.getElementById('gridDensity');
  if (gridDensitySlider) {
    gridDensitySlider.addEventListener('input', (event) => {
      dataState.gridDensity = parseFloat(event.target.value);
    });
  }
}
