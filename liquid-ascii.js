/**
 * Liquid ASCII - A fluid ascii art simulation
 */

class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 1; // Slight initial movement
        this.vy = (Math.random() - 0.5) * 1;
        this.radius = 1;

        // Lava Lamp Physics Properties
        this.temp = Math.random(); // 0 = Cold (Heavy), 1 = Hot (Light/Buoyant)
    }

    update(dt, gravityX, gravityY, viscosity) {
        // Apply Temperature-based Buoyancy vs Gravity
        // If Temp > 0.5, we rise (oppose gravity). If < 0.5, we sink (follow gravity).

        // Buoyancy Magnitude
        const buoyancy = (this.temp - 0.5) * 0.15; // Strength of rise/fall

        // Direction is relative to Gravity (Down)
        // If gravity is (0, 0.5) -> Down is +Y.
        // We want to go -Y if hot.
        // F = G_dir * (isHot ? -1 : 1) * magnitude?
        // Actually: Net Force = Gravity + BuoyancyForce
        // Gravity = G * (1 - temp)? No.
        // Let's model it: 
        // Force = GravityVec * (1 - 2 * temp); 
        // If temp=1 (Hot) -> Force = G * (-1) -> Opposite to gravity (Rise).
        // If temp=0 (Cold) -> Force = G * (1) -> With gravity (Sink).

        // Normalize gravity vector for direction if possible, but using G as is works if we assume G defines "Down Strength" too.

        // Update velocity
        this.vx += gravityX * (1 - 2.5 * this.temp);
        this.vy += gravityY * (1 - 2.5 * this.temp);

        this.vx *= viscosity;
        this.vy *= viscosity;

        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Temperature Evolution
        // Cool down at top, Heat up at bottom
        // Simple heuristic based on Y?
        // If Y is low (top), temp decreases. If Y is high (bottom), temp increases.
        // Wait, Y=0 is TOP.
        // So near 0 -> Cool. Near Height -> Heat.
    }
}

class PhysicsEngine {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.particles = [];
        this.gravity = { x: 0, y: 0.05 }; // Very low for lava lamp

        // Ambient motion state
        this.useAmbientMotion = true;

        this.viscosity = 0.99;
        this.repulsionRadius = 100;
        this.repulsionForce = 0.8; // Reduced for smoother interaction

