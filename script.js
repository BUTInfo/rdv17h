document.getElementById('year').textContent = new Date().getFullYear();

// Ajouter target="_blank" à tous les liens externes ou vers des fichiers .pdf
document.querySelectorAll('a').forEach(link => {
    if ((link.href && !link.href.startsWith(window.location.origin)) || (link.href && link.href.endsWith('.pdf'))) {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer'); // Sécurité supplémentaire
    }
});

const btns = document.querySelectorAll('a[href^="#"]');
btns.forEach(btn => {
    btn.addEventListener("click", function (event) {
        event.preventDefault();
        const targetId = this.getAttribute('href'); // Récupérer l'ID de la cible à partir de l'attribut href
        const targetElement = document.querySelector(targetId); // Sélectionner l'élément cible

        // Défilement doux vers l'élément cible
        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});
