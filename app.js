const plotEl = document.getElementById("plot");
const urlParams = new URLSearchParams(window.location.search);
const isPosterMode = urlParams.get("view") === "poster";

const elements = {
  patternSelect: document.getElementById("pattern-select"),
  primeCount: document.getElementById("prime-count"),
  primeCountValue: document.getElementById("prime-count-value"),
  pointSize: document.getElementById("point-size"),
  pointSizeValue: document.getElementById("point-size-value"),
  scale: document.getElementById("scale"),
  scaleValue: document.getElementById("scale-value"),
  colorSelect: document.getElementById("color-select"),
  mirrorToggle: document.getElementById("mirror-toggle"),
  rotateToggle: document.getElementById("rotate-toggle"),
  largestPrime: document.getElementById("largest-prime"),
  visiblePoints: document.getElementById("visible-points"),
  activeFormula: document.getElementById("active-formula"),
  formulaLabel: document.getElementById("formula-label"),
  formulaLine1: document.getElementById("formula-line-1"),
  formulaLine2: document.getElementById("formula-line-2"),
  formulaLine3: document.getElementById("formula-line-3"),
  posterFormulaLine1: document.getElementById("poster-formula-line-1"),
  posterFormulaLine2: document.getElementById("poster-formula-line-2"),
  posterFormulaLine3: document.getElementById("poster-formula-line-3"),
  posterMetaPrimes: document.getElementById("poster-meta-primes"),
  posterMetaLargest: document.getElementById("poster-meta-largest"),
};

const patternLabels = {
  wing: "x = p sin(p) cos(p), y = p sin²(p), z = p cos(p)",
  helix: "x = sqrt(p) cos(p), y = sqrt(p) sin(p), z = log(p) p / 3",
  lattice: "x = p sin(p / 7), y = p cos(p / 11), z = p sin(p / 13)",
};

const patternFormulaLines = {
  wing: ["x = p sin(p) cos(p)", "y = p sin²(p)", "z = p cos(p)"],
  helix: ["x = sqrt(p) cos(p)", "y = sqrt(p) sin(p)", "z = log(p) p / 3"],
  lattice: ["x = p sin(p / 7)", "y = p cos(p / 11)", "z = p sin(p / 13)"],
};

let animationFrameId = null;
let currentAngle = 0;
const primeCache = [2];

function generateFirstNPrimes(count) {
  if (primeCache.length >= count) {
    return primeCache.slice(0, count);
  }

  let candidate = primeCache[primeCache.length - 1] + 1;
  if (candidate > 2 && candidate % 2 === 0) {
    candidate += 1;
  }

  while (primeCache.length < count) {
    let isPrime = true;
    const limit = Math.sqrt(candidate);

    for (let index = 0; index < primeCache.length; index += 1) {
      const prime = primeCache[index];
      if (prime > limit) {
        break;
      }
      if (candidate % prime === 0) {
        isPrime = false;
        break;
      }
    }

    if (isPrime) {
      primeCache.push(candidate);
    }
    candidate += 2;
  }

  return primeCache.slice(0, count);
}

function mapPrimeToPoint(prime, mode, scale, largestPrime) {
  const normalizedScale = scale / Math.max(largestPrime, 1);

  if (mode === "helix") {
    const radius = Math.sqrt(prime) * 1.8;
    return {
      x: radius * Math.cos(prime) * normalizedScale * 4,
      y: radius * Math.sin(prime) * normalizedScale * 4,
      z: Math.log(prime) * prime * normalizedScale * 0.9,
    };
  }

  if (mode === "lattice") {
    return {
      x: prime * Math.sin(prime / 7) * normalizedScale,
      y: prime * Math.cos(prime / 11) * normalizedScale,
      z: prime * Math.sin(prime / 13) * normalizedScale,
    };
  }

  return {
    x: prime * Math.sin(prime) * Math.cos(prime) * normalizedScale,
    y: prime * Math.sin(prime) * Math.sin(prime) * normalizedScale,
    z: prime * Math.cos(prime) * normalizedScale,
  };
}

function colorFromPrime(prime, index, previousPrime, mode, count) {
  if (mode === "modulo") {
    const hue = ((prime % 12) / 12) * 360;
    return `hsl(${hue} 95% 72%)`;
  }

  if (mode === "gap") {
    const gap = previousPrime ? prime - previousPrime : 1;
    const hue = Math.min(340, 200 + gap * 10);
    const lightness = Math.min(82, 58 + gap * 1.4);
    return `hsl(${hue} 90% ${lightness}%)`;
  }

  const hue = (index / Math.max(count - 1, 1)) * 320;
  return `hsl(${hue} 94% 72%)`;
}

function buildTrace(primes, config, mirrored = false) {
  const x = [];
  const y = [];
  const z = [];
  const colors = [];
  const largestPrime = primes[primes.length - 1];

  for (let index = 0; index < primes.length; index += 1) {
    const prime = primes[index];
    const point = mapPrimeToPoint(prime, config.pattern, config.scale, largestPrime);

    x.push(mirrored ? -point.x : point.x);
    y.push(point.y);
    z.push(point.z);
    colors.push(colorFromPrime(prime, index, primes[index - 1], config.colorMode, primes.length));
  }

  return {
    type: "scatter3d",
    mode: "markers",
    x,
    y,
    z,
    hovertemplate:
      "Prime: %{customdata}<br>x: %{x:.3f}<br>y: %{y:.3f}<br>z: %{z:.3f}<extra></extra>",
    customdata: primes,
    marker: {
      size: config.pointSize,
      color: colors,
      opacity: mirrored ? 0.38 : 0.9,
      line: {
        width: 0,
      },
    },
    name: mirrored ? "Mirrored primes" : "Primes",
    showlegend: false,
  };
}

