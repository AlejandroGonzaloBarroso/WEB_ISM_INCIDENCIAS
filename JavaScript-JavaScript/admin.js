import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, collection, getDocs, orderBy, query } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

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

document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('incidentsTableBody');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const imageModal = document.getElementById('imageModal');
    const closeImageModal = document.getElementById('closeImageModal');
    const fullSizeImage = document.getElementById('fullSizeImage');

    async function loadIncidents() {
        try {
            // Fetch all documents from "incidencias".
            // Note: We avoid orderBy("timestamp", "desc") here to prevent immediate Firebase index errors on fresh setups. 
            // We will sort them in Javascript instead.
            const querySnapshot = await getDocs(collection(db, "incidencias"));

            loadingIndicator.classList.add('hidden');

            if (querySnapshot.empty) {
                tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center;">No incidents reported yet.</td></tr>`;
                return;
            }

            tableBody.innerHTML = ''; // Clear table

            // Extract data and sort locally by timestamp descending
            const incidents = [];
            querySnapshot.forEach(doc => incidents.push(doc.data()));
            incidents.sort((a, b) => {
                const timeA = a.timestamp ? a.timestamp.toMillis() : 0;
                const timeB = b.timestamp ? b.timestamp.toMillis() : 0;
                return timeB - timeA;
            });

            incidents.forEach((data) => {
                // Format Date
                let dateStr = "Unknown Date";
                if (data.timestamp) {
                    const date = data.timestamp.toDate();
                    dateStr = date.toLocaleString();
                }

                // Format Category Tag
                let tagClass = "tag-primary";
                if (data.category === "Middle") tagClass = "tag-middle";
                if (data.category === "Secondary") tagClass = "tag-secondary";

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${dateStr}</td>
                    <td><span class="tag ${tagClass}">${data.category || 'Unknown'}</span></td>
                    <td><strong>${data.classroom || 'N/A'}</strong></td>
                    <td>${data.description}</td>
                    <td>
                        ${data.imageUrl
                        ? `<img src="${data.imageUrl}" alt="Photo" class="photo-thumb" data-full="${data.imageUrl}">`
                        : `<span style="color: var(--text-secondary); font-style: italic;">No Photo</span>`}
                    </td>
                `;
                tableBody.appendChild(tr);
            });

            // Add click listeners to thumbnails to open modal
            document.querySelectorAll('.photo-thumb').forEach(img => {
                img.addEventListener('click', (e) => {
                    fullSizeImage.src = e.target.getAttribute('data-full');
                    imageModal.classList.remove('hidden');
                });
            });

        } catch (error) {
            console.error("Error fetching incidents:", error);
            loadingIndicator.innerHTML = '<p style="color: red;">Error loading incidents. Check console.</p>';
        }
    }

    // Modal close logic
    closeImageModal.addEventListener('click', () => {
        imageModal.classList.add('hidden');
    });

    // Close modal when clicking outside the image
    imageModal.addEventListener('click', (e) => {
        if (e.target === imageModal) {
            imageModal.classList.add('hidden');
        }
    });

    // Initialize Theme support based on main app preference
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
        document.documentElement.classList.add('dark-mode');
    }

    // Start loading data
    loadIncidents();
});