        // Initialize dynamic count
        this.initParticles();
    }

    initParticles(count) {
        if (count === undefined) {
            const area = this.width * this.height;
            // Heuristic: ~2500 for 1920x1080.
            count = Math.floor(area / 800);
            if (count < 200) count = 200;
            if (count > 5000) count = 5000;
        }

        this.particles = [];
        this.addParticles(count);
    }

    updateParticleCount(newCount) {
        const currentCount = this.particles.length;
        if (newCount > currentCount) {
            this.addParticles(newCount - currentCount);
        } else if (newCount < currentCount) {
            this.particles.splice(newCount);
        }
    }

    addParticles(count) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(
                Math.random() * this.width,
                Math.random() * this.height * 0.5
            ));
        }
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
    }

    applyRepulsion(mouseX, mouseY, mouseVx, mouseVy) {
        if (mouseX === null || mouseY === null) return;

        for (let p of this.particles) {
            const dx = p.x - mouseX;
            const dy = p.y - mouseY;
            const distSq = dx * dx + dy * dy;
            const radiusSq = this.repulsionRadius * this.repulsionRadius;

            if (distSq < radiusSq) {
                const dist = Math.sqrt(distSq);
                const influence = 1 - (dist / this.repulsionRadius);

                // Repulsion
                if (dist > 0) {
                    const repForce = influence * this.repulsionForce;
                    p.vx += (dx / dist) * repForce;
                    p.vy += (dy / dist) * repForce;
                }

                // Stirring
                if (mouseVx !== 0 || mouseVy !== 0) {
                    const dragStrength = 0.5;
                    p.vx += mouseVx * influence * dragStrength;
                    p.vy += mouseVy * influence * dragStrength;
                }
            }
        }
    }

    update() {
        const dt = 1;
        const time = Date.now() / 1000;
        const ambientStrength = this.useAmbientMotion ? 0.03 : 0;

        // Thermal zones
        const heatSpeed = 0.003;
        const bottomZone = this.height - 150;
        const topZone = 150;

        // 1. Apply forces and thermal evolution
        for (let p of this.particles) {
            // Temperature cycle (lava lamp heating/cooling)
            if (p.y > bottomZone) p.temp = Math.min(1, p.temp + heatSpeed);
            if (p.y < topZone) p.temp = Math.max(0, p.temp - heatSpeed);

            // Gravity direction (use default if zero)
            let gx = this.gravity.x;
            let gy = this.gravity.y || 0.05;

            // Ambient swirl
            if (ambientStrength > 0) {
                gx += Math.sin(p.y * 0.005 + time) * ambientStrength;
                gy += Math.cos(p.x * 0.005 + time) * ambientStrength;
            }

            p.update(dt, gx, gy, this.viscosity);
        }

        // 2. Separation (soft volume conservation)
        const spacing = 16;
        const cellSize = 20;
        const cols = Math.ceil(this.width / cellSize);
        const rows = Math.ceil(this.height / cellSize);
        const grid = new Array(cols * rows).fill(null).map(() => []);

        for (let p of this.particles) {
            let cx = Math.floor(Math.max(0, Math.min(this.width - 1, p.x)) / cellSize);
            let cy = Math.floor(Math.max(0, Math.min(this.height - 1, p.y)) / cellSize);
            if (cx >= cols) cx = cols - 1;
            if (cy >= rows) cy = rows - 1;
            grid[cy * cols + cx].push(p);
        }

        const stiffness = 0.3;
        for (let p of this.particles) {
            let cx = Math.floor(p.x / cellSize);
            let cy = Math.floor(p.y / cellSize);
            if (cx < 0) cx = 0; if (cx >= cols) cx = cols - 1;
            if (cy < 0) cy = 0; if (cy >= rows) cy = rows - 1;

            for (let r = Math.max(0, cy - 1); r <= Math.min(rows - 1, cy + 1); r++) {
                for (let c = Math.max(0, cx - 1); c <= Math.min(cols - 1, cx + 1); c++) {
                    for (let n of grid[r * cols + c]) {
                        if (p === n) continue;
                        const dx = p.x - n.x;
                        const dy = p.y - n.y;
                        const distSq = dx * dx + dy * dy;
                        const radiusSq = spacing * spacing;

                        if (distSq < radiusSq && distSq > 0.001) {
                            const dist = Math.sqrt(distSq);
                            const force = (1 - dist / spacing) * stiffness;
                            p.vx += (dx / dist) * force;
                            p.vy += (dy / dist) * force;
                        }
                    }
                }
            }
        }

        // 3. Bounds
        const dampening = 0.7;
        for (let p of this.particles) {
            if (p.x < 0) { p.x = 0; p.vx *= -dampening; }
            if (p.x > this.width) { p.x = this.width; p.vx *= -dampening; }
            if (p.y < 0) { p.y = 0; p.vy *= -dampening; }
            if (p.y > this.height) { p.y = this.height; p.vy *= -dampening; }
        }
    }
}