function createAxisTrace(axis) {
  const limit = 120;
  const settings = {
    x: { x: [-limit, limit], y: [0, 0], z: [0, 0], color: "#ff8c6a", name: "X" },
    y: { x: [0, 0], y: [-limit, limit], z: [0, 0], color: "#9af59d", name: "Y" },
    z: { x: [0, 0], y: [0, 0], z: [-limit, limit], color: "#7cd6ff", name: "Z" },
  }[axis];

  return {
    type: "scatter3d",
    mode: "lines",
    x: settings.x,
    y: settings.y,
    z: settings.z,
    hoverinfo: "skip",
    line: {
      width: 5,
      color: settings.color,
    },
    showlegend: false,
    name: settings.name,
  };
}

function getConfig() {
  return {
    pattern: elements.patternSelect.value,
    primeCount: Number(elements.primeCount.value),
    pointSize: Number(elements.pointSize.value),
    scale: Number(elements.scale.value),
    colorMode: elements.colorSelect.value,
    mirror: elements.mirrorToggle.checked,
    rotate: elements.rotateToggle.checked,
  };
}

function updateLabels(config, primes) {
  elements.primeCountValue.textContent = String(config.primeCount);
  elements.pointSizeValue.textContent = String(config.pointSize);
  elements.scaleValue.textContent = String(config.scale);
  elements.largestPrime.textContent = primes[primes.length - 1].toLocaleString();
  elements.visiblePoints.textContent = (config.mirror ? primes.length * 2 : primes.length).toLocaleString();
  elements.activeFormula.textContent = patternLabels[config.pattern];
  elements.formulaLabel.textContent =
    config.pattern === "wing" ? "Current mapping" : `${config.pattern} mapping`;
  elements.formulaLine1.textContent = patternFormulaLines[config.pattern][0];
  elements.formulaLine2.textContent = patternFormulaLines[config.pattern][1];
  elements.formulaLine3.textContent = patternFormulaLines[config.pattern][2];
  elements.posterFormulaLine1.textContent = patternFormulaLines[config.pattern][0];
  elements.posterFormulaLine2.textContent = patternFormulaLines[config.pattern][1];
  elements.posterFormulaLine3.textContent = patternFormulaLines[config.pattern][2];
  elements.posterMetaPrimes.textContent = `First ${config.primeCount.toLocaleString()} primes`;
  elements.posterMetaLargest.textContent = `Largest prime ${primes[primes.length - 1].toLocaleString()}`;
}

function renderPlot() {
  const config = getConfig();
  const primes = generateFirstNPrimes(config.primeCount);
  updateLabels(config, primes);

  const traces = [
    buildTrace(primes, config, false),
    createAxisTrace("x"),
    createAxisTrace("y"),
    createAxisTrace("z"),
  ];

  if (config.mirror) {
    traces.unshift(buildTrace(primes, config, true));
  }

  const layout = {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    margin: { l: 0, r: 0, t: 0, b: 0 },
    scene: {
      bgcolor: "rgba(0,0,0,0)",
      aspectmode: "cube",
      domain: isPosterMode ? { x: [0.2, 1], y: [0, 1] } : undefined,
      camera: {
        eye: isPosterMode
          ? { x: 1.52, y: 1.26, z: 0.92 }
          : { x: 1.75, y: 1.15, z: 1.1 },
      },
      xaxis: axisStyle("x", isPosterMode),
      yaxis: axisStyle("y", isPosterMode),
      zaxis: axisStyle("z", isPosterMode),
    },
  };

  Plotly.react(plotEl, traces, layout, {
    responsive: true,
    displaylogo: false,
    displayModeBar: !isPosterMode,
    modeBarButtonsToRemove: ["lasso3d", "select2d"],
  });

  syncRotation(config.rotate);
}

function axisStyle(title, posterMode) {
  return {
    title: posterMode ? "" : title,
    color: "#d9e3ff",
    backgroundcolor: posterMode ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.02)",
    gridcolor: posterMode ? "rgba(180, 194, 255, 0.04)" : "rgba(180, 194, 255, 0.08)",
    zerolinecolor: posterMode ? "rgba(180, 194, 255, 0.08)" : "rgba(180, 194, 255, 0.22)",
    showspikes: false,
    showticklabels: !posterMode,
  };
}

function syncRotation(shouldRotate) {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  if (!shouldRotate) {
    return;
  }

  const rotate = () => {
    currentAngle += 0.0035;
    Plotly.relayout(plotEl, {
      "scene.camera.eye": {
        x: Math.cos(currentAngle) * 1.9,
        y: Math.sin(currentAngle) * 1.9,
        z: 1.05 + Math.sin(currentAngle * 0.6) * 0.15,
      },
    });
    animationFrameId = requestAnimationFrame(rotate);
  };

  animationFrameId = requestAnimationFrame(rotate);
}

function bindControls() {
  [
    elements.patternSelect,
    elements.primeCount,
    elements.pointSize,
    elements.scale,
    elements.colorSelect,
    elements.mirrorToggle,
  ].forEach((control) => {
    control.addEventListener("input", renderPlot);
    control.addEventListener("change", renderPlot);
  });

  elements.rotateToggle.addEventListener("change", () => {
    syncRotation(elements.rotateToggle.checked);
  });

  window.addEventListener("resize", () => Plotly.Plots.resize(plotEl));
}

function initialize() {
  document.body.classList.toggle("poster-mode", isPosterMode);
  bindControls();
  renderPlot();
}

window.addEventListener("DOMContentLoaded", initialize);
