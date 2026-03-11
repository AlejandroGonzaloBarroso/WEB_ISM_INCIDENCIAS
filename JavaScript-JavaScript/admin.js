import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import {
    getFirestore, collection, getDocs, doc, getDoc, updateDoc, deleteDoc,
    query, orderBy, serverTimestamp, setDoc
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import {
    getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

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
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Global Admin State
let currentAdmin = null;

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const loginSection = document.getElementById('loginSection');
    const adminDashboard = document.getElementById('adminDashboard');
    const btnGoogleLogin = document.getElementById('btnGoogleLogin');
    const loginError = document.getElementById('loginError');
    const btnLogout = document.getElementById('btnLogout');
    const adminWelcomeMsg = document.getElementById('adminWelcomeMsg');

    const tableBody = document.getElementById('incidentsTableBody');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const imageModal = document.getElementById('imageModal');
    const closeImageModal = document.getElementById('closeImageModal');
    const fullSizeImage = document.getElementById('fullSizeImage');

    // ----------------------------------------------------------------------
    // AUTHENTICATION LOGIC
    // ----------------------------------------------------------------------

    // Listen for auth state changes (e.g., user refreshes page while logged in)
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            await verifyAdminAccess(user);
        } else {
            showLoginScreen();
        }
    });

    // Handle Google Login Click
    btnGoogleLogin.addEventListener('click', async () => {
        loginError.classList.add('hidden');
        btnGoogleLogin.disabled = true;
        btnGoogleLogin.innerHTML = 'Signing in...';

        try {
            const result = await signInWithPopup(auth, provider);
            await verifyAdminAccess(result.user);
        } catch (error) {
            console.error("Login Error:", error);
            showLoginError(error.message);
        }
    });

    // Handle Logout Click
    btnLogout.addEventListener('click', async () => {
        try {
            await signOut(auth);
            currentAdmin = null;
            showLoginScreen();
        } catch (error) {
            console.error("Logout Error:", error);
        }
    });

    // Verify if the logged-in user is in the 'administradores' collection
    async function verifyAdminAccess(user) {
        try {
            // Check 'administradores' collection (using email as document ID for easy lookup, or querying)
            // Let's query where email == user.email
            const adminsRef = collection(db, "administradores");
            // Workaround: Since we might not have indexes, we fetch all and check locally if it's a small collection,
            // OR ideally we set the Document ID in Firebase to be the email address directly.
            // Let's assume Document ID = email for maximum efficiency without indexes.

            const docRef = doc(db, "administradores", user.email);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                // User is an admin!
                currentAdmin = {
                    email: user.email,
                    name: user.displayName || user.email.split('@')[0],
                    permisos: docSnap.data().permisos || [] // Array of departments e.g., ["Primary", "Middle"] 
                };

                // If superadmin, show the manage button
                if (currentAdmin.permisos.includes("ALL")) {
                    document.getElementById('btnAdminManage').classList.remove('hidden');
                }

                showDashboard();
            } else {
                // Not an admin, sign them back out
                await signOut(auth);
                showLoginError(`Access Denied: ${user.email} is not an authorized administrator.`);
            }
        } catch (error) {
            console.error("Verification Error:", error);
            await signOut(auth);
            showLoginError("Error verifying permissions. Make sure the 'administradores' collection exists.");
        }
    }

    function showLoginScreen() {
        loginSection.classList.remove('hidden');
        adminDashboard.classList.add('hidden');
        btnGoogleLogin.disabled = false;
        btnGoogleLogin.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l2.85-2.22.83-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
        `;
    }

    function showLoginError(msg) {
        loginError.textContent = msg;
        loginError.classList.remove('hidden');
        btnGoogleLogin.disabled = false;
        btnGoogleLogin.innerHTML = 'Try Again';
    }

    function showDashboard() {
        loginSection.classList.add('hidden');
        adminDashboard.classList.remove('hidden');
        adminWelcomeMsg.textContent = `Welcome, ${currentAdmin.name} (${currentAdmin.permisos.join(', ')})`;
        loadIncidents();
    }

    // ----------------------------------------------------------------------
    // DASHBOARD & DATA LOGIC
    // ----------------------------------------------------------------------

    async function loadIncidents() {
        try {
            loadingIndicator.classList.remove('hidden');
            tableBody.innerHTML = '';

            const querySnapshot = await getDocs(collection(db, "incidencias"));
            loadingIndicator.classList.add('hidden');

            if (querySnapshot.empty) {
                tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center;">No incidents reported yet.</td></tr>`;
                return;
            }

            // Client-side filtering and sorting
            const incidents = [];
            querySnapshot.forEach(doc => {
                const data = doc.data();
                data.id = doc.id; // Store document ID for edits/deletes

                // FILTER: Only include if admin has permission for this category, OR if admin is "Superadmin"
                if (currentAdmin.permisos.includes("ALL") || currentAdmin.permisos.includes(data.category)) {
                    incidents.push(data);
                }
            });

            if (incidents.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center;">No incidents found for your departments.</td></tr>`;
                return;
            }

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
                if (data.category === "High" || data.category === "Secondary") tagClass = "tag-secondary";

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${dateStr}</td>
                    <td><span class="tag ${tagClass}">${data.category || 'Unknown'}</span></td>
                    <td><strong>${data.classroom || 'N/A'}</strong><br><small>Urgency: ${data.urgency || 'Medium'}</small></td>
                    <td>${data.description}</td>
                    <td>
                        ${data.imageUrl
                        ? `<img src="${data.imageUrl}" alt="Photo" class="photo-thumb" data-full="${data.imageUrl}">`
                        : `<span style="color: var(--text-secondary); font-style: italic;">No Photo</span>`}
                    </td>
                    <td>
                        <select class="status-select" data-id="${data.id}" style="padding: 5px; border-radius: 4px;">
                            <option value="Sin revisar" ${data.status === 'Sin revisar' ? 'selected' : ''}>Sin revisar</option>
                            <option value="En proceso" ${data.status === 'En proceso' ? 'selected' : ''}>En proceso</option>
                            <option value="Resuelta" ${data.status === 'Resuelta' ? 'selected' : ''}>Resuelta</option>
                        </select>
                    </td>
                    <td style="display: flex; gap: 5px;">
                        <button class="btn-chat" data-id="${data.id}" title="Comments" style="padding: 5px 10px; background: var(--primary-color); border:none;  border-radius: 4px; color: white; cursor: pointer;">💬</button>
                        <button class="btn-delete" data-id="${data.id}" title="Delete" style="padding: 5px 10px; background: #ff4d4d; border:none; border-radius: 4px; color: white; cursor: pointer;">🗑️</button>
                    </td>
                `;
                tableBody.appendChild(tr);
            });

            attachDashboardEventListeners();

        } catch (error) {
            console.error("Error fetching incidents:", error);
            loadingIndicator.innerHTML = '<p style="color: red;">Error loading incidents. Check console.</p>';
        }
    }

    function attachDashboardEventListeners() {
        // --- 1. Photos ---
        document.querySelectorAll('.photo-thumb').forEach(img => {
            img.addEventListener('click', (e) => {
                fullSizeImage.src = e.target.getAttribute('data-full');
                imageModal.classList.remove('hidden');
            });
        });

        // --- 2. Edit Status ---
        document.querySelectorAll('.status-select').forEach(select => {
            select.addEventListener('change', async (e) => {
                const docId = e.target.getAttribute('data-id');
                const newStatus = e.target.value;
                try {
                    e.target.disabled = true;
                    await updateDoc(doc(db, "incidencias", docId), {
                        status: newStatus
                    });
                    showToast("Status updated successfully", "success");
                    e.target.disabled = false;

                    // Add automatic system comment about status change
                    await addSystemComment(docId, `Status changed to: ${newStatus}`);
                } catch (error) {
                    console.error("Error updating status:", error);
                    showToast("Failed to update status", "error");
                    e.target.disabled = false;
                }
            });
        });

        // --- 3. Delete Incident ---
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const docId = e.target.closest('.btn-delete').getAttribute('data-id');
                if (confirm("Are you sure you want to permanently delete this incident?")) {
                    try {
                        await deleteDoc(doc(db, "incidencias", docId));
                        showToast("Incident deleted", "success");
                        loadIncidents(); // Reload table
                    } catch (error) {
                        console.error("Error deleting:", error);
                        showToast("Failed to delete incident", "error");
                    }
                }
            });
        });

        // --- 4. Open Comments Modal ---
        document.querySelectorAll('.btn-chat').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const docId = e.target.closest('.btn-chat').getAttribute('data-id');
                openCommentsModal(docId);
            });
        });
    }

    // ----------------------------------------------------------------------
    // COMMENTS SYSTEM
    // ----------------------------------------------------------------------
    const commentsModal = document.getElementById('commentsModal');
    const closeCommentsModal = document.getElementById('closeCommentsModal');
    const commentsContainer = document.getElementById('commentsContainer');
    const commentForm = document.getElementById('commentForm');
    const newCommentText = document.getElementById('newCommentText');
    const commentsIncidentDetails = document.getElementById('commentsIncidentDetails');
    let currentIncidentIdForComments = null;

    async function openCommentsModal(incidentId) {
        currentIncidentIdForComments = incidentId;
        commentsContainer.innerHTML = '<p style="text-align:center; color:gray;">Loading comments...</p>';
        commentsIncidentDetails.textContent = `Incident ID: ${incidentId}`;
        commentsModal.classList.remove('hidden');

        try {
            // Fetch comments ordered by timestamp
            // Note: Since we don't have indexes setup, we fetch all and sort in JS
            const commentsRef = collection(db, "incidencias", incidentId, "comentarios");
            const snapshot = await getDocs(commentsRef);

            commentsContainer.innerHTML = ''; // Clear loading

            if (snapshot.empty) {
                commentsContainer.innerHTML = '<p style="text-align:center; color:gray; font-style:italic;">No comments yet. Be the first to add one!</p>';
                return;
            }

            const comments = [];
            snapshot.forEach(doc => comments.push(doc.data()));

            // Sort oldest to newest
            comments.sort((a, b) => {
                const timeA = a.timestamp ? a.timestamp.toMillis() : 0;
                const timeB = b.timestamp ? b.timestamp.toMillis() : 0;
                return timeA - timeB;
            });

            comments.forEach(comment => {
                renderComment(comment);
            });

            // Scroll to bottom
            commentsContainer.scrollTop = commentsContainer.scrollHeight;

        } catch (error) {
            console.error("Error loading comments:", error);
            commentsContainer.innerHTML = '<p style="color:red; text-align:center;">Failed to load comments.</p>';
        }
    }

    function renderComment(data) {
        const div = document.createElement('div');
        div.style.padding = '10px';
        div.style.borderRadius = '8px';
        div.style.marginBottom = '5px';

        let timeStr = "Just now";
        if (data.timestamp) {
            timeStr = data.timestamp.toDate().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        }

        if (data.isSystem) {
            // System Notification Style
            div.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            div.style.borderLeft = '3px solid #888';
            div.innerHTML = `<small style="color: var(--text-secondary);">[System] <em>${data.text}</em> - ${timeStr}</small>`;
        } else {
            // Normal Chat Bubble
            const isMe = data.author === currentAdmin.name;
            div.style.backgroundColor = isMe ? 'var(--primary-color)' : 'var(--card-bg)';
            div.style.color = isMe ? '#fff' : 'var(--text-primary)';
            div.style.alignSelf = isMe ? 'flex-end' : 'flex-start';
            div.style.maxWidth = '80%';
            div.style.border = isMe ? 'none' : '1px solid var(--border-color)';

            div.innerHTML = `
                <div style="font-size: 0.8rem; opacity: 0.8; margin-bottom: 3px;">
                    <strong>${data.author}</strong> <span style="font-size: 0.7rem; float: right; margin-left: 10px;">${timeStr}</span>
                </div>
                <div>${data.text}</div>
            `;
        }

        // Remove empty state message if it exists
        if (commentsContainer.innerHTML.includes("No comments yet")) {
            commentsContainer.innerHTML = '';
        }

        commentsContainer.appendChild(div);
    }

    // Submit new comment
    commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = newCommentText.value.trim();
        if (!text || !currentIncidentIdForComments) return;

        const submitBtn = commentForm.querySelector('button');
        submitBtn.disabled = true;

        try {
            const commentsRef = collection(db, "incidencias", currentIncidentIdForComments, "comentarios");

            const newComment = {
                text: text,
                author: currentAdmin.name,
                timestamp: serverTimestamp(),
                isSystem: false
            };

            // We use standard setDoc to create a new doc in the subcollection
            await setDoc(doc(commentsRef), newComment);

            // Optimistically render it locally to avoid needing a full reload snapshot
            newComment.timestamp = { toDate: () => new Date() }; // Mock timestamp for local render
            renderComment(newComment);

            // Scroll to bottom
            commentsContainer.scrollTop = commentsContainer.scrollHeight;
            newCommentText.value = '';
        } catch (error) {
            console.error("Failed to post comment:", error);
            showToast("Failed to post comment", "error");
        } finally {
            submitBtn.disabled = false;
        }
    });

    closeCommentsModal.addEventListener('click', () => { commentsModal.classList.add('hidden'); });
    commentsModal.addEventListener('click', (e) => {
        if (e.target === commentsModal) commentsModal.classList.add('hidden');
    });

    // Modal close logic
    closeImageModal.addEventListener('click', () => { imageModal.classList.add('hidden'); });
    imageModal.addEventListener('click', (e) => {
        if (e.target === imageModal) imageModal.classList.add('hidden');
    });

    // Toast System
    function showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.style.backgroundColor = type === 'success' ? '#10b981' : '#ef4444';
        toast.classList.remove('hidden');
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.classList.add('hidden'), 300);
        }, 3000);
    }

    // System Comment Helper
    async function addSystemComment(incidentId, text) {
        try {
            const commentsRef = collection(db, "incidencias", incidentId, "comentarios");
            await setDoc(doc(commentsRef), {
                text: text,
                author: "System (" + currentAdmin.name + ")",
                timestamp: serverTimestamp(),
                isSystem: true
            });
        } catch (err) {
            console.error("Failed to add system log:", err);
        }
    }

    // ----------------------------------------------------------------------
    // SUPERADMIN MANAGEMENT SYSTEM
    // ----------------------------------------------------------------------
    const btnAdminManage = document.getElementById('btnAdminManage');
    const superadminModal = document.getElementById('superadminModal');
    const closeSuperadminModal = document.getElementById('closeSuperadminModal');
    const adminsTableBody = document.getElementById('adminsTableBody');
    const addAdminForm = document.getElementById('addAdminForm');

    if (btnAdminManage && superadminModal) {
        btnAdminManage.addEventListener('click', () => {
            superadminModal.classList.remove('hidden');
            loadAdmins();
        });

        closeSuperadminModal.addEventListener('click', () => { superadminModal.classList.add('hidden'); });
        superadminModal.addEventListener('click', (e) => {
            if (e.target === superadminModal) superadminModal.classList.add('hidden');
        });

        // Load current admins
        async function loadAdmins() {
            adminsTableBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Loading...</td></tr>';
            try {
                const snapshot = await getDocs(collection(db, "administradores"));
                adminsTableBody.innerHTML = '';

                snapshot.forEach(docSnap => {
                    const data = docSnap.data();
                    const email = docSnap.id; // Document ID is the email
                    const perms = data.permisos || [];

                    // Don't let the current user delete themselves easily
                    const isMe = email === currentAdmin.email;
                    const deleteBtn = isMe ?
                        `<span style="color:gray; font-size: 0.8rem;">(You)</span>` :
                        `<button class="btn-revoke-admin" data-email="${email}" style="padding: 5px 10px; background: #ff4d4d; border:none; border-radius: 4px; color: white; cursor: pointer; font-size: 0.8rem;">Revoke</button>`;

                    const permTags = perms.map(p => {
                        let color = "gray";
                        if (p === "ALL") color = "#ff4d4d";
                        if (p === "Middle") color = "#f59e0b";
                        if (p === "Primary") color = "var(--primary-color)";
                        if (p === "High" || p === "Secondary") color = "#10b981";
                        return `<span style="background: ${color}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; display: inline-block; margin-right: 4px;">${p}</span>`;
                    }).join('');

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td style="font-size: 0.9rem;"><strong>${email}</strong></td>
                        <td>${permTags}</td>
                        <td style="text-align: right;">${deleteBtn}</td>
                    `;
                    adminsTableBody.appendChild(tr);
                });

                // Attach Revoke listener
                document.querySelectorAll('.btn-revoke-admin').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const emailToRemove = e.target.getAttribute('data-email');
                        if (confirm(`Revoke all access for ${emailToRemove}?`)) {
                            try {
                                await deleteDoc(doc(db, "administradores", emailToRemove));
                                showToast(`Access revoked for ${emailToRemove}`);
                                loadAdmins(); // Refresh
                            } catch (error) {
                                console.error("Error revoking admin:", error);
                                showToast("Failed to revoke access", "error");
                            }
                        }
                    });
                });

            } catch (error) {
                console.error("Failed to load admins:", error);
                adminsTableBody.innerHTML = '<tr><td colspan="3" style="color:red; text-align:center;">Error loading.</td></tr>';
            }
        }

        // Add a new Admin
        addAdminForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newEmail = document.getElementById('newAdminEmail').value.trim().toLowerCase();

            // Collect checked permissions
            const checkedBoxes = Array.from(document.querySelectorAll('input[name="adminPerm"]:checked'));
            let selectedPerms = checkedBoxes.map(cb => cb.value);

            // Validation
            if (!newEmail) return showToast("Please enter an email", "error");
            if (selectedPerms.length === 0) return showToast("Select at least one permission", "error");

            // If Superadmin is checked, it overrides everything else
            if (selectedPerms.includes("ALL")) {
                selectedPerms = ["ALL"];
            }

            const submitBtn = addAdminForm.querySelector('button');
            submitBtn.disabled = true;

            try {
                // Using setDoc directly replaces or creates the document where ID is the email
                await setDoc(doc(db, "administradores", newEmail), {
                    permisos: selectedPerms
                });

                showToast(`Access granted to ${newEmail}`);

                // Reset form
                document.getElementById('newAdminEmail').value = '';
                document.querySelectorAll('input[name="adminPerm"]').forEach(cb => cb.checked = false);

                // Refresh list
                loadAdmins();
            } catch (error) {
                console.error("Failed to add admin:", error);
                showToast("Failed to grant access", "error");
            } finally {
                submitBtn.disabled = false;
            }
        });

        // Small UX feature: if Superadmin is checked, uncheck others visually to clarify
        document.getElementById('superadminCheck').addEventListener('change', (e) => {
            if (e.target.checked) {
                document.querySelectorAll('input[name="adminPerm"]:not(#superadminCheck)').forEach(cb => cb.checked = false);
            }
        });
    }

    // Initialize Theme support
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
        document.documentElement.classList.add('dark-mode');
    }
});