class AsciiRenderer {
    constructor(canvas, physics) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false }); // Optimize for no transparency
        this.physics = physics;
        this.fontSize = 20;
        // Sorted by apparent density (light to dark)
        // User requested: ".+xXoO"
        this.characters = ".+xXoO";
        this.cols = 0;
        this.rows = 0;
        this.densityGrid = [];
    }

    updateCharacters(newChars) {
        if (!newChars || newChars.length === 0) return;
        this.characters = newChars;
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.cols = Math.ceil(this.canvas.width / this.fontSize);
        this.rows = Math.ceil(this.canvas.height / this.fontSize);

        // Pre-allocate density grid
        this.densityGrid = new Float32Array(this.cols * this.rows);

        this.ctx.font = `bold ${this.fontSize}px 'Courier New', monospace`;
        this.ctx.textBaseline = 'top';
        this.ctx.textAlign = 'center';
    }

    draw(particles) {
        this.ctx.fillStyle = this.bgColor || '#2a2a2a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.densityGrid.fill(0);

        // Calculate Density
        const influenceRadius = 2.5;
        const influenceRadiusSq = influenceRadius * influenceRadius;

        for (let p of particles) {
            const col = p.x / this.fontSize;
            const row = p.y / this.fontSize;
            const startCol = Math.max(0, Math.floor(col - influenceRadius));
            const endCol = Math.min(this.cols - 1, Math.ceil(col + influenceRadius));
            const startRow = Math.max(0, Math.floor(row - influenceRadius));
            const endRow = Math.min(this.rows - 1, Math.ceil(row + influenceRadius));

            for (let r = startRow; r <= endRow; r++) {
                for (let c = startCol; c <= endCol; c++) {
                    const dx = c - col;
                    const dy = r - row;
                    const distSq = dx * dx + dy * dy;
                    if (distSq < influenceRadiusSq) {
                        const contribution = 1 - (distSq / influenceRadiusSq);
                        this.densityGrid[r * this.cols + c] += contribution * contribution;
                    }
                }
            }
        }

        // Dual-Pass Rendering with density-based opacity
        const baseColor = this.textColor || '#999999';
        const minDensity = 0.2;
        const boldThreshold = 2.0;
        const boldCells = [];

        // Pass 1: Normal font for outer areas
        this.ctx.font = `normal ${this.fontSize}px 'Courier New', monospace`;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const density = this.densityGrid[r * this.cols + c];
                if (density > minDensity) {
                    if (density > boldThreshold) {
                        boldCells.push({ r, c, density });
                    } else {
                        // Opacity based on density (lighter on edges)
                        const opacity = Math.min(0.4 + (density - minDensity) * 0.3, 1.0);
                        this.ctx.fillStyle = this.applyOpacity(baseColor, opacity);

                        const charIndex = Math.min(
                            Math.floor((density - minDensity) * 2),
                            this.characters.length - 1
                        );
                        this.ctx.fillText(
                            this.characters[charIndex],
                            c * this.fontSize + this.fontSize / 2,
                            r * this.fontSize
                        );
                    }
                }
            }
        }

        // Pass 2: Bold font for inner/dense areas (full opacity)
        if (boldCells.length > 0) {
            this.ctx.font = `bold ${this.fontSize}px 'Courier New', monospace`;
            for (let cell of boldCells) {
                // Higher density = darker/more opaque
                const opacity = Math.min(0.7 + (cell.density - boldThreshold) * 0.15, 1.0);
                this.ctx.fillStyle = this.applyOpacity(baseColor, opacity);

                const charIndex = Math.min(
                    Math.floor((cell.density - minDensity) * 2),
                    this.characters.length - 1
                );
                this.ctx.fillText(
                    this.characters[charIndex],
                    cell.c * this.fontSize + this.fontSize / 2,
                    cell.r * this.fontSize
                );
            }
        }
    }

    applyOpacity(hexColor, opacity) {
        // Convert hex to rgba with opacity
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
}

class LiquidASCII {
    constructor() {
        this.canvas = document.getElementById('ascii-canvas');
        this.physics = new PhysicsEngine(window.innerWidth, window.innerHeight);
        this.renderer = new AsciiRenderer(this.canvas, this.physics);

        this.mouse = { x: null, y: null, vx: 0, vy: 0 };
        this.lastMouse = { x: null, y: null };
        this.isRunning = false;

        this.init();
    }

