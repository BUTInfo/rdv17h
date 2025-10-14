// agenda.js

// --- CONFIG DE BASE ---
const joursCourtsFr = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const heures = [
  "8h00", "10h10", "13h30/14h00", "15h40/16h10"
];

// Initialisation : Lundi 13 octobre 2025 à 12h00 pour éviter le décalage UTC
let currentWeekStartDate = new Date('2025-10-13T12:00:00'); 
let weekDisplayedDates = []; // Contiendra les dates YYYY-MM-DD de la semaine affichée.

// --- SÉLECTION DES ÉLÉMENTS DU DOM ---
const tableBody = document.getElementById("table-body");
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modal-title");
const modalForm = document.getElementById("modal-form");

// Champs du formulaire
const modalTitleInput = document.getElementById("modal-title-input");
const modalDetail = document.getElementById("modal-detail");
const modalType = document.getElementById("modal-type");
const modalDate = document.getElementById("modal-date"); 
const modalHour = document.getElementById("modal-hour");

const closeModal = document.getElementById("close-modal");
const modalCancelButton = document.getElementById("modal-cancel-button");

// Boutons de navigation et d'action
const prevWeekBtn = document.getElementById("prev-week");
const nextWeekBtn = document.getElementById("next-week");
const btnAdd = document.getElementById("btn-add");
const btnEdit = document.getElementById("btn-edit");
const btnDelete = document.getElementById("btn-delete");

// Bouton de téléchargement (Export ZIP)
const btnDownloadFolder = document.getElementById("btn-download-folder");

const detailModal = document.getElementById("detail-modal");
const detailTitle = document.getElementById("detail-title");
const detailContent = document.getElementById("detail-content");
const closeDetail = document.getElementById("close-detail");

// Nouveaux boutons dans le modal de détail
const btnDetailEdit = document.getElementById("btn-detail-edit");
const btnDetailDelete = document.getElementById("btn-detail-delete");

let currentAction = "add";
let currentEvents = {}; // Cache pour les événements de la semaine affichée
let db; // Définie par initAgenda()


// =======================================================
// PARTIE 1 : INTERFACE FIREBASE ET UTILS
// =======================================================

/**
 * Génère une clé unique pour un événement.
 * Format : YYYY-MM-DD-Heure (Ex: 2025-10-15-8h00)
 */
function makeKey(date, hour) { 
    return `${date}-${hour}`; 
}

window.initAgenda = (firestoreDb) => {
    db = firestoreDb;
    document.addEventListener('DOMContentLoaded', initializeAgenda);
};

function hideModal(targetModal = modal) {
    targetModal.style.display = "none";
    // Nettoyage des clés pour éviter une mauvaise réutilisation
    delete modal.dataset.clickedKey; 
    delete detailModal.dataset.key; 
}

function initSelects() {
    const hourSelect = modalHour;

    // Remplissage des selects Heure 
    if (hourSelect && hourSelect.options.length === 0) {
        heures.forEach(h => {
            const opt = document.createElement("option");
            opt.value = h;
            opt.textContent = h;
            hourSelect.appendChild(opt);
        });
    }
}


// =======================================================
// PARTIE 2 : FONCTIONS DE RENDU ET NAVIGATION
// =======================================================

