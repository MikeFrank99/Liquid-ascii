# Liquid ASCII

Una simulazione di fluido ASCII che ricrea l'effetto "Lava Lamp" nel browser. Zero dipendenze, puro Vanilla JavaScript.

## Caratteristiche Principali

### 🌊 Fisica Termica (Lava Lamp)
- **Ciclo di Riscaldamento/Raffreddamento**: Le particelle si riscaldano sul fondo dello schermo e salgono lentamente (buoyancy), si raffreddano in alto e ricadono dolcemente
- **Gravità Minima**: Impostazione predefinita 0.04-0.05 per movimento fluido e rilassante
- **Viscosità Alta**: 0.99 per massima fluidità
- **Movimento Ambientale**: Correnti sinusoidali sottili che creano movimento organico anche senza input

### 🎨 Rendering Avanzato
- **Dual-Pass (Normal + Bold)**: Caratteri normali per zone esterne, grassetto per zone dense interne
- **Gradiente di Opacità**: Densità bassa = colore più chiaro (40-70%), densità alta = colore più scuro (70-100%)
- **Set Caratteri**: `.+xXoO` (progressione da piccolo a grande)
- **Metaball Density Calculation**: Usa un grid-based splatting per calcolare la densità locale

### 🧲 Forze Fisiche
1. **Separazione** (16px radius): Impedisce sovrapposizione particelle
2. **Coesione** (30px radius): Attrae particelle vicine per creare blob
3. **Repulsione Mouse/Touch**: Interazione diretta con il fluido (forza 0.8)
4. **Stirring**: Trasferimento di velocità dal cursore/dito alle particelle
5. **Limiter Velocità**: Max 3.0 pixel/frame per movimento morbido

### 📱 Interazioni
- **Desktop**: Mouse movement, repulsion + stirring
- **Mobile**: Touch drag (solo sul canvas, non interferisce con UI)
- **Device Orientation**: Giroscopio per controllare la direzione della gravità
- **UI Controls**: Panel con slider per tutti i parametri fisici

## Parametri di Default

```javascript
{
  gravity: 0.05,
  viscosity: 0.99,
  repulsionForce: 0.8,
  repulsionRadius: 100,
  separationRadius: 16,
  cohesionRadius: 30,
  heatSpeed: 0.002,
  ambientStrength: 0.02,
  maxSpeed: 3.0,
  dampening: 0.3, // Bounce morbidissimo
  particleCount: ~2500 (1920x1080) // area/800
}
```

## Estetica

- **Background**: Grigio scuro (`#2a2a2a`)
- **Testo**: Grigio medio (`#999999`)
- **Caratteri**: `.+xXoO`
- **Font**: Courier New, 20px
- **Theme**: Dark, rilassante, minimalista

## Struttura Codice

### Classes
1. **Particle**: Posizione, velocità, temperatura
2. **PhysicsEngine**: Thermal cycle, separation, cohesion, bounds
3. **AsciiRenderer**: Density grid, dual-pass rendering con opacity
4. **LiquidASCII**: Main controller, event handling, animation loop

### File
- `index.html`: UI e structure
- `style.css`: Dark theme styling
- `liquid-ascii.js`: Core simulation (~500 righe)

## Performance

- **Rendering**: HTML5 Canvas 2D (alpha: false)
- **Physics**: Spatial hashing (20px grid cells) per O(n) neighbor search
- **Animation**: requestAnimationFrame
- **Optimization**: Pre-allocated Float32Array per density grid

## Comportamenti Chiave

1. **No Agglomerazione Eccessiva**: Separation + cohesion bilanciate
2. **Volume Conservato**: Le particelle mantengono distanza minima
3. **Blob Merging**: Gruppi si fondono dolcemente tramite cohesion
4. **Bounce Morbido**: dampening 0.3 (quasi nessun rimbalzo)
5. **Movimento Lento**: Velocity limiter + bassa gravità + alta viscosità

## Ispirazione

Basato sull'effetto visivo delle lampade lava, con fisica semplificata SPH (Smoothed Particle Hydrodynamics) per volume conservation e rendering ASCII metaball-style.
