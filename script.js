// ═══════════════════════════════════════════
// NIRANJAN REDDY P — PORTFOLIO SCRIPTS
// Particle BG, 3D Tilt, Scroll Reveal, etc.
// ═══════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initCursorGlow();
    initTypingEffect();
    initScrollReveal();
    initNavigation();
    initTiltCards();
    initSkillTabs();
    initHexCards();
    initCountUp();
    initBackToTop();
    attachContactForm();
});

// ── Particle Background (Three.js 3D WebGL + 2D Canvas Fallback) ──
function initParticles() {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) return;

    // Check if Three.js is loaded, otherwise fall back to 2D canvas particles
    if (typeof THREE === 'undefined') {
        initParticles2D(canvas);
        return;
    }

    let renderer, scene, camera;
    let waveParticles, waveGeometry;
    let dustParticles, dustGeometry;
    
    // Wave parameters
    const GRID_SIZE_X = window.innerWidth < 768 ? 40 : 80;
    const GRID_SIZE_Z = window.innerWidth < 768 ? 40 : 80;
    const SPACING = 15;
    const SEPARATOR = SPACING;
    const AMOUNTX = GRID_SIZE_X;
    const AMOUNTY = GRID_SIZE_Z;
    const numParticles = AMOUNTX * AMOUNTY;

    // Interactive mouse state
    let mouseX = 0, mouseY = 0;
    let targetMouseX = 0, targetMouseY = 0;
    let windowHalfX = window.innerWidth / 2;
    let windowHalfY = window.innerHeight / 2;
    let currentScroll = 0;

    // Canvas particle texture helper (produces soft circular glow)
    function createCircleTexture() {
        const canvasTexture = document.createElement('canvas');
        canvasTexture.width = 32;
        canvasTexture.height = 32;
        const ctx = canvasTexture.getContext('2d');
        
        const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        grad.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
        grad.addColorStop(0.5, 'rgba(255, 0, 0, 0.35)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(16, 16, 16, 0, Math.PI * 2);
        ctx.fill();
        
        return new THREE.CanvasTexture(canvasTexture);
    }

    try {
        // Initialize Three.js WebGL Renderer
        renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: true,
            powerPreference: "high-performance"
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);

        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x000000, 0.0018);

        // Perspective Camera
        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1500);
        camera.position.z = 320;
        camera.position.y = 120; // Majestic height angle

        // Circular glow texture
        const particleTexture = createCircleTexture();

        // 1. SYSTEM A: WAVY GRID
        waveGeometry = new THREE.BufferGeometry();
        const wavePositions = new Float32Array(numParticles * 3);
        const waveScales = new Float32Array(numParticles);

        let i = 0;
        for (let ix = 0; ix < AMOUNTX; ix++) {
            for (let iy = 0; iy < AMOUNTY; iy++) {
                // Centered coordinates
                wavePositions[i] = ix * SEPARATOR - (AMOUNTX * SEPARATOR) / 2; // x
                wavePositions[i + 1] = 0; // y (height, animated dynamically)
                wavePositions[i + 2] = iy * SEPARATOR - (AMOUNTY * SEPARATOR) / 2; // z
                waveScales[i / 3] = 1.0;
                i += 3;
            }
        }

        waveGeometry.setAttribute('position', new THREE.BufferAttribute(wavePositions, 3));
        waveGeometry.setAttribute('scale', new THREE.BufferAttribute(waveScales, 1));

        // Crimson soft glowing material
        const waveMaterial = new THREE.PointsMaterial({
            color: 0xff3333,
            size: 6,
            map: particleTexture,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        waveParticles = new THREE.Points(waveGeometry, waveMaterial);
        scene.add(waveParticles);

        // 2. SYSTEM B: DUST PARTICLES
        const dustCount = window.innerWidth < 768 ? 100 : 300;
        dustGeometry = new THREE.BufferGeometry();
        const dustPositions = new Float32Array(dustCount * 3);
        const dustSpeeds = [];

        for (let d = 0; d < dustCount; d++) {
            dustPositions[d * 3] = (Math.random() - 0.5) * 1200; // x
            dustPositions[d * 3 + 1] = Math.random() * 500 - 150; // y
            dustPositions[d * 3 + 2] = (Math.random() - 0.5) * 1200; // z
            dustSpeeds.push({
                x: (Math.random() - 0.5) * 0.15,
                y: Math.random() * 0.1 + 0.05,
                z: (Math.random() - 0.5) * 0.15
            });
        }

        dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));

        // Crimson and white dust particles
        const dustMaterial = new THREE.PointsMaterial({
            color: 0xff9999,
            size: 3.5,
            map: particleTexture,
            transparent: true,
            opacity: 0.75,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        dustParticles = new THREE.Points(dustGeometry, dustMaterial);
        scene.add(dustParticles);

        // Listeners
        document.addEventListener('mousemove', onDocumentMouseMove);
        window.addEventListener('resize', onWindowResize);
        window.addEventListener('scroll', onWindowScroll);

        let count = 0;

        function animate() {
            requestAnimationFrame(animate);
            render();
        }

        function render() {
            count += 0.015;

            // 1. Animate Wave Grid Height (Sine and Cosine waves + cursor distortion)
            const positions = waveGeometry.attributes.position.array;
            let i = 0;

            // Scale screen mouse coords to approximate 3D grid dimensions
            const targetDistortX = (targetMouseX / windowHalfX) * 300;
            const targetDistortZ = (targetMouseY / windowHalfY) * 300;

            for (let ix = 0; ix < AMOUNTX; ix++) {
                for (let iy = 0; iy < AMOUNTY; iy++) {
                    const posX = positions[i];
                    const posZ = positions[i + 2];

                    // Base wave motion
                    let height = (Math.sin(ix * 0.15 + count) * 14) + (Math.cos(iy * 0.15 + count) * 14);

                    // Mouse proximity interactive ripple
                    const dx = posX - targetDistortX;
                    const dz = posZ - targetDistortZ;
                    const dist = Math.sqrt(dx * dx + dz * dz);
                    if (dist < 120) {
                        const ripplePower = (1 - dist / 120);
                        // Elevate and warp wave slightly near cursor
                        height += ripplePower * ripplePower * 35 * Math.sin(count * 3 - dist * 0.1);
                    }

                    // Apply computed height to position array
                    positions[i + 1] = height;
                    i += 3;
                }
            }

            waveGeometry.attributes.position.needsUpdate = true;

            // 2. Animate Space Dust floating gently upwards
            const dPositions = dustGeometry.attributes.position.array;
            for (let d = 0; d < dustCount; d++) {
                // Move floating dust
                dPositions[d * 3] += dustSpeeds[d].x;
                dPositions[d * 3 + 1] += dustSpeeds[d].y;
                dPositions[d * 3 + 2] += dustSpeeds[d].z;

                // Reset positions if they float too high
                if (dPositions[d * 3 + 1] > 350) {
                    dPositions[d * 3] = (Math.random() - 0.5) * 1200;
                    dPositions[d * 3 + 1] = -150;
                    dPositions[d * 3 + 2] = (Math.random() - 0.5) * 1200;
                }
            }
            dustGeometry.attributes.position.needsUpdate = true;

            // 3. Smooth Camera Motion (Mouse Parallax & Scroll Navigation)
            // Interpolate mouse coordinates for elegant momentum
            mouseX += (targetMouseX - mouseX) * 0.05;
            mouseY += (targetMouseY - mouseY) * 0.05;

            // Dynamic camera angling combining mouse location & scroll position
            camera.position.x = mouseX * 0.45;
            camera.position.y = 120 - (mouseY * 0.35) + (currentScroll * 0.65);
            camera.position.z = 320 - (currentScroll * 0.3); // Zoom in/out slightly as user scrolls

            camera.lookAt(new THREE.Vector3(0, -30, 0)); // Center focal point

            renderer.render(scene, camera);
        }

        function onDocumentMouseMove(event) {
            targetMouseX = event.clientX - windowHalfX;
            targetMouseY = event.clientY - windowHalfY;
        }

        function onWindowResize() {
            windowHalfX = window.innerWidth / 2;
            windowHalfY = window.innerHeight / 2;

            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();

            renderer.setSize(window.innerWidth, window.innerHeight);
        }

        function onWindowScroll() {
            currentScroll = window.scrollY;
        }

        // Start render loop
        animate();

    } catch (e) {
        console.error("Three.js initialization failed, falling back to 2D Canvas:", e);
        initParticles2D(canvas);
    }
}