function renderCalendar() {
    
    // --- RENDU DES EN-TÊTES DE JOURS ET DE LA PLAGE DE DATES ---
    const joursCourts = joursCourtsFr;
    const startDate = new Date(currentWeekStartDate);
    const tableHeadRow = document.querySelector('#agenda table thead tr');
    
    // Vider les anciens en-têtes (sauf la colonne Heure)
    while (tableHeadRow.children.length > 1) {
        tableHeadRow.removeChild(tableHeadRow.lastChild);
    }
    
    let currentDay = new Date(startDate);
    weekDisplayedDates = []; // RESET

    // Boucle pour générer les 7 jours (Lundi à Dimanche)
    for (let i = 0; i < 7; i++) {
        // Correction UTC : Centrer l'heure à 12h00 locale
        currentDay.setHours(12, 0, 0, 0); 
        
        // Format YYYY-MM-DD pour le stockage interne
        const dateStrISO = currentDay.toISOString().slice(0, 10);
        weekDisplayedDates.push(dateStrISO); 

        // Format affiché dans le tableau
        const dateStr = currentDay.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
        const dayName = joursCourts[i];
        
        const th = document.createElement('th');
        th.innerHTML = `${dayName}<br>${dateStr}`;
        tableHeadRow.appendChild(th);
        
        // Prépare le jour suivant
        currentDay.setDate(currentDay.getDate() + 1);
    }
    
    // Mise à jour du titre de la section
    const endDate = new Date(currentWeekStartDate);
    endDate.setDate(endDate.getDate() + 6); // +6 jours pour arriver à Dimanche
    const titleRange = `${startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} au ${endDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    document.querySelector('#agenda h2').textContent = `Agenda - Semaine du ${titleRange}`;

    // --- CHARGEMENT DES DONNÉES ET MISE À JOUR DES CELLULES ---
    loadEvents(); 
}


function goToPrevWeek() {
    // Saut de -7 jours
    currentWeekStartDate.setDate(currentWeekStartDate.getDate() - 7);
    currentWeekStartDate.setHours(12, 0, 0, 0); 
    renderCalendar();
}

function goToNextWeek() {
    // Saut de +7 jours
    currentWeekStartDate.setDate(currentWeekStartDate.getDate() + 7);
    currentWeekStartDate.setHours(12, 0, 0, 0); 
    renderCalendar();
}


// --- RENDU : Insère les événements dans les cellules existantes ---
function updateTableCells(events = {}) {
    currentEvents = events;
    
    // 1. Nettoyer toutes les cellules de la semaine (7 colonnes)
    const allDataCells = tableBody.querySelectorAll('td:not(:first-child)');
    allDataCells.forEach(cell => {
        cell.innerHTML = '';
        cell.className = '';
        if (cell.clickHandler) {
            cell.removeEventListener('click', cell.clickHandler);
            cell.clickHandler = null;
        }
    });

    // 2. Insérer les nouveaux événements et attacher les listeners
    weekDisplayedDates.forEach((fullDate, dayIndex) => { // dayIndex va de 0 à 6
        heures.forEach(hour => {
            const key = makeKey(fullDate, hour); 
            // Sélection des cellules par index de jour et heure
            const cell = tableBody.querySelector(`td[data-day-index="${dayIndex}"][data-hour="${hour}"]`);

            if (cell) {
                const eventData = events[key];

                if (eventData) {
                    cell.textContent = eventData.title;
                    cell.className = eventData.type === "ds" ? "cell-ds" : "cell-devoir";
                    
                    const clickHandler = () => handleCellClick(key, eventData, cell);
                    cell.addEventListener("click", clickHandler);
                    cell.clickHandler = clickHandler; 
                } else {
                    const clickHandler = () => handleCellClick(key, null, cell);
                    cell.addEventListener("click", clickHandler);
                    cell.clickHandler = clickHandler; 
                }
            }
        });
    });
}


// =======================================================
// PARTIE 3 : LOGIQUE DE BASE DE DONNÉES
// =======================================================

async function loadEvents() {
    if (!db || typeof window.getDocs === 'undefined') { 
         updateTableCells({}); 
         return; 
    }

    try {
        const snapshot = await window.getDocs(window.collection(db, "agenda"));
        const events = {};
        
        // On stocke TOUS les événements
        snapshot.forEach(doc => {
            const data = doc.data();
            events[doc.id] = { 
                title: data.title,
                detail: data.detail,
                type: data.type
            };
        });
        updateTableCells(events); 
    } catch(error) {
        console.error("Erreur de chargement des événements Firebase:", error);
        updateTableCells({}); 
    }
}

async function saveEvent(e) {
    e.preventDefault();
    
    const dbInstance = db;
    if (!dbInstance) return alert("Erreur: Firebase non disponible.");

    const dateValue = modalDate.value;
    const hourValue = modalHour.value;
    
    if (!dateValue || !hourValue) return alert("Veuillez sélectionner la date et l'heure.");

    // Clé de destination (nouvelle date/heure entrée dans le formulaire)
    const newKey = makeKey(dateValue, hourValue); 
    
    // Clé de l'événement initialement cliqué (utile pour l'édition/suppression d'un événement existant)
    const initialClickedKey = modal.dataset.clickedKey; 
    
    const { setDoc, doc, deleteDoc, collection } = window;


    // --- GESTION DES MODES DE SÉLECTION/SUPPRESSION/MODIFICATION ---
    if (currentAction === 'select-edit' || currentAction === 'select-delete') {
        const selectedEvent = currentEvents[newKey];

        if (!selectedEvent) {
            alert("Aucun événement trouvé à cette heure/ce jour. Veuillez en choisir un autre.");
            return;
        }
        
        const nextAction = (currentAction === 'select-edit') ? 'edit' : 'delete';
        
        // On passe à l'étape suivante (edit ou delete)
        showModal(nextAction, {
            date: dateValue, 
            hour: hourValue, 
            title: selectedEvent.title,
            detail: selectedEvent.detail,
            type: selectedEvent.type
        });
        
        // TRÈS IMPORTANT : Mettre à jour la clé pour l'étape suivante
        modal.dataset.clickedKey = newKey; 
        return;
    }
    
    // --- GESTION DE L'AJOUT ET DE L'ÉDITION ---
    if (currentAction === "add" || currentAction === "edit") {
        if (!modalTitleInput.value.trim()) return alert("Le titre est requis.");
        
        const targetKey = newKey; 
        
        try {
            // Sauvegarde ou écrasement à la clé cible
            await setDoc(doc(collection(dbInstance, "agenda"), targetKey), {
                title: modalTitleInput.value,
                detail: modalDetail.value,
                type: modalType.value
            });
            alert(currentAction === "add" ? "Événement ajouté !" : "Événement modifié !");

            // Si c'était une MODIFICATION ET que la date/heure a changé (déplacement de l'événement)
            // ET que l'ancienne clé est différente de la nouvelle clé
            if (currentAction === 'edit' && initialClickedKey && initialClickedKey !== targetKey) {
                 // Supprimer l'ancienne entrée de la base de données
                 await deleteDoc(doc(collection(dbInstance, "agenda"), initialClickedKey));
            }

        } catch(error) {
             console.error("Erreur de sauvegarde:", error);
             alert("Erreur lors de la sauvegarde.");
        }
    } 
    // --- GESTION DE LA SUPPRESSION ---
    else if (currentAction === "delete") {
        // La clé de suppression est TOUJOURS la clé cliquée initialement (ou la clé déterminée par le formulaire de sélection)
        const keyToDelete = initialClickedKey || newKey; 

        if (!currentEvents[keyToDelete]) return alert("Impossible de supprimer : événement introuvable. Clé : " + keyToDelete);

        try {
            await deleteDoc(doc(collection(dbInstance, "agenda"), keyToDelete));
            alert("Événement supprimé !");
        } catch(error) {
             console.error("Erreur de suppression:", error);
             alert("Erreur lors de la suppression.");
        }
    }
    
    hideModal();
    renderCalendar(); 
}

/**
 * Compresse toutes les données de l'agenda (currentEvents) en un fichier ZIP
 * et déclenche le téléchargement.
 */
async function downloadFolder() {
    if (typeof JSZip === 'undefined') {
        alert("Erreur: La librairie JSZip n'est pas chargée. Ajoutez le script dans index.html.");
        return;
    }
    
    if (Object.keys(currentEvents).length === 0) {
        alert("Aucune donnée d'agenda à exporter.");
        return;
    }

    const zip = new JSZip();
    const agendaData = JSON.stringify(currentEvents, null, 2);
    zip.file("agenda_events.json", agendaData);
    
    try {
        const content = await zip.generateAsync({ type: "blob" });
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10);
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `Agenda_Export_${dateStr}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
    } catch(error) {
        console.error("Erreur lors de la création du ZIP:", error);
        alert("Erreur lors du téléchargement du dossier.");
    }
}