    init() {
        this.renderer.resize();
        this.physics.resize(window.innerWidth, window.innerHeight);

        window.addEventListener('resize', () => {
            this.renderer.resize();
            this.physics.resize(window.innerWidth, window.innerHeight);
        });

        window.addEventListener('mousemove', (e) => {
            if (this.lastMouse.x !== null) {
                this.mouse.vx = e.clientX - this.lastMouse.x;
                this.mouse.vy = e.clientY - this.lastMouse.y;
            }
            this.lastMouse.x = e.clientX;
            this.lastMouse.y = e.clientY;
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;

            // Reset velocity after a short delay if no movement? 
            // Better handling: decay velocity in update loop or just rely on events.
            // Events fire usually every frame on move.
        });

        window.addEventListener('mouseleave', () => {
            this.mouse.x = null;
            this.mouse.y = null;
            this.lastMouse.x = null;
            this.lastMouse.y = null;
        });

        // Touch Events for Mobile (only on canvas)
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.lastMouse.x = touch.clientX;
            this.lastMouse.y = touch.clientY;
            this.mouse.x = touch.clientX;
            this.mouse.y = touch.clientY;
            this.mouse.vx = 0;
            this.mouse.vy = 0;
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            if (this.lastMouse.x !== null) {
                this.mouse.vx = touch.clientX - this.lastMouse.x;
                this.mouse.vy = touch.clientY - this.lastMouse.y;
            }
            this.lastMouse.x = touch.clientX;
            this.lastMouse.y = touch.clientY;
            this.mouse.x = touch.clientX;
            this.mouse.y = touch.clientY;
        }, { passive: false });

        this.canvas.addEventListener('touchend', () => {
            this.mouse.x = null;
            this.mouse.y = null;
            this.lastMouse.x = null;
            this.lastMouse.y = null;
        });

        // Device Orientation for Gravity
        window.addEventListener('deviceorientation', (e) => this.handleDeviceOrientation(e));

        // Setup control listeners
        this.setupControls();

        this.start();
    }

    handleDeviceOrientation(e) {
        if (!e.beta && !e.gamma) return;

        // Beta: -180 to 180 (front/back tilt) -> controls Y
        // Gamma: -90 to 90 (left/right tilt) -> controls X

        const maxGravity = 1.0;
        let gx = (e.gamma || 0) / 45;
        let gy = (e.beta || 0) / 45;

        // Limit values
        if (gx > 1) gx = 1; if (gx < -1) gx = -1;
        if (gy > 1) gy = 1; if (gy < -1) gy = -1;

        this.physics.gravity.x = gx * maxGravity;
        this.physics.gravity.y = gy * maxGravity;
    }

    setupControls() {
        const inputs = {
            'particle-count': (val) => this.physics.updateParticleCount(parseInt(val)),
            gravity: (val) => this.physics.gravity.y = parseFloat(val),
            repulsion: (val) => this.physics.repulsionForce = parseFloat(val),
            viscosity: (val) => this.physics.viscosity = parseFloat(val),
            'font-size': (val) => {
                this.renderer.fontSize = parseInt(val);
                this.renderer.resize();
            },
            'color-bg': (val) => {
                this.canvas.style.backgroundColor = val;
                // Also need to clear with this color in draw loop if not using transparent canvas
                // But simply setting canvas CSS bg is easiest if we clear with clearRect
            },
            'color-text': (val) => this.renderer.ctx.fillStyle = val, // This is overridden in draw loop, need to store it
            'chars': (val) => this.renderer.updateCharacters(val)
        };

        // Special handling for colors since they need to be stored in renderer
        const bgInput = document.getElementById('color-bg');
        if (bgInput) {
            this.renderer.bgColor = bgInput.value;
            bgInput.addEventListener('input', (e) => this.renderer.bgColor = e.target.value);
        }

        const textInput = document.getElementById('color-text');
        if (textInput) {
            this.renderer.textColor = textInput.value;
            textInput.addEventListener('input', (e) => this.renderer.textColor = e.target.value);
        }

        const charInput = document.getElementById('chars');
        if (charInput) {
            this.renderer.updateCharacters(charInput.value);
            charInput.addEventListener('input', (e) => this.renderer.updateCharacters(e.target.value));
        }

        for (let [id, handler] of Object.entries(inputs)) {
            const el = document.getElementById(id);
            const valDisplay = document.getElementById(`val-${id}`);
            if (el) {
                // Sync JS state with DOM state (browser restoration)
                handler(el.value);

                el.addEventListener('input', (e) => {
                    handler(e.target.value);
                    if (valDisplay) valDisplay.textContent = e.target.value;
                });
            }
        }

        document.getElementById('toggle-controls').addEventListener('click', (e) => {
            const panel = document.getElementById('controls-panel');
            panel.classList.toggle('hidden');
            e.target.textContent = panel.classList.contains('hidden') ? 'Show' : 'Hide';
        });
    }

    update() {
        if (!this.isRunning) return;

        this.physics.applyRepulsion(this.mouse.x, this.mouse.y, this.mouse.vx, this.mouse.vy);
        // Decay mouse velocity (since mousemove doesn't fire when stopped)
        this.mouse.vx *= 0.1;
        this.mouse.vy *= 0.1;

        this.physics.update();
        this.renderer.draw(this.physics.particles);

        requestAnimationFrame(() => this.update());
    }

    start() {
        this.isRunning = true;
        this.update();
    }

    stop() {
        this.isRunning = false;
    }
}

// Start application
window.addEventListener('DOMContentLoaded', () => {
    new LiquidASCII();
});
