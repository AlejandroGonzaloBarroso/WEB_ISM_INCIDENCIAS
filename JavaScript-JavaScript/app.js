// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

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

    // Interactive Background Spotlight (Modern Effect)
    document.addEventListener('mousemove', (e) => {
        document.body.style.setProperty('--mouse-x', `${e.clientX}px`);
        document.body.style.setProperty('--mouse-y', `${e.clientY}px`);
    });

    // Magnetic pull effect on click
    document.addEventListener('mousedown', () => {
        document.body.classList.add('is-clicking');
    });

    document.addEventListener('mouseup', () => {
        document.body.classList.remove('is-clicking');
    });

    // Fetch the JSON dictionary
    async function loadDictionary() {
        try {
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

    // --- Modal & Reporting Logic ---
    const modal = document.getElementById('incidentModal');
    const closeBtn = document.querySelector('.close-btn');
    const form = document.getElementById('incidentForm');
    const reportButtons = document.querySelectorAll('.btn-primary');
    const categoryInput = document.getElementById('incidentCategory');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const submitBtn = document.getElementById('submitBtn');

    // Open modal when any "Report Incident" button is clicked
    reportButtons.forEach(btn => {
        // Skip the submit button inside the modal
        if (btn.id === 'submitBtn') return;

        btn.addEventListener('click', (e) => {
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
                description: description,
                imageUrl: imageUrl, // Will be null if no image was uploaded
                timestamp: serverTimestamp()
            });

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
});