// =======================================================
// PARTIE 4 : LOGIQUE MODALS ET ÉCOUTEURS
// =======================================================

function handleCellClick(key, eventData, cellElement) {
    
    const dayIndex = cellElement.dataset.dayIndex;
    const hour = cellElement.dataset.hour;
    const fullDate = weekDisplayedDates[dayIndex]; // YYYY-MM-DD
    
    // Générer la clé basée sur la date complète de la cellule cliquée
    const newKey = makeKey(fullDate, hour);
    
    // TRÈS IMPORTANT : Stocker la clé de l'événement cliqué dans les deux modals
    modal.dataset.clickedKey = newKey; 
    detailModal.dataset.key = newKey; 

    if (eventData) {
        // Événement existant : ouvre le modal de détail
        detailTitle.textContent = eventData.title;
        detailContent.textContent = eventData.detail;
        detailModal.style.display = "flex";
        
    } else {
        // Cellule vide : ouvre le modal d'ajout
        showModal('add', { date: fullDate, hour: hour });
    }
}

function showModal(action, data = {}) {
    currentAction = action;

    let submitButton = document.getElementById('modal-submit-button') || modalForm.querySelector('button[type="submit"]');

    const isSelectionMode = (action === 'select-edit' || action === 'select-delete');
    const isFullForm = (action === 'add' || action === 'edit');
    const isDeleteMode = (action === 'delete');


    if (isSelectionMode) {
        modalTitle.textContent = (action === 'select-edit') ? "Choisir l'événement à modifier" : "Choisir l'événement à supprimer";
        if(submitButton) submitButton.textContent = 'Sélectionner';
    } else if (isDeleteMode) {
        modalTitle.textContent = "Confirmer la suppression";
        if(submitButton) submitButton.textContent = 'Supprimer';
    } else { 
        modalTitle.textContent = (action === 'add') ? "Ajouter un événement" : "Modifier l'événement";
        if(submitButton) submitButton.textContent = 'Valider';
    }
    
    // Afficher/Cacher les champs nécessaires
    [modalTitleInput, modalDetail, modalType].forEach(el => {
        if (el) el.parentNode.style.display = isFullForm ? 'block' : 'none';
    });
    
    // Afficher/Cacher la date et l'heure
    [modalDate, modalHour].forEach(el => {
        if (el && el.parentNode) el.parentNode.style.display = (isSelectionMode || action === 'add' || isDeleteMode) ? 'block' : 'none';
    });

    // Remplissage du formulaire
    modalForm.reset();
    if(modalTitleInput) modalTitleInput.value = data.title || "";
    if(modalDetail) modalDetail.value = data.detail || "";
    if(modalType) modalType.value = data.type || "devoir";
    
    // Utiliser le champ de date
    if(modalDate) modalDate.value = data.date || weekDisplayedDates[0]; 
    if(modalHour) modalHour.value = data.hour || heures[0];

    modal.style.display = "flex";
}


