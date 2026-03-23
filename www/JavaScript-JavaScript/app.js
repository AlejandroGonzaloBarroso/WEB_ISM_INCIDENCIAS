import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { checkOTAUpdates } from "./updater.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD7hH3JSlNaWmbLcmopIRGuVNINRzldiko",
    authDomain: "ism-incidencias-3c301.firebaseapp.com",
    projectId: "ism-incidencias-3c301",
    storageBucket: "ism-incidencias-3c301.firebasestorage.app",
    messagingSenderId: "80603706570",
    appId: "1:80603706570:web:fdf3f0878d5a328582f033"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Cloudinary Configuration
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dv01npaov/image/upload';
const CLOUDINARY_UPLOAD_PRESET = 'incidencias_fotos';

document.addEventListener('DOMContentLoaded', () => {
    const langToggleBtn = document.getElementById('langToggle');
    let currentLang = 'en'; // Set default language to English
    let dictionary = null;

    // Interactive Canvas Matrix Spotlight
    const canvas = document.getElementById('pointMatrix');
    let ctx, width, height;

    // Smooth trailing variables
    let targetMouseX = window.innerWidth / 2;
    let targetMouseY = window.innerHeight / 2;
    let currentMouseX = window.innerWidth / 2;
    let currentMouseY = window.innerHeight / 2;

    let targetPull = 1;
    let currentPull = 1;

    // Time for wave animation
    let time = 0;

    if (canvas) {
        ctx = canvas.getContext('2d');
        const resizeCanvas = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            targetMouseX = width / 2;
            targetMouseY = height / 2;
        };
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        document.addEventListener('mousemove', (e) => {
            targetMouseX = e.clientX;
            targetMouseY = e.clientY;
        });

        document.addEventListener('mousedown', () => targetPull = 0.2); // Group closer and tighter
        document.addEventListener('mouseup', () => targetPull = 1);   // Release

        const radius = 180;     // The size of the circular mask (slightly larger)
        const dotSpacing = 30;  // Gap between dots

        function animateMatrix() {
            ctx.clearRect(0, 0, width, height);

            time += 0.05;

            // 1. Smoothly follow the mouse (Trailing effect)
            // Easing factor: lower is smoother/slower, higher is faster/snappier
            currentMouseX += (targetMouseX - currentMouseX) * 0.08;
            currentMouseY += (targetMouseY - currentMouseY) * 0.08;

            // 2. Smooth interpolation for the click pull effect
            currentPull += (targetPull - currentPull) * 0.15;

            // Determine if dark mode is active to color dots accordingly
            const isDark = document.documentElement.classList.contains('dark-mode');
            // Use the primary ISM colors for the matrix instead of grayscales
            ctx.fillStyle = isDark ? 'rgba(174, 203, 245, 0.7)' : 'rgba(26, 75, 140, 0.6)';

            // Draw grid relative to trailing pointer and restricted to a circle
            for (let x = -radius; x <= radius; x += dotSpacing) {
                for (let y = -radius; y <= radius; y += dotSpacing) {
                    // Check if dot is inside the circle mask
                    if (x * x + y * y <= radius * radius) {

                        // Add a subtle wave animation to each dot based on its physical position and time
                        const waveX = Math.sin(time + y * 0.05) * 3;
                        const waveY = Math.cos(time + x * 0.05) * 3;

                        // Calculate final draw positions pulling towards the center based on `currentPull`
                        const drawX = currentMouseX + (x * currentPull) + waveX;
                        const drawY = currentMouseY + (y * currentPull) + waveY;

                        // Calculate distance from center to fade out the edges smoothly
                        const dist = Math.sqrt(x * x + y * y);
                        const opacityRatio = 1 - (dist / radius); // 1 at center, 0 at edge

                        // Add a slight glowing effect dependent on how close to center
                        ctx.globalAlpha = opacityRatio;
                        ctx.beginPath();
                        // Slightly larger dots to make the color pop more
                        ctx.arc(drawX, drawY, isDark ? 2.2 : 2.0, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
            ctx.globalAlpha = 1.0; // Reset alpha
            requestAnimationFrame(animateMatrix);
        }
        animateMatrix();
    }

    // Fetch the JSON dictionary
    async function loadDictionary() {
        try {
            // Also load version for the UI
            fetch('version.json').then(r => r.json()).then(data => {
                const verEl = document.getElementById('appVersion');
                if (verEl && data.version) verEl.textContent = `v${data.version}`;
                checkShowChangelog(data.version);
            }).catch(() => {});

            const response = await fetch('Datos_Locales-JSON/diccionario.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            dictionary = await response.json();
            updateUI();
        } catch (error) {
            console.error("Error loading dictionary:", error);
        }
    }

    // Update dom elements with translations
    function updateUI() {
        if (!dictionary) return;

        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (dictionary[currentLang] && dictionary[currentLang][key]) {
                el.innerHTML = dictionary[currentLang][key]; // Allows <br> tags from the JSON
            }
        });

        // El botón muestra el idioma de la vista actual.
        langToggleBtn.textContent = currentLang === 'en' ? 'EN' : 'ES';
    }

    // Toggle button event listener
    langToggleBtn.addEventListener('click', () => {
        currentLang = currentLang === 'en' ? 'es' : 'en';
        updateUI();
    });

    // Dark Mode Toggle Logic
    const themeToggleBtn = document.getElementById('themeToggle');
    // Check if user has a preference saved or prefers dark mode
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme');

    function updateThemeButtonText() {
        const isDarkMode = document.documentElement.classList.contains('dark-mode');
        const i18nKey = isDarkMode ? 'themeLight' : 'themeDark';
        themeToggleBtn.setAttribute('data-i18n', i18nKey);

        // Apply instantly if dictionary is loaded, else use fallback
        if (dictionary && dictionary[currentLang] && dictionary[currentLang][i18nKey]) {
            themeToggleBtn.textContent = dictionary[currentLang][i18nKey];
        } else {
            themeToggleBtn.textContent = isDarkMode ? 'LIGHT' : 'DARK';
        }
    }

    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
        document.documentElement.classList.add('dark-mode');
    }
    updateThemeButtonText();

    themeToggleBtn.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark-mode');
        updateThemeButtonText();
        localStorage.setItem('theme', document.documentElement.classList.contains('dark-mode') ? 'dark' : 'light');
    });

    // --- Toast & UI Feedback ---
    const toast = document.getElementById('toast');
    function showToast(message, type = 'success') {
        toast.textContent = message;
        toast.className = `toast visible ${type}`;
        setTimeout(() => {
            toast.classList.remove('visible');
        }, 3000);
    }
    window.showToast = showToast; // Expose globally for updater

    // --- Modal & Reporting Logic ---
    const modal = document.getElementById('incidentModal');
    const closeBtn = document.querySelector('.close-btn');
    const form = document.getElementById('incidentForm');
    const reportButtons = document.querySelectorAll('.btn-primary');
    const categoryInput = document.getElementById('incidentCategory');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const submitBtn = document.getElementById('submitBtn');

    // Cooldown duration in milliseconds (5 minutes = 5 * 60 * 1000)
    const COOLDOWN_TIME_MS = 5 * 60 * 1000;

    // Check if user is in cooldown
    function checkCooldown() {
        const lastTime = localStorage.getItem('lastIncidentTime');
        if (!lastTime) return null; // No cooldown active

        const now = Date.now();
        const diff = now - parseInt(lastTime, 10);

        if (diff < COOLDOWN_TIME_MS) {
            return COOLDOWN_TIME_MS - diff; // Return remaining milliseconds
        }

        // Cooldown expired, clear it
        localStorage.removeItem('lastIncidentTime');
        return null;
    }

    // Open modal when any "Report Incident" button is clicked
    reportButtons.forEach(btn => {
        // Skip the submit button inside the modal
        if (btn.id === 'submitBtn') return;

        btn.addEventListener('click', (e) => {
            // First check if the device is on cooldown
            const remainingTime = checkCooldown();

            if (remainingTime) {
                // Calculate minutes and seconds
                const minutes = Math.floor(remainingTime / 60000);
                const seconds = ((remainingTime % 60000) / 1000).toFixed(0);
                const timeString = minutes > 0
                    ? `${minutes} min ${seconds} sec`
                    : `${seconds} sec`;

                // Show translated error message with time
                let cooldownMsg = dictionary[currentLang]['msgCooldown'];
                cooldownMsg = cooldownMsg.replace('{time}', timeString);

                showToast(cooldownMsg, 'error');
                return; // Stop here, do not open modal
            }

            // Find which category this button belongs to
            const card = e.target.closest('.category-card');
            let category = "Unknown";
            if (card.classList.contains('primary-card')) category = "Primary";
            if (card.classList.contains('middle-card')) category = "Middle";
            if (card.classList.contains('secondary-card')) category = "Secondary";

            categoryInput.value = category;
            modal.classList.remove('hidden');
        });
    });

    closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        loadingIndicator.classList.remove('hidden');
        submitBtn.disabled = true;

        const description = document.getElementById('incidentDesc').value;
        const classroom = document.getElementById('incidentClassroom').value;
        const urgency = document.getElementById('incidentUrgency').value;
        const fileInput = document.getElementById('incidentImage');
        const category = categoryInput.value;
        let imageUrl = null;

        try {
            // First, upload image to Cloudinary if it exists
            if (fileInput.files.length > 0) {
                if (CLOUDINARY_URL.includes('YOUR_CLOUD_NAME')) {
                    throw new Error('CLOUDINARY_MISSING');
                }

                const file = fileInput.files[0];
                const formData = new FormData();
                formData.append('file', file);
                formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

                const uploadRes = await fetch(CLOUDINARY_URL, {
                    method: 'POST',
                    body: formData
                });

                if (!uploadRes.ok) {
                    const errorText = await uploadRes.text();
                    console.error("Cloudinary Error Response:", errorText);
                    throw new Error(`Failed to upload image to Cloudinary: ${uploadRes.status} ${uploadRes.statusText}`);
                }

                const uploadData = await uploadRes.json();
                imageUrl = uploadData.secure_url;
            }

            // Second, save the incident to Firebase Firestore
            await addDoc(collection(db, "incidencias"), {
                category: category,
                classroom: classroom,
                urgency: urgency,
                description: description,
                imageUrl: imageUrl, // Will be null if no image was uploaded
                status: 'Sin revisar', // Default status for new incidents
                timestamp: serverTimestamp()
            });

            // Start 5-minute cooldown timer for this device
            localStorage.setItem('lastIncidentTime', Date.now().toString());

            // Success
            showToast(dictionary[currentLang]['msgSuccess']);
            form.reset();
            modal.classList.add('hidden');

        } catch (error) {
            console.error("Error submitting report:", error);
            if (error.message === 'CLOUDINARY_MISSING') {
                const msg = currentLang === 'es'
                    ? "Para adjuntar fotos, primero configura tu Cloudinary en app.js"
                    : "To upload photos, please configure Cloudinary in app.js first.";
                showToast(msg, 'error');
            } else {
                showToast(dictionary[currentLang]['msgError'], 'error');
            }
        } finally {
            loadingIndicator.classList.add('hidden');
            submitBtn.disabled = false;
        }
    });

    // Initialize the app
    loadDictionary();
    checkOTAUpdates(); // Check for Android updates

    // --- CHANGELOG LOGIC ---
    async function checkShowChangelog(currentVersion) {
        if (!currentVersion) return;
        
        const lastSeenVersion = localStorage.getItem('lastSeenVersion');
        if (lastSeenVersion === currentVersion) return; // Already seen

        try {
            const res = await fetch('Datos_Locales-JSON/changelog.json');
            if (!res.ok) return;
            const changelogData = await res.json();
            
            if (changelogData[currentVersion]) {
                // Get language (fallback to 'es')
                const lang = (typeof document.getElementById('langToggle') !== 'undefined' 
                            && document.getElementById('langToggle').textContent.toLowerCase().includes('en')) ? 'en' : 'es';
                            
                const notes = changelogData[currentVersion][lang] || changelogData[currentVersion]['es'];
                
                if (notes && notes.length > 0) {
                    const modal = document.getElementById('changelogModal');
                    const list = document.getElementById('changelogList');
                    const title = document.getElementById('changelogTitle');
                    const verText = document.getElementById('changelogVersionNumber');
                    
                    if (modal && list && verText) {
                        verText.textContent = currentVersion;
                        title.textContent = lang === 'en' ? 'App Updated! 🚀' : '¡App Actualizada! 🚀';
                        
                        list.innerHTML = '';
                        notes.forEach(note => {
                            const li = document.createElement('li');
                            li.textContent = note;
                            li.style.marginBottom = "8px";
                            list.appendChild(li);
                        });
                        
                        modal.classList.remove('hidden');
                    }
                }
            }
        } catch (e) {
            console.error("Failed to load changelog:", e);
        } finally {
            // Save it so we don't show it again
            localStorage.setItem('lastSeenVersion', currentVersion);
        }
    }

    // Assuming checkOTAUpdates is defined elsewhere and calls checkShowChangelog
    // For example, if checkOTAUpdates fetches version.json and then calls checkShowChangelog:
    // function checkOTAUpdates() {
    //     fetch('version.json')
    //         .then(response => response.json())
    //         .then(data => {
    //             const currentVersion = data.version;
    //             // ... other OTA update logic ...
    //             checkShowChangelog(currentVersion); // Call changelog check here
    //         })
    //         .catch(error => console.error('Error fetching version.json:', error));
    // }

});