// ── 2D Particle Fallback (if WebGL/Three.js is unavailable) ──
function initParticles2D(canvas) {
    const ctx = canvas.getContext('2d');
    let particles = [];
    const PARTICLE_COUNT = 60;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    class Particle {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.vx = (Math.random() - 0.5) * 0.4;
            this.vy = (Math.random() - 0.5) * 0.4;
            this.radius = Math.random() * 2 + 0.5;
            this.opacity = Math.random() * 0.5 + 0.1;
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
            if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 0, 0, ${this.opacity})`;
            ctx.fill();
        }
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle());

    function drawLines() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 150) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(255, 0, 0, ${0.06 * (1 - dist / 150)})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => { p.update(); p.draw(); });
        drawLines();
        requestAnimationFrame(animate);
    }
    animate();
}


// ── Cursor Glow ──
function initCursorGlow() {
    const glow = document.getElementById('cursorGlow');
    if (!glow || window.innerWidth < 768) return;
    let mx = 0, my = 0, cx = 0, cy = 0;
    document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
    function lerp() {
        cx += (mx - cx) * 0.08;
        cy += (my - cy) * 0.08;
        glow.style.left = cx + 'px';
        glow.style.top = cy + 'px';
        requestAnimationFrame(lerp);
    }
    lerp();
}

// ── Typing Effect ──
function initTypingEffect() {
    const words = ['Developer', 'Designer', 'Engineer', 'Creator', 'Problem Solver'];
    let i = 0, j = 0, isDeleting = false;
    const el = document.getElementById('typing');
    if (!el) return;

    function type() {
        const word = words[i];
        el.textContent = isDeleting ? word.substring(0, j--) : word.substring(0, j++);
        if (!isDeleting && j > word.length) {
            isDeleting = true;
            return setTimeout(type, 1500);
        }
        if (isDeleting && j < 0) {
            isDeleting = false;
            i = (i + 1) % words.length;
        }
        setTimeout(type, isDeleting ? 60 : 120);
    }
    type();
}

// ── Scroll Reveal ──
function initScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, idx) => {
            if (entry.isIntersecting) {
                // Stagger children
                const children = entry.target.querySelectorAll('.reveal-child');
                children.forEach((child, i) => {
                    setTimeout(() => child.classList.add('active'), i * 150);
                });
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ── Navigation ──
function initNavigation() {
    const nav = document.getElementById('mainNav');
    const toggle = document.getElementById('navToggle');
    const links = document.getElementById('navLinks');
    const allLinks = document.querySelectorAll('.nav-link');

    // Scroll effect
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) nav.classList.add('scrolled');
        else nav.classList.remove('scrolled');

        // Active section highlight
        const sections = document.querySelectorAll('section[id]');
        let current = '';
        sections.forEach(section => {
            const top = section.offsetTop - 120;
            if (window.scrollY >= top) current = section.getAttribute('id');
        });
        allLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.section === current);
        });
    });

    // Mobile toggle
    if (toggle) {
        toggle.addEventListener('click', () => {
            links.classList.toggle('open');
            toggle.classList.toggle('active');
        });
        allLinks.forEach(link => {
            link.addEventListener('click', () => {
                links.classList.remove('open');
                toggle.classList.remove('active');
            });
        });
    }
}

// ── 3D Tilt Cards ──
function initTiltCards() {
    if (window.innerWidth < 768) return;
    document.querySelectorAll('.tilt-card').forEach(card => {
        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = ((y - centerY) / centerY) * -6;
            const rotateY = ((x - centerX) / centerX) * 6;
            card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) translateY(0)';
        });
    });
}

// ── Skill Tabs & Hex Cards ──
function initSkillTabs() {
    const tabs = document.querySelectorAll('.skill-tab');
    const cards = document.querySelectorAll('.hex-card-wrapper');
    if (!tabs.length || !cards.length) return;

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const filter = tab.dataset.filter;

            cards.forEach((card, i) => {
                const cat = card.dataset.category;
                const show = filter === 'all' || cat === filter;

                if (show) {
                    card.classList.remove('hidden');
                    card.style.position = '';
                    card.style.width = '';
                    card.style.height = '';
                    card.style.overflow = '';
                    // Staggered re-entrance
                    setTimeout(() => {
                        card.classList.add('visible');
                    }, i * 60);
                } else {
                    card.classList.remove('visible');
                    card.classList.add('hidden');
                }
            });
        });
    });
}

function initHexCards() {
    const cards = document.querySelectorAll('.hex-card-wrapper');
    if (!cards.length) return;

    // Calculate and set ring offsets for proficiency circles
    cards.forEach(card => {
        const rings = card.querySelectorAll('.ring-fill');
        rings.forEach(ring => {
            const percent = parseInt(ring.dataset.percent) || 0;
            const circumference = 2 * Math.PI * 50; // r=50
            const offset = circumference - (percent / 100) * circumference;
            ring.style.setProperty('--ring-offset', offset);
        });
    });

    // Staggered entrance with IntersectionObserver
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const wrappers = entry.target.querySelectorAll('.hex-card-wrapper');
                wrappers.forEach((w, i) => {
                    setTimeout(() => w.classList.add('visible'), i * 80);
                });
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    const grid = document.getElementById('skillsGrid');
    if (grid) observer.observe(grid);
}

// ── Count Up Animation ──
function initCountUp() {
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counters = entry.target.querySelectorAll('.stat-number');
                counters.forEach(counter => {
                    const target = parseInt(counter.dataset.target);
                    let current = 0;
                    const duration = 1500;
                    const step = target / (duration / 30);
                    const interval = setInterval(() => {
                        current += step;
                        if (current >= target) {
                            counter.textContent = target;
                            clearInterval(interval);
                        } else {
                            counter.textContent = Math.floor(current);
                        }
                    }, 30);
                });
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    const stats = document.querySelector('.about-stats');
    if (stats) observer.observe(stats);
}

// ── Back to Top ──
function initBackToTop() {
    const btn = document.getElementById('backToTop');
    if (!btn) return;
    window.addEventListener('scroll', () => {
        btn.classList.toggle('visible', window.scrollY > 400);
    });
    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ── Contact Form ──
function attachContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('.btn-submit');
        const btnText = btn.querySelector('.btn-text');
        const original = btnText.textContent;
        btnText.textContent = 'Sending...';
        btn.disabled = true;

        const formData = {
            name: form.name.value,
            email: form.email.value,
            message: form.message.value
        };

        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (data.success) {
                alert('✅ Message sent successfully!');
                form.reset();
            } else {
                alert('❌ Error: ' + data.message);
            }
        } catch {
            alert('❌ Network error. Please try again.');
        } finally {
            btnText.textContent = original;
            btn.disabled = false;
        }
    });
}