// --- ÉCOUTEURS D'ÉVÉNEMENTS (Démarrage) ---

if (btnAdd) btnAdd.addEventListener("click", () => showModal("add"));
if (btnEdit) btnEdit.addEventListener("click", () => showModal("select-edit"));
if (btnDelete) btnDelete.addEventListener("click", () => showModal("select-delete"));
if (btnDownloadFolder) btnDownloadFolder.addEventListener("click", downloadFolder); 

if (prevWeekBtn) prevWeekBtn.addEventListener("click", goToPrevWeek);
if (nextWeekBtn) nextWeekBtn.addEventListener("click", goToNextWeek);

if (modalForm) modalForm.addEventListener("submit", saveEvent);
if (closeModal) closeModal.addEventListener("click", () => hideModal(modal));
if (modalCancelButton) modalCancelButton.addEventListener("click", () => hideModal(modal));
if (closeDetail) closeDetail.addEventListener("click", () => hideModal(detailModal));

window.addEventListener("click", e => {
    if (e.target === modal) hideModal(modal);
    if (e.target === detailModal) hideModal(detailModal);
});


// Écouteurs pour les boutons Modifier/Supprimer depuis le modal de DÉTAIL
if (btnDetailEdit) {
    btnDetailEdit.addEventListener("click", () => {
        // Clé de l'événement à modifier, récupérée du modal de détail
        const key = detailModal.dataset.key; 
        const eventData = currentEvents[key]; 
        hideModal(detailModal); 
        
        if (eventData) {
            const keyParts = key.split('-');
            
            // Stocker la clé de l'événement à modifier pour la fonction saveEvent
            modal.dataset.clickedKey = key; 

            showModal("edit", {
                date: keyParts.slice(0, 3).join('-'), // YYYY-MM-DD
                hour: keyParts[3], // Heure
                title: eventData.title,
                detail: eventData.detail,
                type: eventData.type
            });
        }
    });
}

if (btnDetailDelete) {
    btnDetailDelete.addEventListener("click", () => {
        // Clé de l'événement à supprimer, récupérée du modal de détail
        const key = detailModal.dataset.key;
        const eventData = currentEvents[key];
        hideModal(detailModal);
        
        if (eventData) {
            const keyParts = key.split('-');
            
            // Stocker la clé de l'événement à supprimer pour la fonction saveEvent
            modal.dataset.clickedKey = key;

            showModal("delete", {
                date: keyParts.slice(0, 3).join('-'), // YYYY-MM-DD
                hour: keyParts[3], // Heure
                title: eventData.title,
                detail: eventData.detail,
                type: eventData.type
            });
        }
    });
}

// --- Démarrage de l'application ---
function initializeAgenda() {
    initSelects();
    renderCalendar(); 
    
    if (db) {
        console.log("Firebase est initialisé. Prêt à charger les données.");
    }
}
